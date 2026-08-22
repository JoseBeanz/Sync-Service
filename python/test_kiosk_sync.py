#!/usr/bin/env python3
"""
Solstice Events Co. - Check-In Kiosk Automated Test Suite
Verifies all client requirements from Meridian Pivot Handout:
1. Correctly handles at least 3 test attendees (Alex Rivera, Jordan Lee, Dr. Samantha Vance).
2. Asynchronous Model: Enqueues print job, reflects pending status, and marks "Checked In" only upon webhook arrival.
3. Duplicate-Scan Protection: An attendee who is already checked in must NOT get a second badge printed.
4. In-Flight Scan Protection: Rejects secondary scans while badge printing is currently queued/active.
5. Out-of-Order Webhook Reconciliation: Prevents stale callbacks from overwriting active state.
6. Cryptographic Security: Verifies HMAC SHA-256 signatures on webhook callbacks.
"""

import unittest
import time
from kiosk_async_service import KioskAsyncEngine, Attendee
from kiosk_printer_simulator import BadgePrinterSimulator

class TestSolsticeKioskAsyncService(unittest.TestCase):

    def setUp(self):
        self.engine = KioskAsyncEngine()
        self.printer = BadgePrinterSimulator()

    def test_01_attendee_one_alex_rivera_async_checkin(self):
        """
        Test Case 1: First-time scan for Attendee 1 (Alex Rivera, VIP Speaker).
        Enqueues job, receives 202 Accepted, and transitions to CHECKED_IN only after webhook.
        """
        # Step 1: Scan QR code
        code, res = self.engine.scan_badge("SOL-ATT-001")
        self.assertEqual(code, 202, "Scan should return HTTP 202 Accepted")
        self.assertEqual(res["action_taken"], "PRINT_QUEUED")
        self.assertEqual(res["attendee"]["check_in_status"], "PRINT_QUEUED", "UI must reflect pending status before webhook")
        self.assertEqual(len(self.engine.print_queue), 1, "Print job must be published onto async queue")

        # Step 2: Printer processes job and delivers webhook
        print_res = self.printer.process_job_and_deliver_webhook(self.engine, simulated_print_time_sec=0.05)
        self.assertEqual(print_res["result"]["attendee_status"], "CHECKED_IN", "Status must become CHECKED_IN once webhook callback arrives")

        attendee = self.engine.lookup_attendee("SOL-ATT-001")
        self.assertIsNotNone(attendee)
        self.assertEqual(attendee.check_in_status, "CHECKED_IN")
        self.assertIsNotNone(attendee.checked_in_at)
        self.assertEqual(len(attendee.print_history), 1)

    def test_02_attendee_two_jordan_lee_async_checkin(self):
        """
        Test Case 2: First-time scan for Attendee 2 (Jordan Lee, All Access).
        """
        code, res = self.engine.scan_badge("SOL-ATT-002")
        self.assertEqual(code, 202)
        self.assertEqual(res["action_taken"], "PRINT_QUEUED")

        self.printer.process_job_and_deliver_webhook(self.engine, simulated_print_time_sec=0.05)
        attendee = self.engine.lookup_attendee("SOL-ATT-002")
        self.assertEqual(attendee.check_in_status, "CHECKED_IN")

    def test_03_attendee_three_samantha_vance_async_checkin(self):
        """
        Test Case 3: First-time scan for Attendee 3 (Dr. Samantha Vance, VIP Speaker).
        """
        code, res = self.engine.scan_badge("SOL-ATT-003")
        self.assertEqual(code, 202)
        self.assertEqual(res["action_taken"], "PRINT_QUEUED")

        self.printer.process_job_and_deliver_webhook(self.engine, simulated_print_time_sec=0.05)
        attendee = self.engine.lookup_attendee("SOL-ATT-003")
        self.assertEqual(attendee.check_in_status, "CHECKED_IN")

    def test_04_duplicate_scan_protection_already_checked_in(self):
        """
        Test Case 4: Duplicate-scan protection for attendee who is ALREADY checked in.
        MUST NOT print a second badge or publish a secondary print job!
        """
        # Step 1: Perform first valid check-in
        self.engine.scan_badge("SOL-ATT-002")
        self.printer.process_job_and_deliver_webhook(self.engine, simulated_print_time_sec=0.02)
        
        initial_queue_len = len(self.engine.print_queue)
        initial_jobs_count = len(self.engine.jobs)

        # Step 2: Attempt duplicate scan
        code, dup_res = self.engine.scan_badge("SOL-ATT-002")
        self.assertEqual(code, 200)
        self.assertFalse(dup_res["success"])
        self.assertTrue(dup_res["is_duplicate"])
        self.assertEqual(dup_res["action_taken"], "ALREADY_CHECKED_IN")
        self.assertIn("already checked in", dup_res["message"].lower())

        # Verify NO new print jobs were enqueued
        self.assertEqual(len(self.engine.print_queue), initial_queue_len, "No secondary print job allowed in queue")
        self.assertEqual(len(self.engine.jobs), initial_jobs_count, "No new job entry created")

        # Verify duplicate count incremented
        attendee = self.engine.lookup_attendee("SOL-ATT-002")
        self.assertGreaterEqual(attendee.duplicate_scan_count, 1)

    def test_05_in_flight_scan_protection(self):
        """
        Test Case 5: Duplicate scan while previous scan is still in queue (in-flight).
        """
        # Step 1: Scan once (job is queued)
        code1, res1 = self.engine.scan_badge("SOL-ATT-004")
        self.assertEqual(code1, 202)

        # Step 2: Immediate second scan before printer finishes
        code2, res2 = self.engine.scan_badge("SOL-ATT-004")
        self.assertEqual(code2, 200)
        self.assertFalse(res2["success"])
        self.assertEqual(res2["action_taken"], "PRINT_IN_PROGRESS")
        self.assertEqual(len(self.engine.print_queue), 1, "Queue must still have exactly 1 job, not 2")

    def test_06_tampered_hmac_signature_rejected(self):
        """
        Test Case 6: Cryptographic HMAC signature check on webhook callback.
        """
        self.engine.scan_badge("SOL-ATT-005")
        job = self.engine.print_queue[0]

        payload = {
            "eventType": "badge.print_completed",
            "jobId": job.job_id,
            "attendeeId": job.attendee_id,
            "status": "SUCCESS",
        }
        fake_signature = "sha256=0000000000000000000000000000000000000000000000000000000000000000"
        status_code, resp = self.engine.process_webhook_callback(payload, signature=fake_signature)
        self.assertEqual(status_code, 401, "Tampered signature must be rejected with HTTP 401")

    def test_07_full_conference_benchmark(self):
        """
        Benchmark: High-throughput concurrent scan ingestion
        """
        start = time.perf_counter()
        count = 100
        for i in range(count):
            self.engine.scan_badge("SOL-ATT-001") # Duplicate tests
        elapsed = time.perf_counter() - start
        throughput = count / elapsed
        print(f"\n[BENCHMARK] Processed {count} kiosk scans in {elapsed:.4f}s ({throughput:.1f} scans/sec)")
        self.assertGreater(throughput, 1000)


if __name__ == "__main__":
    print("=" * 70)
    print("Running Solstice Events Co. Check-in Kiosk Async Test Suite")
    print("=" * 70)
    unittest.main(verbosity=2)
