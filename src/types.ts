/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'RESERVED_ONLY';

export interface WarehouseLocationStock {
  warehouseId: string;
  warehouseName: string;
  region: string;
  quantity: number;
  reserved: number;
  available: number;
  aisle: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  category: string;
  price: number;
  totalQuantity: number;
  totalReserved: number;
  availableQuantity: number;
  safetyThreshold: number;
  status: StockStatus;
  locations: WarehouseLocationStock[];
  lastSyncTimestamp: number;
  syncSource: 'WEBHOOK_PUSH' | 'POLLING_LEGACY' | 'MANUAL_OVERRIDE' | 'PYTHON_EMITTER';
  version: number;
  changeHistory: {
    timestamp: number;
    delta: number;
    reason: string;
    source: string;
    previousQuantity: number;
    newQuantity: number;
  }[];
}

export type WebhookEventType = 
  | 'inventory.updated'
  | 'inventory.restocked'
  | 'stock.reserved'
  | 'stock.released'
  | 'item.created'
  | 'warehouse.transfer';

export interface WebhookPayload {
  eventId: string;
  eventType: WebhookEventType;
  timestamp: number;
  sourceWarehouseId: string;
  sku: string;
  deltaQuantity?: number;
  newQuantity?: number;
  reservedDelta?: number;
  reason: string;
  correlationId: string;
  operatorId?: string;
}

export interface WebhookLogEntry {
  id: string;
  receivedAt: number;
  eventId: string;
  eventType: string;
  sku: string;
  signature: string;
  signatureValid: boolean;
  idempotencyKey: string;
  isDuplicate: boolean;
  status: 'PROCESSED' | 'DROPPED_DUPLICATE' | 'INVALID_SIGNATURE' | 'DLQ_FAILED' | 'MALFORMED_PAYLOAD';
  processingTimeMs: number;
  details: string;
  payload: any;
  retryCount?: number;
}

export interface DLQItem {
  id: string;
  receivedAt: number;
  failedReason: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
  rawPayload: string;
  rawHeaders: Record<string, string>;
  status: 'PENDING_RETRY' | 'EXHAUSTED' | 'RESOLVED';
}

export interface SupportQueryResult {
  sku: string;
  found: boolean;
  title?: string;
  category?: string;
  price?: number;
  status?: StockStatus;
  availableQuantity?: number;
  totalQuantity?: number;
  totalReserved?: number;
  canFulfillImmediately: boolean;
  recommendedWarehouse?: string;
  estimatedDispatchTime: string;
  supportScript: string;
  alternativeSkus?: { sku: string; title: string; availableQuantity: number }[];
  queryLatencyMs: number;
  cached: boolean;
  lastSyncedAgoSec: number;
}

export interface SystemMetrics {
  totalItems: number;
  totalQuantity: number;
  totalReserved: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  webhookEventsProcessed: number;
  webhookEventsFailed: number;
  duplicatesDropped: number;
  invalidSignaturesBlocked: number;
  dlqPendingCount: number;
  avgSyncLatencyMs: number;
  cacheHitRatioPercent: number;
  pollingVsPushSavings: {
    pollingCallsAvoidedPerDay: number;
    bandwidthSavedMbPerDay: number;
    latencyImprovementPercent: number;
  };
}

export interface BlockerEntry {
  id: string;
  day: string;
  toolConcept: string;
  challengeFaced: string;
  errorLogSnippet: string;
  resourcesConsulted: string[];
  autonomousResolution: string;
  timeBoxBudgetHours: number;
  actualTimeHours: number;
  status: 'RESOLVED' | 'ADAPTED';
}

export interface ScopeDeltaItem {
  featureName: string;
  action: 'DROPPED' | 'MODIFIED' | 'ADDED';
  originalSpecDay3: string;
  newSpecDay5: string;
  rationale: string;
  technicalTradeoff: string;
  regressionMitigation: string;
}

export interface AdaptabilityMetric {
  category: 'Composure' | 'Communication' | 'Flexibility' | 'Contribution' | 'Rehire Confidence';
  score: number; // 1-10
  observation: string;
  evidence: string;
}

// -------------------------------------------------------------
// SOLSTICE EVENTS CO. CHECK-IN KIOSK SERVICE TYPES (PIVOT EVENT)
// -------------------------------------------------------------

export type AttendeeCheckInStatus = 
  | 'NOT_CHECKED_IN'
  | 'PRINT_QUEUED'
  | 'PRINTING'
  | 'CHECKED_IN'
  | 'FAILED';

export type TicketTier = 'VIP_SPEAKER' | 'ALL_ACCESS_PASS' | 'GENERAL_ADMISSION' | 'PRESS_MEDIA' | 'ORGANIZER';

export interface KioskAttendee {
  id: string;
  ticketCode: string;
  qrCode: string;
  name: string;
  email: string;
  company: string;
  title: string;
  tier: TicketTier;
  badgeType: string;
  lanyardColor: string;
  checkInStatus: AttendeeCheckInStatus;
  checkedInAt?: number;
  badgePrintedAt?: number;
  currentJobId?: string;
  duplicateScanCount: number;
  avatarUrl?: string;
  printHistory: {
    jobId: string;
    printerId: string;
    requestedAt: number;
    completedAt?: number;
    status: 'COMPLETED' | 'FAILED' | 'REJECTED_DUPLICATE';
    durationMs?: number;
  }[];
}

export type PrintJobStatus = 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED' | 'REJECTED_DUPLICATE';

export interface KioskPrintJob {
  jobId: string;
  attendeeId: string;
  ticketCode: string;
  attendeeName: string;
  company: string;
  tier: TicketTier;
  printerId: string;
  status: PrintJobStatus;
  queuedAt: number;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  sequenceNumber: number;
  webhookDelivered: boolean;
  webhookDeliveredAt?: number;
  failureReason?: string;
  isDuplicateAttempt?: boolean;
}

export interface KioskPrinterDevice {
  id: string;
  name: string;
  location: string;
  model: string;
  status: 'ONLINE' | 'PRINTING' | 'OFFLINE' | 'PAPER_LOW';
  activeJobId?: string;
  totalPrintsCount: number;
  avgDurationMs: number;
}

export interface KioskScanResponse {
  success: boolean;
  attendee?: KioskAttendee;
  job?: KioskPrintJob;
  actionTaken: 'PRINT_QUEUED' | 'ALREADY_CHECKED_IN' | 'PRINT_IN_PROGRESS' | 'ATTENDEE_NOT_FOUND';
  message: string;
  isDuplicate: boolean;
  model: 'ASYNC_MESSAGE_QUEUE_WEBHOOK' | 'SYNCHRONOUS_LEGACY';
}

