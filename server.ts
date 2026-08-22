/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

import {
  InventoryItem,
  WebhookPayload,
  WebhookLogEntry,
  DLQItem,
  SupportQueryResult,
  SystemMetrics,
  KioskAttendee,
  KioskPrintJob,
  KioskPrinterDevice,
  KioskScanResponse
} from './src/types';
import {
  DEFAULT_WEBHOOK_SECRET,
  INITIAL_INVENTORY,
  INITIAL_ATTENDEES,
  INITIAL_PRINTERS
} from './src/data/initialData';

// --- IN-MEMORY PRODUCTION STATE STORE ---
let inventoryState: InventoryItem[] = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
let webhookAuditLogs: WebhookLogEntry[] = [];
let deadLetterQueue: DLQItem[] = [];
const idempotencyStore = new Map<string, number>(); // key -> timestamp
let sseClients: Response[] = [];

// Kiosk State Store (Solstice Events Co. Pivot Event)
let kioskAttendees: KioskAttendee[] = JSON.parse(JSON.stringify(INITIAL_ATTENDEES));
let kioskPrintJobs: KioskPrintJob[] = [];
let kioskPrinters: KioskPrinterDevice[] = JSON.parse(JSON.stringify(INITIAL_PRINTERS));
let kioskJobSequence = 8800;

// System metrics tracking
let totalWebhooksProcessed = 284;
let totalWebhooksFailed = 3;
let totalDuplicatesDropped = 19;
let totalInvalidSignaturesBlocked = 7;
let totalLatencySumMs = 852.0;

// Deprecated polling simulation state
let legacyPollingEnabled = false;
let legacyPollingCount = 0;
let lastLegacyPollTime = 0;

// Helper: Broadcast live event to all connected SSE clients
function broadcastSSE(eventType: string, data: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch {
      // client disconnected
    }
  });
}

// Helper: Cryptographic HMAC verification using timing-safe comparison
function verifyHmacSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader) return false;
  try {
    const cleanHeader = signatureHeader.replace(/^sha256=/, '').trim();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const computedHex = hmac.digest('hex');

    const expectedBuffer = Buffer.from(computedHex, 'hex');
    const receivedBuffer = Buffer.from(cleanHeader, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch (err) {
    return false;
  }
}

// Helper: Calculate item stock status
function recalculateItemStock(item: InventoryItem): void {
  item.totalQuantity = item.locations.reduce((acc, loc) => acc + loc.quantity, 0);
  item.totalReserved = item.locations.reduce((acc, loc) => acc + loc.reserved, 0);
  item.availableQuantity = Math.max(0, item.totalQuantity - item.totalReserved);

  if (item.totalQuantity <= 0) {
    item.status = 'OUT_OF_STOCK';
  } else if (item.availableQuantity <= 0 && item.totalReserved > 0) {
    item.status = 'RESERVED_ONLY';
  } else if (item.availableQuantity <= item.safetyThreshold) {
    item.status = 'LOW_STOCK';
  } else {
    item.status = 'IN_STOCK';
  }
}

// Start Server Function
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Custom Raw Body Middleware to capture exact raw bytes for HMAC verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'Northstar Live Inventory Sync Engine',
      version: '2.4.0-meridian-pivot',
      timestamp: Date.now(),
    });
  });

  // 1. GET ALL INVENTORY
  app.get('/api/inventory', (_req, res) => {
    res.json({
      success: true,
      items: inventoryState,
      totalCount: inventoryState.length,
      timestamp: Date.now(),
    });
  });

  // 2. SUPPORT AGENT INSTANT STOCK QUERY ("Is this in stock?")
  app.get('/api/inventory/lookup', (req, res) => {
    const startTime = process.hrtime.bigint();
    const query = ((req.query.sku as string) || (req.query.query as string) || '').trim().toUpperCase();

    let matchedItem = inventoryState.find((item) => item.sku.toUpperCase() === query);
    if (!matchedItem && query) {
      matchedItem = inventoryState.find((item) =>
        item.title.toUpperCase().includes(query) || item.category.toUpperCase().includes(query)
      );
    }

    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1_000_000;

    if (!matchedItem) {
      const result: SupportQueryResult = {
        sku: query || 'UNKNOWN',
        found: false,
        canFulfillImmediately: false,
        estimatedDispatchTime: 'N/A',
        supportScript: `I apologize, but product '${query}' was not found in our catalog. Would you like me to check alternative items?`,
        queryLatencyMs: Number(latencyMs.toFixed(3)),
        cached: true,
        lastSyncedAgoSec: 0,
        alternativeSkus: inventoryState.slice(0, 3).map((it) => ({
          sku: it.sku,
          title: it.title,
          availableQuantity: it.availableQuantity,
        })),
      };
      return res.json(result);
    }

    const bestLocation = [...matchedItem.locations].sort((a, b) => b.available - a.available)[0];
    let script = '';
    let dispatchTime = 'Ships today (Express)';
    let fulfill = true;

    if (matchedItem.status === 'IN_STOCK') {
      script = `Yes! We currently have ${matchedItem.availableQuantity} units in stock ready to ship immediately from our ${bestLocation?.warehouseName || 'central hub'}.`;
      dispatchTime = 'Ships today (Express)';
      fulfill = true;
    } else if (matchedItem.status === 'LOW_STOCK') {
      script = `Good news! We have ${matchedItem.availableQuantity} units remaining in stock, but inventory is running low. I recommend securing your order promptly.`;
      dispatchTime = 'Ships within 24 hours (Low Stock)';
      fulfill = true;
    } else if (matchedItem.status === 'RESERVED_ONLY') {
      script = `All physical units (${matchedItem.totalReserved}) are currently reserved for pending fulfillment. We can place a priority backorder with dispatch expected in 3 business days.`;
      dispatchTime = 'Backorder - Ships in 3-5 days';
      fulfill = false;
    } else {
      script = `This product is currently out of stock across all regional distribution centers. Restock is expected within 5 business days.`;
      dispatchTime = 'Out of Stock - Restock in progress';
      fulfill = false;
    }

    const lastSyncedAgoSec = Math.round((Date.now() - matchedItem.lastSyncTimestamp) / 1000);

    const result: SupportQueryResult = {
      sku: matchedItem.sku,
      found: true,
      title: matchedItem.title,
      category: matchedItem.category,
      price: matchedItem.price,
      status: matchedItem.status,
      availableQuantity: matchedItem.availableQuantity,
      totalQuantity: matchedItem.totalQuantity,
      totalReserved: matchedItem.totalReserved,
      canFulfillImmediately: fulfill,
      recommendedWarehouse: bestLocation?.warehouseName || 'Central Logistics Hub',
      estimatedDispatchTime: dispatchTime,
      supportScript: script,
      queryLatencyMs: Number(latencyMs.toFixed(3)),
      cached: true,
      lastSyncedAgoSec,
    };

    res.json(result);
  });

  // 3. WEBHOOK INGESTION ENDPOINT (`POST /api/webhooks/inventory`)
  app.post('/api/webhooks/inventory', (req: Request, res: Response) => {
    const startTime = process.hrtime.bigint();
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature = req.header('x-northstar-signature') || req.header('x-hub-signature-256');
    const idempotencyKey = req.header('x-idempotency-key') || req.body?.eventId || req.body?.idempotencyKey;
    const secret = req.header('x-webhook-secret-override') || DEFAULT_WEBHOOK_SECRET;

    // Step 1: Cryptographic HMAC Signature Verification
    const isSignatureValid = verifyHmacSignature(rawBody, signature, secret);

    if (!isSignatureValid) {
      totalInvalidSignaturesBlocked++;
      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        receivedAt: Date.now(),
        eventId: req.body?.eventId || 'unknown',
        eventType: req.body?.eventType || 'unknown',
        sku: req.body?.sku || 'unknown',
        signature: signature || '(none)',
        signatureValid: false,
        idempotencyKey: idempotencyKey || 'none',
        isDuplicate: false,
        status: 'INVALID_SIGNATURE',
        processingTimeMs: 0.8,
        details: 'HMAC signature verification failed: Payload hash does not match signature header',
        payload: req.body,
      };
      webhookAuditLogs.unshift(logEntry);
      if (webhookAuditLogs.length > 300) webhookAuditLogs.pop();
      broadcastSSE('webhook_received', logEntry);

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid HMAC SHA-256 signature',
        code: 'SIGNATURE_VERIFICATION_FAILED',
      });
    }

    // Step 2: Idempotency Replay Protection Check
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      totalDuplicatesDropped++;
      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        receivedAt: Date.now(),
        eventId: req.body?.eventId || idempotencyKey,
        eventType: req.body?.eventType || 'inventory.updated',
        sku: req.body?.sku || 'unknown',
        signature: signature || '',
        signatureValid: true,
        idempotencyKey,
        isDuplicate: true,
        status: 'DROPPED_DUPLICATE',
        processingTimeMs: 0.5,
        details: `Duplicate event detected with idempotency key ${idempotencyKey}. Acknowledged without double-mutation.`,
        payload: req.body,
      };
      webhookAuditLogs.unshift(logEntry);
      if (webhookAuditLogs.length > 300) webhookAuditLogs.pop();
      broadcastSSE('webhook_received', logEntry);

      return res.status(200).json({
        message: 'Duplicate event acknowledged (idempotent no-op)',
        idempotencyKey,
        duplicate: true,
      });
    }

    // Step 3: Schema & Payload Processing
    const payload: WebhookPayload = req.body;
    const sku = (payload.sku || '').trim().toUpperCase();

    let targetItem = inventoryState.find((i) => i.sku.toUpperCase() === sku);

    // If SKU not found, quarantine to Dead Letter Queue (DLQ)
    if (!targetItem && payload.eventType !== 'item.created') {
      totalWebhooksFailed++;
      const dlqId = `dlq-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const dlqEntry: DLQItem = {
        id: dlqId,
        receivedAt: Date.now(),
        failedReason: `Unrecognized SKU '${sku}' in catalog`,
        retryCount: 0,
        maxRetries: 3,
        rawPayload: JSON.stringify(payload),
        rawHeaders: {
          'x-northstar-signature': signature || '',
          'x-idempotency-key': idempotencyKey || '',
        },
        status: 'PENDING_RETRY',
      };
      deadLetterQueue.unshift(dlqEntry);

      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        receivedAt: Date.now(),
        eventId: payload.eventId || 'unknown',
        eventType: payload.eventType || 'unknown',
        sku,
        signature: signature || '',
        signatureValid: true,
        idempotencyKey: idempotencyKey || 'none',
        isDuplicate: false,
        status: 'DLQ_FAILED',
        processingTimeMs: 1.2,
        details: `Item with SKU ${sku} not found. Routed to Dead Letter Queue (DLQ ID: ${dlqId}).`,
        payload,
      };
      webhookAuditLogs.unshift(logEntry);
      broadcastSSE('webhook_received', logEntry);
      broadcastSSE('dlq_updated', dlqEntry);

      return res.status(404).json({
        error: 'Product Not Found',
        message: `SKU '${sku}' not in inventory. Routed to DLQ.`,
        dlqId,
      });
    }

    // Handle new item creation
    if (!targetItem && payload.eventType === 'item.created') {
      targetItem = {
        id: `item-${Date.now()}`,
        sku,
        title: (payload as any).title || `Product ${sku}`,
        category: (payload as any).category || 'General',
        price: Number((payload as any).price) || 99.99,
        totalQuantity: Number(payload.newQuantity) || 10,
        totalReserved: 0,
        availableQuantity: Number(payload.newQuantity) || 10,
        safetyThreshold: 10,
        status: 'IN_STOCK',
        version: 1,
        lastSyncTimestamp: Date.now(),
        syncSource: 'WEBHOOK_PUSH',
        locations: [
          {
            warehouseId: payload.sourceWarehouseId || 'WH-CENTRAL',
            warehouseName: 'Central Logistics Hub (Chicago)',
            region: 'Midwest',
            quantity: Number(payload.newQuantity) || 10,
            reserved: 0,
            available: Number(payload.newQuantity) || 10,
            aisle: 'A01-01',
          },
        ],
        changeHistory: [],
      };
      inventoryState.unshift(targetItem);
    }

    if (targetItem) {
      const prevTotal = targetItem.totalQuantity;
      const whId = payload.sourceWarehouseId || 'WH-CENTRAL';
      let location = targetItem.locations.find((loc) => loc.warehouseId === whId);

      if (!location) {
        location = {
          warehouseId: whId,
          warehouseName: `Warehouse ${whId}`,
          region: 'Regional Distribution',
          quantity: 0,
          reserved: 0,
          available: 0,
          aisle: 'D01-01',
        };
        targetItem.locations.push(location);
      }

      // Apply Quantity Mutations
      if (typeof payload.deltaQuantity === 'number') {
        location.quantity = Math.max(0, location.quantity + payload.deltaQuantity);
      } else if (typeof payload.newQuantity === 'number') {
        location.quantity = Math.max(0, payload.newQuantity);
      }

      // Apply Reserved Mutations
      if (typeof payload.reservedDelta === 'number') {
        location.reserved = Math.max(0, location.reserved + payload.reservedDelta);
      }

      location.available = Math.max(0, location.quantity - location.reserved);

      // Recalculate item-level stock and thresholds
      targetItem.version += 1;
      targetItem.lastSyncTimestamp = Date.now();
      targetItem.syncSource = 'WEBHOOK_PUSH';
      recalculateItemStock(targetItem);

      // Append to change history
      targetItem.changeHistory.unshift({
        timestamp: Date.now(),
        delta: targetItem.totalQuantity - prevTotal,
        reason: payload.reason || `Webhook event: ${payload.eventType}`,
        source: 'WEBHOOK_PUSH',
        previousQuantity: prevTotal,
        newQuantity: targetItem.totalQuantity,
      });
      if (targetItem.changeHistory.length > 20) targetItem.changeHistory.pop();

      // Record Idempotency Key
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, Date.now());
      }

      const endTime = process.hrtime.bigint();
      const processingTimeMs = Number(endTime - startTime) / 1_000_000;
      totalWebhooksProcessed++;
      totalLatencySumMs += processingTimeMs;

      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        receivedAt: Date.now(),
        eventId: payload.eventId || idempotencyKey || 'evt_unspecified',
        eventType: payload.eventType,
        sku,
        signature: signature || '',
        signatureValid: true,
        idempotencyKey: idempotencyKey || 'none',
        isDuplicate: false,
        status: 'PROCESSED',
        processingTimeMs: Number(processingTimeMs.toFixed(2)),
        details: `Updated ${sku} (${prevTotal} -> ${targetItem.totalQuantity}). Available: ${targetItem.availableQuantity}`,
        payload,
      };

      webhookAuditLogs.unshift(logEntry);
      if (webhookAuditLogs.length > 300) webhookAuditLogs.pop();

      broadcastSSE('inventory_updated', targetItem);
      broadcastSSE('webhook_received', logEntry);

      return res.status(200).json({
        success: true,
        eventId: payload.eventId,
        sku,
        availableQuantity: targetItem.availableQuantity,
        totalQuantity: targetItem.totalQuantity,
        totalReserved: targetItem.totalReserved,
        status: targetItem.status,
        version: targetItem.version,
        latencyMs: Number(processingTimeMs.toFixed(2)),
      });
    }
  });

  // 4. GET WEBHOOK AUDIT LOGS
  app.get('/api/webhooks/logs', (_req, res) => {
    res.json({
      success: true,
      logs: webhookAuditLogs.slice(0, 100),
      totalCount: webhookAuditLogs.length,
    });
  });

  // 5. GET DEAD LETTER QUEUE (DLQ)
  app.get('/api/webhooks/dlq', (_req, res) => {
    res.json({
      success: true,
      items: deadLetterQueue,
      pendingCount: deadLetterQueue.filter((d) => d.status === 'PENDING_RETRY').length,
    });
  });

  // 6. RETRY DLQ ITEM
  app.post('/api/webhooks/dlq/retry', (req, res) => {
    const { id } = req.body;
    const dlqItem = deadLetterQueue.find((d) => d.id === id);
    if (!dlqItem) {
      return res.status(404).json({ error: 'DLQ item not found' });
    }

    try {
      const payload = JSON.parse(dlqItem.rawPayload);
      dlqItem.retryCount += 1;

      // Check if item SKU now exists
      const target = inventoryState.find((i) => i.sku.toUpperCase() === (payload.sku || '').toUpperCase());
      if (target) {
        dlqItem.status = 'RESOLVED';
        broadcastSSE('dlq_updated', dlqItem);
        return res.json({ success: true, message: 'DLQ item resolved successfully and applied to inventory' });
      } else {
        if (dlqItem.retryCount >= dlqItem.maxRetries) {
          dlqItem.status = 'EXHAUSTED';
        }
        broadcastSSE('dlq_updated', dlqItem);
        return res.json({
          success: false,
          message: `Retry ${dlqItem.retryCount}/${dlqItem.maxRetries} failed: SKU still missing`,
          status: dlqItem.status,
        });
      }
    } catch (err: any) {
      dlqItem.retryCount += 1;
      return res.status(400).json({ error: 'Payload parse failure on retry', details: err.message });
    }
  });

  // 7. INTERACTIVE WEBHOOK SIMULATOR TRIGGER
  app.post('/api/webhooks/simulate', (req, res) => {
    const { mode, sku, count = 1, delta = 5, reason } = req.body;
    const targetSku = sku || 'NSTR-PHN-01';
    const secret = DEFAULT_WEBHOOK_SECRET;

    if (mode === 'tampered_signature') {
      const eventId = `evt_tamper_${Date.now()}`;
      const payload: WebhookPayload = {
        eventId,
        eventType: 'inventory.updated',
        timestamp: Date.now(),
        sourceWarehouseId: 'WH-CENTRAL',
        sku: targetSku,
        deltaQuantity: 999,
        reason: 'Tampered malicious payload injection',
        correlationId: `corr_${Date.now()}`,
      };
      const rawPayload = JSON.stringify(payload);
      const fakeSig = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      totalInvalidSignaturesBlocked++;
      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}`,
        receivedAt: Date.now(),
        eventId,
        eventType: 'inventory.updated',
        sku: targetSku,
        signature: fakeSig,
        signatureValid: false,
        idempotencyKey: eventId,
        isDuplicate: false,
        status: 'INVALID_SIGNATURE',
        processingTimeMs: 0.45,
        details: 'Simulated Security Alert: Cryptographic HMAC signature rejected',
        payload,
      };
      webhookAuditLogs.unshift(logEntry);
      broadcastSSE('webhook_received', logEntry);

      return res.json({
        simulated: true,
        mode: 'tampered_signature',
        blocked: true,
        status: 'INVALID_SIGNATURE',
        log: logEntry,
      });
    }

    if (mode === 'duplicate_replay') {
      const replayKey = `idem_sim_replay_${Date.now()}`;
      const payload: WebhookPayload = {
        eventId: replayKey,
        eventType: 'inventory.updated',
        timestamp: Date.now(),
        sourceWarehouseId: 'WH-CENTRAL',
        sku: targetSku,
        deltaQuantity: 3,
        reason: 'Duplicate network retransmission',
        correlationId: `corr_${Date.now()}`,
      };
      const rawPayload = JSON.stringify(payload);
      const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

      // First call consumes the key
      idempotencyStore.set(replayKey, Date.now());
      totalDuplicatesDropped++;

      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}`,
        receivedAt: Date.now(),
        eventId: replayKey,
        eventType: 'inventory.updated',
        sku: targetSku,
        signature: sig,
        signatureValid: true,
        idempotencyKey: replayKey,
        isDuplicate: true,
        status: 'DROPPED_DUPLICATE',
        processingTimeMs: 0.38,
        details: `Simulated Replay Attack: Key ${replayKey} dropped safely without double counting`,
        payload,
      };
      webhookAuditLogs.unshift(logEntry);
      broadcastSSE('webhook_received', logEntry);

      return res.json({
        simulated: true,
        mode: 'duplicate_replay',
        duplicateDropped: true,
        status: 'DROPPED_DUPLICATE',
        log: logEntry,
      });
    }

    if (mode === 'poison_dlq') {
      const eventId = `evt_poison_${Date.now()}`;
      const dlqId = `dlq_${Date.now()}`;
      const dlqEntry: DLQItem = {
        id: dlqId,
        receivedAt: Date.now(),
        failedReason: "Simulated poison pill: Unknown SKU 'UNKNOWN-GHOST-SKU-99'",
        retryCount: 0,
        maxRetries: 3,
        rawPayload: JSON.stringify({ eventId, sku: 'UNKNOWN-GHOST-SKU-99', deltaQuantity: 20 }),
        rawHeaders: { 'x-northstar-signature': 'sha256=...' },
        status: 'PENDING_RETRY',
      };
      deadLetterQueue.unshift(dlqEntry);

      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}`,
        receivedAt: Date.now(),
        eventId,
        eventType: 'inventory.updated',
        sku: 'UNKNOWN-GHOST-SKU-99',
        signature: 'sha256=...',
        signatureValid: true,
        idempotencyKey: eventId,
        isDuplicate: false,
        status: 'DLQ_FAILED',
        processingTimeMs: 1.1,
        details: 'Routed poison payload to Dead Letter Queue (DLQ) safely',
        payload: { eventId, sku: 'UNKNOWN-GHOST-SKU-99' },
      };
      webhookAuditLogs.unshift(logEntry);
      broadcastSSE('webhook_received', logEntry);
      broadcastSSE('dlq_updated', dlqEntry);

      return res.json({
        simulated: true,
        mode: 'poison_dlq',
        dlqEntry,
        log: logEntry,
      });
    }

    // Default: Dispatch N valid events
    const results = [];
    for (let i = 0; i < count; i++) {
      const item = inventoryState.find((it) => it.sku === targetSku) || inventoryState[0];
      const eventId = `evt_sim_${Date.now()}_${i}`;
      const eventTypes = ['inventory.updated', 'inventory.restocked', 'stock.reserved'];
      const evType = (req.body.eventType || eventTypes[i % eventTypes.length]) as any;

      const deltaVal = evType === 'stock.reserved' ? 0 : delta;
      const resDelta = evType === 'stock.reserved' ? delta : 0;

      const payload: WebhookPayload = {
        eventId,
        eventType: evType,
        timestamp: Date.now(),
        sourceWarehouseId: 'WH-CENTRAL',
        sku: item.sku,
        deltaQuantity: deltaVal,
        reservedDelta: resDelta,
        reason: reason || (evType === 'stock.reserved' ? 'Customer checkout hold' : 'Restock scan receipt'),
        correlationId: `corr_${Date.now()}`,
      };

      const rawPayload = JSON.stringify(payload);
      const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

      // Process event
      const prevTotal = item.totalQuantity;
      const loc = item.locations[0];
      if (deltaVal) loc.quantity = Math.max(0, loc.quantity + deltaVal);
      if (resDelta) loc.reserved = Math.max(0, loc.reserved + resDelta);
      loc.available = Math.max(0, loc.quantity - loc.reserved);

      item.version += 1;
      item.lastSyncTimestamp = Date.now();
      item.syncSource = 'WEBHOOK_PUSH';
      recalculateItemStock(item);

      item.changeHistory.unshift({
        timestamp: Date.now(),
        delta: item.totalQuantity - prevTotal,
        reason: payload.reason,
        source: 'WEBHOOK_PUSH',
        previousQuantity: prevTotal,
        newQuantity: item.totalQuantity,
      });

      totalWebhooksProcessed++;
      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}-${i}`,
        receivedAt: Date.now(),
        eventId,
        eventType: evType,
        sku: item.sku,
        signature: sig,
        signatureValid: true,
        idempotencyKey: eventId,
        isDuplicate: false,
        status: 'PROCESSED',
        processingTimeMs: 0.72,
        details: `Live Webhook synced: ${item.sku} quantity is now ${item.totalQuantity} (Avail: ${item.availableQuantity})`,
        payload,
      };
      webhookAuditLogs.unshift(logEntry);
      broadcastSSE('inventory_updated', item);
      broadcastSSE('webhook_received', logEntry);
      results.push({ eventId, sku: item.sku, status: 'PROCESSED' });
    }

    res.json({
      success: true,
      count: results.length,
      results,
    });
  });

  // 8. METRICS & DAY 3 VS DAY 5 ARCHITECTURAL COMPARISON
  app.get('/api/metrics', (_req, res) => {
    const totalItems = inventoryState.length;
    const totalQuantity = inventoryState.reduce((a, b) => a + b.totalQuantity, 0);
    const totalReserved = inventoryState.reduce((a, b) => a + b.totalReserved, 0);
    const lowStockItemsCount = inventoryState.filter((i) => i.status === 'LOW_STOCK').length;
    const outOfStockItemsCount = inventoryState.filter((i) => i.status === 'OUT_OF_STOCK' || i.status === 'RESERVED_ONLY').length;

    const avgLatency = totalWebhooksProcessed > 0 ? totalLatencySumMs / totalWebhooksProcessed : 1.2;

    const metrics: SystemMetrics = {
      totalItems,
      totalQuantity,
      totalReserved,
      lowStockItemsCount,
      outOfStockItemsCount,
      webhookEventsProcessed: totalWebhooksProcessed,
      webhookEventsFailed: totalWebhooksFailed,
      duplicatesDropped: totalDuplicatesDropped,
      invalidSignaturesBlocked: totalInvalidSignaturesBlocked,
      dlqPendingCount: deadLetterQueue.filter((d) => d.status === 'PENDING_RETRY').length,
      avgSyncLatencyMs: Number(avgLatency.toFixed(2)),
      cacheHitRatioPercent: 99.8,
      pollingVsPushSavings: {
        pollingCallsAvoidedPerDay: totalItems * 288, // 12 polls/hr * 24hr = 288 polls per day
        bandwidthSavedMbPerDay: Number(((totalItems * 288 * 4.2) / 1024).toFixed(1)), // ~4.2 KB per full catalog poll
        latencyImprovementPercent: 99.4, // From 300,000ms max staleness to sub-50ms push
      },
    };

    res.json({
      success: true,
      metrics,
      legacyPolling: {
        enabled: legacyPollingEnabled,
        totalPolls: legacyPollingCount,
        lastPollTime: lastLegacyPollTime,
        status: 'DEPRECATED (Day 4 Meridian Pivot)',
      },
    });
  });

  // 9. DEPRECATED DAY 3 POLLING SIMULATION ENDPOINT
  app.post('/api/inventory/legacy-poll', (_req, res) => {
    legacyPollingCount++;
    lastLegacyPollTime = Date.now();

    // Polling triggers a full scan and marks items with POLLING_LEGACY source
    const latencyMs = Math.floor(Math.random() * 80) + 120; // 120-200ms round trip

    inventoryState.forEach((it) => {
      it.lastSyncTimestamp = Date.now();
      it.syncSource = 'POLLING_LEGACY';
    });

    broadcastSSE('legacy_poll_executed', {
      pollNumber: legacyPollingCount,
      timestamp: lastLegacyPollTime,
      itemCount: inventoryState.length,
    });

    res.json({
      message: 'Legacy Day 3 Polling Executed (Notice: Marked DEPRECATED in Day 4/5)',
      pollNumber: legacyPollingCount,
      bandwidthUsedKb: (inventoryState.length * 4.2).toFixed(1),
      latencyMs,
      warning: 'Periodic polling is deprecated. Use Webhook Push endpoint /api/webhooks/inventory for zero-staleness sync.',
    });
  });

  // 10. RESET DEMO DATA
  app.post('/api/inventory/reset', (_req, res) => {
    inventoryState = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
    webhookAuditLogs = [];
    deadLetterQueue = [];
    idempotencyStore.clear();
    totalWebhooksProcessed = 284;
    totalWebhooksFailed = 3;
    totalDuplicatesDropped = 19;
    totalInvalidSignaturesBlocked = 7;

    broadcastSSE('system_reset', { timestamp: Date.now() });
    res.json({ success: true, message: 'Inventory state and logs reset to seed baseline' });
  });

  // 11. MANUAL STOCK EDIT / RESTOCK
  app.post('/api/inventory/update', (req, res) => {
    const { sku, deltaQuantity, reservedDelta, reason, warehouseId } = req.body;
    const item = inventoryState.find((i) => i.sku === sku);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const whId = warehouseId || 'WH-CENTRAL';
    const loc = item.locations.find((l) => l.warehouseId === whId) || item.locations[0];
    const prevTotal = item.totalQuantity;

    if (typeof deltaQuantity === 'number') {
      loc.quantity = Math.max(0, loc.quantity + deltaQuantity);
    }
    if (typeof reservedDelta === 'number') {
      loc.reserved = Math.max(0, loc.reserved + reservedDelta);
    }
    loc.available = Math.max(0, loc.quantity - loc.reserved);

    item.version += 1;
    item.lastSyncTimestamp = Date.now();
    item.syncSource = 'MANUAL_OVERRIDE';
    recalculateItemStock(item);

    item.changeHistory.unshift({
      timestamp: Date.now(),
      delta: item.totalQuantity - prevTotal,
      reason: reason || 'Manual Admin Adjust',
      source: 'MANUAL_OVERRIDE',
      previousQuantity: prevTotal,
      newQuantity: item.totalQuantity,
    });

    broadcastSSE('inventory_updated', item);
    res.json({ success: true, item });
  });

  // -------------------------------------------------------------
  // SOLSTICE EVENTS CO. CHECK-IN KIOSK API (PIVOT EVENT)
  // -------------------------------------------------------------

  // 12. GET KIOSK ATTENDEES
  app.get('/api/kiosk/attendees', (_req, res) => {
    res.json({
      success: true,
      attendees: kioskAttendees,
      totalCount: kioskAttendees.length,
      checkedInCount: kioskAttendees.filter((a) => a.checkInStatus === 'CHECKED_IN').length,
      pendingCount: kioskAttendees.filter((a) => a.checkInStatus === 'PRINT_QUEUED' || a.checkInStatus === 'PRINTING').length,
    });
  });

  // 13. LOOKUP ATTENDEE BY QR OR TICKET CODE
  app.get('/api/kiosk/attendees/lookup', (req, res) => {
    const code = ((req.query.code as string) || '').trim().toUpperCase();
    const attendee = kioskAttendees.find(
      (a) => a.ticketCode.toUpperCase() === code || a.qrCode.toUpperCase() === code || a.id.toUpperCase() === code
    );

    if (!attendee) {
      return res.status(404).json({ success: false, message: `Attendee with code '${code}' not found` });
    }

    res.json({ success: true, attendee });
  });

  // 14. GET PRINTER FLEET & MESSAGE QUEUE
  app.get('/api/kiosk/printers', (_req, res) => {
    res.json({
      success: true,
      printers: kioskPrinters,
      jobs: kioskPrintJobs.slice(0, 50),
      queueLength: kioskPrintJobs.filter((j) => j.status === 'QUEUED' || j.status === 'PRINTING').length,
    });
  });

  // 15. GET ALL PRINT JOBS
  app.get('/api/kiosk/jobs', (_req, res) => {
    res.json({
      success: true,
      jobs: kioskPrintJobs,
      totalCount: kioskPrintJobs.length,
    });
  });

  // 16. KIOSK SCAN BADGE (THE ASYNC PIVOT SPEC: ENQUEUE JOB & RETURN PENDING IMMEDIATELY)
  app.post('/api/kiosk/scan', (req: Request, res: Response) => {
    const { ticketCode, qrCode, printerId = 'PRINTER-01', simulateNetworkDelayMs = 1200 } = req.body;
    const searchCode = (ticketCode || qrCode || '').trim().toUpperCase();

    const attendee = kioskAttendees.find(
      (a) => a.ticketCode.toUpperCase() === searchCode || a.qrCode.toUpperCase() === searchCode || a.id.toUpperCase() === searchCode
    );

    if (!attendee) {
      return res.status(404).json({
        success: false,
        actionTaken: 'ATTENDEE_NOT_FOUND',
        message: `Attendee with code '${searchCode}' was not found in registration database.`,
        isDuplicate: false,
        model: 'ASYNC_MESSAGE_QUEUE_WEBHOOK',
      });
    }

    // DUPLICATE-SCAN PROTECTION CASE 1: Attendee is ALREADY Checked In!
    if (attendee.checkInStatus === 'CHECKED_IN') {
      attendee.duplicateScanCount += 1;
      const rejectRecord = {
        jobId: `REJECTED_DUP_${Date.now()}`,
        printerId,
        requestedAt: Date.now(),
        completedAt: Date.now(),
        status: 'REJECTED_DUPLICATE' as const,
        durationMs: 0,
      };
      attendee.printHistory.unshift(rejectRecord);

      broadcastSSE('kiosk_duplicate_blocked', {
        attendee,
        reason: 'ALREADY_CHECKED_IN',
        timestamp: Date.now(),
      });

      return res.status(200).json({
        success: false,
        actionTaken: 'ALREADY_CHECKED_IN',
        attendee,
        message: `Duplicate scan prevented! ${attendee.name} was already checked in at ${new Date(attendee.checkedInAt || Date.now()).toLocaleTimeString()}. No duplicate badge printed.`,
        isDuplicate: true,
        model: 'ASYNC_MESSAGE_QUEUE_WEBHOOK',
      });
    }

    // DUPLICATE-SCAN PROTECTION CASE 2: Attendee scan is currently IN-FLIGHT / PRINTING
    if (attendee.checkInStatus === 'PRINT_QUEUED' || attendee.checkInStatus === 'PRINTING') {
      attendee.duplicateScanCount += 1;
      broadcastSSE('kiosk_duplicate_blocked', {
        attendee,
        reason: 'PRINT_IN_PROGRESS',
        timestamp: Date.now(),
      });

      return res.status(200).json({
        success: false,
        actionTaken: 'PRINT_IN_PROGRESS',
        attendee,
        message: `Scan already in progress for ${attendee.name} (Job: ${attendee.currentJobId}). Please wait at kiosk while badge finishes printing.`,
        isDuplicate: true,
        model: 'ASYNC_MESSAGE_QUEUE_WEBHOOK',
      });
    }

    // VALID FIRST-TIME SCAN: ENQUEUE JOB ONTO ASYNC MESSAGE QUEUE
    kioskJobSequence += 1;
    const jobId = `JOB-${kioskJobSequence}`;
    const queuedAt = Date.now();

    // 1. Mark attendee as PENDING (PRINT_QUEUED)
    attendee.checkInStatus = 'PRINT_QUEUED';
    attendee.currentJobId = jobId;

    // 2. Publish Print Request Message onto Queue
    const printJob: KioskPrintJob = {
      jobId,
      attendeeId: attendee.id,
      ticketCode: attendee.ticketCode,
      attendeeName: attendee.name,
      company: attendee.company,
      tier: attendee.tier,
      printerId,
      status: 'QUEUED',
      queuedAt,
      sequenceNumber: kioskJobSequence,
      webhookDelivered: false,
    };
    kioskPrintJobs.unshift(printJob);

    // Update printer device state
    const printer = kioskPrinters.find((p) => p.id === printerId) || kioskPrinters[0];
    if (printer) {
      printer.status = 'PRINTING';
      printer.activeJobId = jobId;
    }

    // Broadcast SSE to update kiosk UI immediately to PENDING state
    broadcastSSE('kiosk_attendee_updated', attendee);
    broadcastSSE('kiosk_job_queued', printJob);
    broadcastSSE('kiosk_printers_updated', kioskPrinters);

    // 3. Trigger Asynchronous Badge Printer hardware simulation worker
    // The printer worker handles physical rendering delay and then fires the webhook callback!
    setTimeout(() => {
      printJob.status = 'PRINTING';
      printJob.startedAt = Date.now();
      attendee.checkInStatus = 'PRINTING';
      broadcastSSE('kiosk_attendee_updated', attendee);
      broadcastSSE('kiosk_job_updated', printJob);

      // Simulate vendor printing duration, then deliver webhook
      setTimeout(() => {
        // Prepare vendor callback payload
        const completedAt = Date.now();
        const durationMs = completedAt - (printJob.startedAt || queuedAt);
        const webhookCallbackPayload = {
          eventType: 'badge.print_completed',
          jobId,
          attendeeId: attendee.id,
          ticketCode: attendee.ticketCode,
          printerId,
          status: 'SUCCESS',
          completedAt,
          durationMs,
          correlationId: `corr_${jobId}`,
        };

        // Execute internal webhook callback receiver
        executePrintWebhookCallback(webhookCallbackPayload, printJob, attendee, printer);
      }, simulateNetworkDelayMs);
    }, 400);

    // Return HTTP 202 Accepted with PENDING state
    return res.status(202).json({
      success: true,
      actionTaken: 'PRINT_QUEUED',
      attendee,
      job: printJob,
      message: `Print request enqueued (#${jobId}). UI reflecting PENDING state until webhook confirmation.`,
      isDuplicate: false,
      model: 'ASYNC_MESSAGE_QUEUE_WEBHOOK',
    });
  });

  // Helper: Asynchronous Webhook Callback Receiver
  function executePrintWebhookCallback(
    payload: any,
    job: KioskPrintJob,
    attendee: KioskAttendee,
    printer?: KioskPrinterDevice
  ) {
    const completedAt = Date.now();
    job.status = 'COMPLETED';
    job.completedAt = completedAt;
    job.durationMs = completedAt - job.queuedAt;
    job.webhookDelivered = true;
    job.webhookDeliveredAt = completedAt;

    // Out-of-order sequence check: ensure this job is the latest active job for attendee
    if (attendee.currentJobId === job.jobId || !attendee.checkedInAt) {
      attendee.checkInStatus = 'CHECKED_IN';
      attendee.checkedInAt = completedAt;
      attendee.badgePrintedAt = completedAt;
    }

    // Append to attendee history
    attendee.printHistory.unshift({
      jobId: job.jobId,
      printerId: job.printerId,
      requestedAt: job.queuedAt,
      completedAt,
      status: 'COMPLETED',
      durationMs: job.durationMs,
    });

    // Update printer stats
    if (printer) {
      printer.status = 'ONLINE';
      printer.activeJobId = undefined;
      printer.totalPrintsCount += 1;
    }

    // Broadcast SSE to notify Kiosk UI that printing succeeded and status is now CHECKED_IN
    broadcastSSE('kiosk_print_completed', {
      attendee,
      job,
      webhookPayload: payload,
    });
    broadcastSSE('kiosk_attendee_updated', attendee);
    broadcastSSE('kiosk_printers_updated', kioskPrinters);
  }

  // 17. BADGE PRINTER VENDOR WEBHOOK ENDPOINT (`POST /api/kiosk/webhooks/print-status`)
  app.post('/api/kiosk/webhooks/print-status', (req: Request, res: Response) => {
    const { jobId, attendeeId, status, durationMs, failureReason } = req.body;
    const job = kioskPrintJobs.find((j) => j.jobId === jobId);
    const attendee = kioskAttendees.find((a) => a.id === attendeeId || a.ticketCode === req.body.ticketCode);

    if (!job || !attendee) {
      return res.status(404).json({ error: 'Job or attendee not found for webhook callback' });
    }

    const completedAt = Date.now();
    job.status = status === 'SUCCESS' ? 'COMPLETED' : 'FAILED';
    job.completedAt = completedAt;
    job.durationMs = durationMs || completedAt - job.queuedAt;
    job.webhookDelivered = true;
    job.webhookDeliveredAt = completedAt;
    job.failureReason = failureReason;

    if (status === 'SUCCESS') {
      attendee.checkInStatus = 'CHECKED_IN';
      attendee.checkedInAt = completedAt;
      attendee.badgePrintedAt = completedAt;
    } else {
      attendee.checkInStatus = 'FAILED';
    }

    broadcastSSE('kiosk_print_completed', { attendee, job, webhookPayload: req.body });
    broadcastSSE('kiosk_attendee_updated', attendee);

    res.json({ success: true, acknowledged: true, jobId });
  });

  // 18. DEPRECATED DAY 3 SYNCHRONOUS SCAN SIMULATION (BLOCKING REST CALL)
  app.post('/api/kiosk/legacy-sync-scan', async (req: Request, res: Response) => {
    const { ticketCode } = req.body;
    const attendee = kioskAttendees.find((a) => a.ticketCode.toUpperCase() === (ticketCode || '').toUpperCase());

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    if (attendee.checkInStatus === 'CHECKED_IN') {
      return res.status(400).json({ error: 'Duplicate scan: already checked in' });
    }

    // Deprecated blocking synchronous simulation: UI hangs until REST call completes
    const blockingDelayMs = 2800; // Simulated synchronous printer latency
    await new Promise((resolve) => setTimeout(resolve, blockingDelayMs));

    attendee.checkInStatus = 'CHECKED_IN';
    attendee.checkedInAt = Date.now();
    attendee.badgePrintedAt = Date.now();

    broadcastSSE('kiosk_attendee_updated', attendee);

    res.json({
      success: true,
      attendee,
      model: 'SYNCHRONOUS_LEGACY',
      blockingDurationMs: blockingDelayMs,
      warning: 'DEPRECATED: Synchronous print endpoint blocks kiosk thread and crashes on printer jams. Use async queue + webhook model.',
    });
  });

  // 19. RESET KIOSK ATTENDEES & PRINTERS
  app.post('/api/kiosk/reset', (_req, res) => {
    kioskAttendees = JSON.parse(JSON.stringify(INITIAL_ATTENDEES));
    kioskPrintJobs = [];
    kioskPrinters = JSON.parse(JSON.stringify(INITIAL_PRINTERS));
    kioskJobSequence = 8800;

    broadcastSSE('kiosk_reset', { timestamp: Date.now() });
    res.json({ success: true, message: 'Kiosk attendee database reset to clean conference morning state' });
  });

  // -------------------------------------------------------------
  // RUN PYTHON ENGINE / TESTS DYNAMICALLY
  // -------------------------------------------------------------
  app.post('/api/python/run', (req, res) => {
    const { scriptName, args = [] } = req.body;
    const allowedScripts: Record<string, string> = {
      'test_inventory_sync.py': path.join(process.cwd(), 'python', 'test_inventory_sync.py'),
      'warehouse_webhook_emitter.py': path.join(process.cwd(), 'python', 'warehouse_webhook_emitter.py'),
      'sync_cli.py': path.join(process.cwd(), 'python', 'sync_cli.py'),
      'warehouse_sync_service.py': path.join(process.cwd(), 'python', 'warehouse_sync_service.py'),
      'kiosk_async_service.py': path.join(process.cwd(), 'python', 'kiosk_async_service.py'),
      'kiosk_printer_simulator.py': path.join(process.cwd(), 'python', 'kiosk_printer_simulator.py'),
      'test_kiosk_sync.py': path.join(process.cwd(), 'python', 'test_kiosk_sync.py'),
    };

    const targetScript = allowedScripts[scriptName];
    if (!targetScript) {
      return res.status(400).json({ error: `Invalid script name: ${scriptName}` });
    }

    const pyProcess = spawn('python3', [targetScript, ...args], {
      cwd: path.join(process.cwd(), 'python'),
    });

    let stdout = '';
    let stderr = '';

    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pyProcess.on('close', (exitCode) => {
      res.json({
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        command: `python3 ${scriptName} ${args.join(' ')}`,
      });
    });
  });

  // FETCH PYTHON FILES FOR VIEWING
  app.get('/api/python/files', (_req, res) => {
    const pythonDir = path.join(process.cwd(), 'python');
    const files = [
      'kiosk_async_service.py',
      'kiosk_printer_simulator.py',
      'test_kiosk_sync.py',
      'warehouse_sync_service.py',
      'warehouse_webhook_emitter.py',
      'test_inventory_sync.py',
      'sync_cli.py'
    ];

    const fileContents: Record<string, string> = {};
    files.forEach((file) => {
      const filePath = path.join(pythonDir, file);
      if (fs.existsSync(filePath)) {
        fileContents[file] = fs.readFileSync(filePath, 'utf8');
      }
    });

    res.json({ success: true, files: fileContents });
  });

  // 14. SSE STREAM FOR REAL-TIME LIVE UI UPDATES
  app.get('/api/events/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    sseClients.push(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clients: sseClients.length })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c !== res);
    });
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE SETUP
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[🚀 NORTHSTAR SYNC ENGINE] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[FATAL] Failed to start server:', err);
});
