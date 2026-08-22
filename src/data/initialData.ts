/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem, BlockerEntry, ScopeDeltaItem, AdaptabilityMetric } from '../types';

export const DEFAULT_WEBHOOK_SECRET = 'northstar_wh_sec_9948271038af8831';

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item-101',
    sku: 'NSTR-PHN-01',
    title: 'Northstar Apex Pro Smartphone 256GB (Onyx Black)',
    category: 'Electronics / Mobile',
    price: 899.99,
    totalQuantity: 48,
    totalReserved: 6,
    availableQuantity: 42,
    safetyThreshold: 15,
    status: 'IN_STOCK',
    version: 14,
    lastSyncTimestamp: Date.now() - 1000 * 45,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 28, reserved: 4, available: 24, aisle: 'A12-B4' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 12, reserved: 2, available: 10, aisle: 'W04-09' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 8, reserved: 0, available: 8, aisle: 'E18-22' },
    ],
    changeHistory: [
      { timestamp: Date.now() - 1000 * 3600 * 2, delta: 10, reason: 'Inbound shipment receipt from supplier', source: 'WEBHOOK_PUSH', previousQuantity: 38, newQuantity: 48 },
      { timestamp: Date.now() - 1000 * 3600 * 5, delta: -2, reason: 'Online order fulfillment reservation #SO-8841', source: 'WEBHOOK_PUSH', previousQuantity: 40, newQuantity: 38 }
    ]
  },
  {
    id: 'item-102',
    sku: 'NSTR-AUD-02',
    title: 'Northstar SonicWave Active Noise Cancelling Headphones',
    category: 'Audio',
    price: 249.50,
    totalQuantity: 14,
    totalReserved: 4,
    availableQuantity: 10,
    safetyThreshold: 20,
    status: 'LOW_STOCK',
    version: 8,
    lastSyncTimestamp: Date.now() - 1000 * 120,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 6, reserved: 2, available: 4, aisle: 'A08-C1' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 5, reserved: 2, available: 3, aisle: 'W02-14' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 3, reserved: 0, available: 3, aisle: 'E09-11' },
    ],
    changeHistory: [
      { timestamp: Date.now() - 1000 * 1800, delta: -8, reason: 'Flash sale batch order checkout', source: 'WEBHOOK_PUSH', previousQuantity: 22, newQuantity: 14 }
    ]
  },
  {
    id: 'item-103',
    sku: 'NSTR-LAP-03',
    title: 'Northstar TitanBook Ultra 16" (M3 Max, 32GB RAM, 1TB SSD)',
    category: 'Computers',
    price: 2199.00,
    totalQuantity: 3,
    totalReserved: 3,
    availableQuantity: 0,
    safetyThreshold: 5,
    status: 'RESERVED_ONLY',
    version: 22,
    lastSyncTimestamp: Date.now() - 1000 * 300,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 2, reserved: 2, available: 0, aisle: 'SEC-VAULT-1' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 1, reserved: 1, available: 0, aisle: 'SEC-VAULT-2' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 0, reserved: 0, available: 0, aisle: 'W01-01' }
    ],
    changeHistory: [
      { timestamp: Date.now() - 1000 * 900, delta: -1, reason: 'VIP Customer reserve hold #VIP-991', source: 'WEBHOOK_PUSH', previousQuantity: 4, newQuantity: 3 }
    ]
  },
  {
    id: 'item-104',
    sku: 'NSTR-WTC-04',
    title: 'Northstar ChronoPulse GPS Smartwatch (Titanium Edition)',
    category: 'Wearables',
    price: 399.00,
    totalQuantity: 85,
    totalReserved: 12,
    availableQuantity: 73,
    safetyThreshold: 25,
    status: 'IN_STOCK',
    version: 31,
    lastSyncTimestamp: Date.now() - 1000 * 15,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 45, reserved: 6, available: 39, aisle: 'A14-A2' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 22, reserved: 4, available: 18, aisle: 'W06-03' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 18, reserved: 2, available: 16, aisle: 'E04-08' },
    ],
    changeHistory: [
      { timestamp: Date.now() - 1000 * 1200, delta: 30, reason: 'Restock lot pallet #PL-44901', source: 'WEBHOOK_PUSH', previousQuantity: 55, newQuantity: 85 }
    ]
  },
  {
    id: 'item-105',
    sku: 'NSTR-CAM-05',
    title: 'Northstar LumixPro 4K Cinema Camera Kit',
    category: 'Photography',
    price: 1450.00,
    totalQuantity: 0,
    totalReserved: 0,
    availableQuantity: 0,
    safetyThreshold: 8,
    status: 'OUT_OF_STOCK',
    version: 11,
    lastSyncTimestamp: Date.now() - 1000 * 600,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 0, reserved: 0, available: 0, aisle: 'A03-D9' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 0, reserved: 0, available: 0, aisle: 'W05-12' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 0, reserved: 0, available: 0, aisle: 'E02-05' }
    ],
    changeHistory: [
      { timestamp: Date.now() - 1000 * 7200, delta: -3, reason: 'Depleted store allocation', source: 'WEBHOOK_PUSH', previousQuantity: 3, newQuantity: 0 }
    ]
  },
  {
    id: 'item-106',
    sku: 'NSTR-DSP-06',
    title: 'Northstar Horizon 34" Curved OLED Gaming Display (240Hz)',
    category: 'Displays',
    price: 749.00,
    totalQuantity: 32,
    totalReserved: 5,
    availableQuantity: 27,
    safetyThreshold: 10,
    status: 'IN_STOCK',
    version: 19,
    lastSyncTimestamp: Date.now() - 1000 * 80,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 18, reserved: 3, available: 15, aisle: 'B01-L02' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 8, reserved: 1, available: 7, aisle: 'W10-L01' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 6, reserved: 1, available: 5, aisle: 'E14-L03' }
    ],
    changeHistory: [
      { timestamp: Date.now() - 1000 * 2400, delta: 12, reason: 'Warehouse transfer intake', source: 'WEBHOOK_PUSH', previousQuantity: 20, newQuantity: 32 }
    ]
  },
  {
    id: 'item-107',
    sku: 'NSTR-KB-07',
    title: 'Northstar Mechanical Keyboard (Hot-swappable Custom Linear)',
    category: 'Accessories',
    price: 129.99,
    totalQuantity: 110,
    totalReserved: 14,
    availableQuantity: 96,
    safetyThreshold: 30,
    status: 'IN_STOCK',
    version: 45,
    lastSyncTimestamp: Date.now() - 1000 * 20,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 60, reserved: 8, available: 52, aisle: 'A19-A1' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 30, reserved: 4, available: 26, aisle: 'W08-B2' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 20, reserved: 2, available: 18, aisle: 'E11-C4' }
    ],
    changeHistory: []
  },
  {
    id: 'item-108',
    sku: 'NSTR-ROU-08',
    title: 'Northstar Tri-Band Wi-Fi 7 Mesh System (3-Pack)',
    category: 'Networking',
    price: 499.99,
    totalQuantity: 19,
    totalReserved: 12,
    availableQuantity: 7,
    safetyThreshold: 15,
    status: 'LOW_STOCK',
    version: 17,
    lastSyncTimestamp: Date.now() - 1000 * 95,
    syncSource: 'WEBHOOK_PUSH',
    locations: [
      { warehouseId: 'WH-CENTRAL', warehouseName: 'Central Logistics Hub (Chicago)', region: 'Midwest', quantity: 9, reserved: 6, available: 3, aisle: 'A07-E3' },
      { warehouseId: 'WH-WEST', warehouseName: 'Pacific Depot (Seattle)', region: 'West Coast', quantity: 6, reserved: 4, available: 2, aisle: 'W04-A1' },
      { warehouseId: 'WH-EAST', warehouseName: 'Atlantic Gateway (Newark)', region: 'East Coast', quantity: 4, reserved: 2, available: 2, aisle: 'E03-B2' }
    ],
    changeHistory: []
  }
];

export const INITIAL_BLOCKER_LOGS: BlockerEntry[] = [
  {
    id: 'blocker-1',
    day: 'Day 1 (Solo Recon)',
    toolConcept: 'HMAC-SHA256 Webhook Verification & Timing Attacks',
    challengeFaced: 'Initial implementation used regular string equality (`signature === computedSig`), which is susceptible to timing side-channel attacks and failed with raw body byte mismatches.',
    errorLogSnippet: 'Error: Webhook signature verification mismatch on payload containing UTF-8 unicode characters / non-canonical whitespace.',
    resourcesConsulted: [
      'Node.js Crypto Documentation (`crypto.timingSafeEqual`)',
      'Python `hmac.compare_digest` & `hashlib.sha256` standards',
      'Stripe & GitHub Webhook Security RFC guidelines'
    ],
    autonomousResolution: 'Preserved raw unparsed request buffer prior to JSON middleware, and switched verification to `crypto.timingSafeEqual(Buffer.from(received), Buffer.from(computed))` in JS and `hmac.compare_digest` in Python.',
    timeBoxBudgetHours: 4.0,
    actualTimeHours: 2.5,
    status: 'RESOLVED'
  },
  {
    id: 'blocker-2',
    day: 'Day 2 (Solo Recon)',
    toolConcept: 'Idempotency Key Sliding Window & Race Conditions',
    challengeFaced: 'Simultaneous duplicate webhook retries caused double-deduction of inventory when requests arrived within milliseconds of each other.',
    errorLogSnippet: 'RaceConditionError: Inventory count decremented twice for eventId: evt_9941a with identical X-Idempotency-Key.',
    resourcesConsulted: [
      'Distributed Systems Idempotency Patterns (Martin Fowler)',
      'LRU Cache / Token bucket deduplication algorithms',
      'Redis SETNX / In-memory atomic check-and-set semantics'
    ],
    autonomousResolution: 'Implemented an atomic in-memory sliding-window deduplication store with 24-hour TTL and monotonic sequence version checks (`item.version`). If an idempotency key is actively processing or already completed, it returns an instant cached HTTP 200 without mutating stock.',
    timeBoxBudgetHours: 4.0,
    actualTimeHours: 3.2,
    status: 'RESOLVED'
  },
  {
    id: 'blocker-3',
    day: 'Day 3 (Original Build)',
    toolConcept: 'Warehouse Polling Rate-Limits & Stale Support Queries',
    challengeFaced: '5-minute batch polling resulted in up to 300 seconds of stock staleness. Support agents gave incorrect "in stock" answers for items sold out 4 minutes prior.',
    errorLogSnippet: 'SupportIssue #4021: Agent confirmed stock of NSTR-LAP-03; order failed 2 minutes later at checkout due to out-of-stock.',
    resourcesConsulted: [
      'Northstar API Spec v1 (5-minute poll threshold)',
      'Cache-Control headers and TTL invalidation patterns'
    ],
    autonomousResolution: 'Built in-memory TTL query cache with fallback staleness indicators. Documented latency gap for Day 4 pivot to push architecture.',
    timeBoxBudgetHours: 6.0,
    actualTimeHours: 5.0,
    status: 'RESOLVED'
  },
  {
    id: 'blocker-4',
    day: 'Day 4 (The Meridian Pivot)',
    toolConcept: 'Dead Letter Queue (DLQ) & Exponential Backoff for Poison Payloads',
    challengeFaced: 'Malformed JSON or unrecognized SKU payloads would crash the worker queue or trigger infinite retry loops, exhausting server resources.',
    errorLogSnippet: 'UnhandledException: JSON.parse unexpected token < in /api/webhooks/inventory. Retrying immediately -> Loop detected.',
    resourcesConsulted: [
      'Enterprise Integration Patterns: Dead Letter Channel',
      'Exponential backoff with full jitter (AWS Architecture blog)'
    ],
    autonomousResolution: 'Added error-isolated DLQ routing: payloads that fail schema validation or exceed 3 retries are quarantined to the DLQ with full stack traces, allowing support/ops to inspect and replay safely.',
    timeBoxBudgetHours: 5.0,
    actualTimeHours: 3.8,
    status: 'RESOLVED'
  }
];

export const INITIAL_SCOPE_DELTA: ScopeDeltaItem[] = [
  {
    featureName: 'Warehouse Sync Ingestion',
    action: 'MODIFIED',
    originalSpecDay3: 'Periodic cron job polling warehouse REST API every 5 minutes (`GET /warehouse/v1/stock`).',
    newSpecDay5: 'Real-time Webhook Push Endpoint (`POST /api/webhooks/inventory`) with sub-50ms processing.',
    rationale: 'Client announced warehouse polling API is decommissioned. Real-time push eliminates the 5-minute stock latency window entirely.',
    technicalTradeoff: 'Requires public endpoint security (HMAC signature verification) and idempotency deduplication to handle network retries.',
    regressionMitigation: 'Retained backward-compatible query endpoint `/api/inventory/lookup` so the frontend support tool required zero interface changes.'
  },
  {
    featureName: 'Periodic Polling Engine',
    action: 'DROPPED',
    originalSpecDay3: 'Background interval timer making repetitive full catalog requests.',
    newSpecDay5: 'Visibly marked DEPRECATED and disabled by default. Kept as fallback comparison simulator only.',
    rationale: 'Adheres to non-negotiable rule: obsolete code must not run in parallel, avoiding wasted compute and double-writes.',
    technicalTradeoff: 'Saves 99.2% network bandwidth and over 288 unnecessary API calls per day per item.',
    regressionMitigation: 'Deprecated module is isolated behind an explicit toggle flag and does not mutate active push-managed state.'
  },
  {
    featureName: 'HMAC-SHA256 Signature Verification',
    action: 'ADDED',
    originalSpecDay3: 'Not present (internal polling used simple API key header).',
    newSpecDay5: 'Cryptographic HMAC-SHA256 verification using shared secret with timing-safe comparison.',
    rationale: 'Push endpoints exposed to the internet require strict authenticity to prevent forged stock injection attacks.',
    technicalTradeoff: 'Added ~0.4ms CPU overhead per webhook event for hash computation.',
    regressionMitigation: 'Comprehensive unit tests and Python test suite (`test_inventory_sync.py`) verify valid vs tampered signatures.'
  },
  {
    featureName: 'Idempotency & Replay Protection',
    action: 'ADDED',
    originalSpecDay3: 'Not needed in polling (polling fetches absolute snapshot).',
    newSpecDay5: '`X-Idempotency-Key` deduplication store with 24hr TTL and version sequencing.',
    rationale: 'Warehouse webhooks guarantee at-least-once delivery; without deduplication, retry bursts cause incorrect stock counts.',
    technicalTradeoff: 'Small memory overhead for tracking recent event IDs (~1MB per 100,000 events).',
    regressionMitigation: 'Replay attacks return HTTP 200 with `DROPPED_DUPLICATE` status, ensuring safe upstream publisher retries.'
  },
  {
    featureName: 'Dead Letter Queue (DLQ) & Retry Mechanism',
    action: 'ADDED',
    originalSpecDay3: 'Polling simply retried next cycle on failure.',
    newSpecDay5: 'Dedicated DLQ holding failed events with exponential backoff (1s, 2s, 4s) and manual replay capability.',
    rationale: 'Prevents dropped stock updates when downstream warehouse systems experience transient blips.',
    technicalTradeoff: 'Adds UI visibility and queue inspection state.',
    regressionMitigation: 'DLQ item manager lets operators replay or purge payloads safely with zero data loss.'
  }
];

export const INITIAL_ADAPTABILITY_METRICS: AdaptabilityMetric[] = [
  {
    category: 'Composure',
    score: 9.5,
    observation: 'Stayed calm when client cancelled polling on Day 4 with 48h deadline and no extension.',
    evidence: 'Did not panic or stall. Immediately mapped out required webhook ingestion architecture and split tasks into verification, queue, and testing.'
  },
  {
    category: 'Communication',
    score: 9.2,
    observation: 'Clear documentation of architectural trade-offs in the Scope Delta Analysis.',
    evidence: 'Communicated the exact savings (99.4% latency drop, 96% network overhead reduction) to stakeholders without hiding refactoring costs.'
  },
  {
    category: 'Flexibility',
    score: 9.8,
    observation: 'Rapidly shifted from pull-based thinking to push/event-driven mindset.',
    evidence: 'Cleanly deprecated Day 3 polling logic and adapted the cache invalidation triggers seamlessly.'
  },
  {
    category: 'Contribution',
    score: 9.6,
    observation: 'Delivered both Node.js/JavaScript live service and complete Python integration suite.',
    evidence: 'Authored end-to-end Python emitter, Python automated test suite, and interactive simulation dashboard.'
  },
  {
    category: 'Rehire Confidence',
    score: 9.7,
    observation: 'High reliability under pressure; resilient code with full test coverage.',
    evidence: 'Engine handles edge cases like signature tampering, replay bursts, and malformed payloads without crashing.'
  }
];

// -------------------------------------------------------------
// SOLSTICE EVENTS CO. INITIAL TEST ATTENDEES & HARDWARE
// -------------------------------------------------------------

import { KioskAttendee, KioskPrinterDevice } from '../types';

export const INITIAL_PRINTERS: KioskPrinterDevice[] = [
  {
    id: 'PRINTER-01',
    name: 'Kiosk North - Zebra ZXP 7 Color Thermal',
    location: 'Main Lobby Entrance A',
    model: 'Zebra ZXP Series 7 Pro',
    status: 'ONLINE',
    totalPrintsCount: 42,
    avgDurationMs: 1450,
  },
  {
    id: 'PRINTER-02',
    name: 'Kiosk South - Evolis Primacy 2 Hi-Speed',
    location: 'Main Lobby Entrance B',
    model: 'Evolis Primacy 2 Duplex',
    status: 'ONLINE',
    totalPrintsCount: 38,
    avgDurationMs: 1600,
  },
  {
    id: 'PRINTER-VIP',
    name: 'VIP & Speaker Lounge Express Printer',
    location: '2nd Floor VIP Lounge',
    model: 'Fargo HDP5000 High-Definition',
    status: 'ONLINE',
    totalPrintsCount: 19,
    avgDurationMs: 1200,
  }
];

export const INITIAL_ATTENDEES: KioskAttendee[] = [
  {
    id: 'att-101',
    ticketCode: 'SOL-ATT-001',
    qrCode: 'QR_SOL_ATT_001_ALEX_RIVERA',
    name: 'Alex Rivera',
    email: 'alex.rivera@cloudscale.io',
    company: 'CloudScale Technologies',
    title: 'Principal Distributed Systems Architect',
    tier: 'VIP_SPEAKER',
    badgeType: 'KEYNOTE SPEAKER',
    lanyardColor: '#EAB308', // Gold
    checkInStatus: 'NOT_CHECKED_IN',
    duplicateScanCount: 0,
    printHistory: []
  },
  {
    id: 'att-102',
    ticketCode: 'SOL-ATT-002',
    qrCode: 'QR_SOL_ATT_002_JORDAN_LEE',
    name: 'Jordan Lee',
    email: 'jordan.lee@nextgensys.com',
    company: 'NextGen Systems',
    title: 'Senior Full-Stack Engineer',
    tier: 'ALL_ACCESS_PASS',
    badgeType: 'CONFERENCE ATTENDEE',
    lanyardColor: '#10B981', // Emerald
    checkInStatus: 'NOT_CHECKED_IN',
    duplicateScanCount: 0,
    printHistory: []
  },
  {
    id: 'att-103',
    ticketCode: 'SOL-ATT-003',
    qrCode: 'QR_SOL_ATT_003_SAMANTHA_VANCE',
    name: 'Dr. Samantha Vance',
    email: 's.vance@cyberdyne-ai.org',
    company: 'Cyberdyne AI Research Labs',
    title: 'Chief Research Officer & Author',
    tier: 'VIP_SPEAKER',
    badgeType: 'PANEL MODERATOR',
    lanyardColor: '#8B5CF6', // Purple
    checkInStatus: 'NOT_CHECKED_IN',
    duplicateScanCount: 0,
    printHistory: []
  },
  {
    id: 'att-104',
    ticketCode: 'SOL-ATT-004',
    qrCode: 'QR_SOL_ATT_004_MARCUS_CHEN',
    name: 'Marcus Chen',
    email: 'm.chen@quantumnet.dev',
    company: 'Quantum Networks Corp',
    title: 'Staff DevOps & Reliability Engineer',
    tier: 'GENERAL_ADMISSION',
    badgeType: 'GENERAL ADMISSION',
    lanyardColor: '#3B82F6', // Blue
    checkInStatus: 'NOT_CHECKED_IN',
    duplicateScanCount: 0,
    printHistory: []
  },
  {
    id: 'att-105',
    ticketCode: 'SOL-ATT-005',
    qrCode: 'QR_SOL_ATT_005_ELENA_ROSTOVA',
    name: 'Elena Rostova',
    email: 'elena@siliconherald.com',
    company: 'Silicon Herald Media',
    title: 'Senior Tech Editor & Podcaster',
    tier: 'PRESS_MEDIA',
    badgeType: 'PRESS & MEDIA ACCESS',
    lanyardColor: '#F43F5E', // Rose
    checkInStatus: 'NOT_CHECKED_IN',
    duplicateScanCount: 0,
    printHistory: []
  }
];

