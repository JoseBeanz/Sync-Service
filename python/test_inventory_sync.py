#!/usr/bin/env python3
"""
==============================================================================
Northstar Retail Co. - Automated Inventory Sync Test Suite (Python)
==============================================================================
Description:
    Unit, Integration, and Regression test suite verifying:
    1. HMAC-SHA256 Cryptographic Signature Verification & Timing-Attack Safety
    2. Idempotency Token Deduplication & Replay Attack Protection
    3. Multi-Warehouse Stock Aggregation & Status Threshold Triggers
    4. Support Tool Query Endpoint ("Is this in stock?") Response Accuracy
    5. Dead Letter Queue (DLQ) Quarantine & Error Isolation
    6. Performance Benchmark (1,000 in-memory events throughput)

Execution:
    python3 test_inventory_sync.py
    python3 -m unittest test_inventory_sync.py -v
==============================================================================
"""

import unittest
import json
import uuid
import time
import sys
import os

# Add local directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our Python sync service
from warehouse_sync_service import (
    LiveInventorySyncEngine,
    WebhookSecurityManager,
    IdempotencyGuard,
    DeadLetterQueue,
    InventoryItem,
    WarehouseLocation
)


class TestWebhookSecurityManager(unittest.TestCase):
    """Verifies cryptographic signature generation and verification."""

    def setUp(self):
        self.secret = "test_secret_key_88921"
        self.security = WebhookSecurityManager(self.secret)
        self.sample_payload = json.dumps({
            "eventId": "evt_test_01",
            "sku": "NSTR-PHN-01",
            "deltaQuantity": 10
        }, sort_keys=True)

    def test_valid_signature_passes(self):
        sig = self.security.compute_signature(self.sample_payload)
        self.assertTrue(self.security.verify_signature(self.sample_payload, sig))
        # Test without 'sha256=' prefix as well
        raw_hex = sig.replace("sha256=", "")
        self.assertTrue(self.security.verify_signature(self.sample_payload, raw_hex))

    def test_tampered_payload_fails(self):
        sig = self.security.compute_signature(self.sample_payload)
        tampered_payload = self.sample_payload.replace("10", "999")
        self.assertFalse(self.security.verify_signature(tampered_payload, sig))

    def test_invalid_signature_string_fails(self):
        bad_sig = "sha256=0000000000000000000000000000000000000000000000000000000000000000"
        self.assertFalse(self.security.verify_signature(self.sample_payload, bad_sig))

    def test_empty_signature_fails_safely(self):
        self.assertFalse(self.security.verify_signature(self.sample_payload, ""))
        self.assertFalse(self.security.verify_signature(self.sample_payload, None))


class TestIdempotencyGuard(unittest.TestCase):
    """Verifies duplicate event deduplication and sliding window expiration."""

    def setUp(self):
        self.guard = IdempotencyGuard(ttl_seconds=2)

    def test_deduplication(self):
        key = "idem_tx_123"
        self.assertFalse(self.guard.is_duplicate(key))
        self.guard.mark_processed(key)
        self.assertTrue(self.guard.is_duplicate(key))

    def test_ttl_expiration(self):
        key = "idem_exp_456"
        self.guard.mark_processed(key)
        self.assertTrue(self.guard.is_duplicate(key))
        # Wait for TTL to expire
        time.sleep(2.1)
        self.assertFalse(self.guard.is_duplicate(key))


class TestLiveInventorySyncEngine(unittest.TestCase):
    """End-to-end integration tests for inventory mutations and queries."""

    def setUp(self):
        self.engine = LiveInventorySyncEngine(webhook_secret="test_secret_998")

    def test_process_valid_stock_restock(self):
        initial_qty = self.engine.inventory["NSTR-PHN-01"].total_quantity
        payload = json.dumps({
            "eventId": f"evt_{uuid.uuid4().hex}",
            "eventType": "inventory.restocked",
            "sku": "NSTR-PHN-01",
            "sourceWarehouseId": "WH-CENTRAL",
            "deltaQuantity": 15,
            "reason": "Test restock pallet"
        })
        sig = self.engine.security.compute_signature(payload)
        success, status, res = self.engine.process_webhook(payload, sig)

        self.assertTrue(success)
        self.assertEqual(status, "PROCESSED")
        self.assertEqual(self.engine.inventory["NSTR-PHN-01"].total_quantity, initial_qty + 15)

    def test_replay_attack_does_not_double_count(self):
        initial_qty = self.engine.inventory["NSTR-AUD-02"].total_quantity
        event_id = f"evt_replay_{uuid.uuid4().hex}"
        payload = json.dumps({
            "eventId": event_id,
            "eventType": "inventory.updated",
            "sku": "NSTR-AUD-02",
            "sourceWarehouseId": "WH-WEST",
            "deltaQuantity": 5,
            "reason": "First attempt"
        })
        sig = self.engine.security.compute_signature(payload)

        # First request -> Processed
        success1, status1, _ = self.engine.process_webhook(payload, sig, idempotency_key=event_id)
        self.assertTrue(success1)
        self.assertEqual(status1, "PROCESSED")
        self.assertEqual(self.engine.inventory["NSTR-AUD-02"].total_quantity, initial_qty + 5)

        # Second request (duplicate replay) -> Dropped
        success2, status2, _ = self.engine.process_webhook(payload, sig, idempotency_key=event_id)
        self.assertTrue(success2)
        self.assertEqual(status2, "DROPPED_DUPLICATE")
        # Ensure quantity was NOT incremented a second time
        self.assertEqual(self.engine.inventory["NSTR-AUD-02"].total_quantity, initial_qty + 5)

    def test_stock_status_transitions(self):
        item = self.engine.inventory["NSTR-CAM-05"]
        self.assertEqual(item.status, "OUT_OF_STOCK")

        # Restock item above safety threshold (safety_threshold = 8)
        payload = json.dumps({
            "eventId": f"evt_{uuid.uuid4().hex}",
            "eventType": "inventory.restocked",
            "sku": "NSTR-CAM-05",
            "sourceWarehouseId": "WH-CENTRAL",
            "deltaQuantity": 20
        })
        sig = self.engine.security.compute_signature(payload)
        self.engine.process_webhook(payload, sig)
        self.assertEqual(item.status, "IN_STOCK")

        # Reserve 15 units -> 5 available remaining (<= safety threshold 8) -> LOW_STOCK
        reserve_payload = json.dumps({
            "eventId": f"evt_{uuid.uuid4().hex}",
            "eventType": "stock.reserved",
            "sku": "NSTR-CAM-05",
            "sourceWarehouseId": "WH-CENTRAL",
            "reservedDelta": 15
        })
        sig_reserve = self.engine.security.compute_signature(reserve_payload)
        self.engine.process_webhook(reserve_payload, sig_reserve)
        self.assertEqual(item.status, "LOW_STOCK")

    def test_support_query_endpoint(self):
        res = self.engine.support_query("NSTR-PHN-01")
        self.assertTrue(res["found"])
        self.assertEqual(res["sku"], "NSTR-PHN-01")
        self.assertTrue(res["canFulfillImmediately"])
        self.assertIn("Yes! We currently have", res["supportScript"])
        self.assertLess(res["queryLatencyMs"], 5.0)

    def test_poison_pill_malformed_json_routes_to_dlq(self):
        bad_payload = "{invalid_json: 123"
        sig = self.engine.security.compute_signature(bad_payload)
        success, status, res = self.engine.process_webhook(bad_payload, sig)

        self.assertFalse(success)
        self.assertEqual(status, "MALFORMED_PAYLOAD")
        self.assertIn("dlq_id", res)
        self.assertGreater(len(self.engine.dlq.items), 0)


def run_benchmark():
    """Runs high-throughput in-memory benchmark."""
    print("\n" + "=" * 70)
    print("BENCHMARK: High-Throughput Webhook Processing (1,000 events)")
    print("=" * 70)
    engine = LiveInventorySyncEngine()
    start = time.perf_counter()
    num_events = 1000

    for i in range(num_events):
        payload = json.dumps({
            "eventId": f"evt_bench_{i}",
            "eventType": "inventory.updated",
            "sku": "NSTR-PHN-01",
            "sourceWarehouseId": "WH-CENTRAL",
            "deltaQuantity": 1
        })
        sig = engine.security.compute_signature(payload)
        engine.process_webhook(payload, sig)

    total_time = time.perf_counter() - start
    rate = num_events / total_time
    print(f"Processed {num_events} signed webhooks in {total_time:.4f}s")
    print(f"Throughput: {rate:,.1f} events/second (Avg: {total_time*1000/num_events:.3f}ms per event)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    # Run unittests
    suite = unittest.TestLoader().loadTestsFromModule(sys.modules[__name__])
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if result.wasSuccessful():
        run_benchmark()
        sys.exit(0)
    else:
        sys.exit(1)
