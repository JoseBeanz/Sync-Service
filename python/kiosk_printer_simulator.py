#!/usr/bin/env python3
"""
Solstice Events Co. - Badge Printer Hardware Daemon & Webhook Dispatcher
Emulates the physical vendor badge printer consuming from the message queue,
simulating mechanical thermal printing delay, and delivering HMAC-signed webhook callbacks.
"""

import time
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from kiosk_async_service import KioskAsyncEngine, DEFAULT_KIOSK_SECRET

class BadgePrinterSimulator:
    def __init__(self, target_webhook_url: str = "http://localhost:3000/api/kiosk/webhooks/print-status"):
        self.target_url = target_webhook_url
        self.secret = DEFAULT_KIOSK_SECRET

    def process_job_and_deliver_webhook(
        self,
        engine: KioskAsyncEngine,
        simulated_print_time_sec: float = 0.5,
        target_server: bool = False
    ) -> Dict[str, Any]:
        """
        Pulls a job from the engine's print queue, simulates printing, and delivers webhook.
        """
        if not engine.print_queue:
            return {"status": "NO_JOBS_IN_QUEUE"}

        job = engine.print_queue.popleft()
        job.status = "PRINTING"
        job.started_at = time.time()

        # Simulate mechanical printer head movement & ribbon thermal transfer
        time.sleep(simulated_print_time_sec)

        completed_at = time.time()
        duration_ms = (completed_at - job.started_at) * 1000

        webhook_payload = {
            "eventType": "badge.print_completed",
            "jobId": job.job_id,
            "attendeeId": job.attendee_id,
            "ticketCode": job.ticket_code,
            "printerId": job.printer_id,
            "status": "SUCCESS",
            "completedAt": int(completed_at * 1000),
            "durationMs": int(duration_ms),
            "correlationId": f"corr_{job.job_id}",
        }

        signature = engine.generate_webhook_signature(webhook_payload)

        if target_server:
            try:
                req = urllib.request.Request(
                    self.target_url,
                    data=json.dumps(webhook_payload).encode("utf-8"),
                    headers={
                        "Content-Type": "application/json",
                        "X-Solstice-Signature": signature,
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=3) as resp:
                    return {
                        "job_id": job.job_id,
                        "server_status": resp.status,
                        "payload": webhook_payload,
                    }
            except Exception as e:
                # Fallback to local engine update
                engine.process_webhook_callback(webhook_payload, signature)
                return {
                    "job_id": job.job_id,
                    "server_error": str(e),
                    "local_fallback_processed": True,
                }
        else:
            status_code, result = engine.process_webhook_callback(webhook_payload, signature)
            return {
                "job_id": job.job_id,
                "status_code": status_code,
                "result": result,
                "duration_ms": duration_ms,
            }


if __name__ == "__main__":
    engine = KioskAsyncEngine()
    printer = BadgePrinterSimulator()

    print("=" * 70)
    print("Simulating Kiosk Badge Scan -> Async Queue -> Printer -> Webhook")
    print("=" * 70)

    # 1. Scan Attendee 1
    code, scan_res = engine.scan_badge("SOL-ATT-001")
    print(f"1. Scan Response (HTTP {code}): Action={scan_res['action_taken']}")
    print(f"   Attendee status in UI: {scan_res['attendee']['check_in_status']} (Job #{scan_res['job']['job_id']})")

    # 2. Process Queue & Fire Webhook
    print("\n2. Hardware Printer pulling job from queue...")
    delivery_res = printer.process_job_and_deliver_webhook(engine, simulated_print_time_sec=0.2)
    print(f"   Webhook Delivered! Job #{delivery_res['job_id']} Status={delivery_res['result']['attendee_status']}")

    # 3. Test Duplicate Scan
    print("\n3. Testing Duplicate Scan for same attendee...")
    code2, scan_res2 = engine.scan_badge("SOL-ATT-001")
    print(f"   Duplicate Scan Response (HTTP {code2}): Action={scan_res2['action_taken']}")
    print(f"   Duplicate Guard Message: {scan_res2['message']}")
    print("=" * 70)
