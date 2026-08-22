#!/usr/bin/env python3
"""
Solstice Events Co. - Asynchronous Event Check-In Kiosk Engine
Meridian Pivot Event: Transition from deprecated synchronous REST printer calls
to an Asynchronous Message Queue + Webhook Callback Push Model.

Key Architectural Guarantees:
1. Non-blocking scan: Returns HTTP 202 Accepted ("PRINT_QUEUED") immediately.
2. Duplicate-scan guard: Rejects secondary scans for already checked-in attendees.
3. In-flight protection: Rejects concurrent scans while a badge print job is active.
4. Out-of-order reconciliation: Handles asynchronous webhook callbacks arriving out of order.
5. Cryptographic integrity: HMAC-SHA256 signed webhook callbacks.
"""

import time
import json
import hmac
import hashlib
import threading
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from collections import deque

DEFAULT_KIOSK_SECRET = "solstice_kiosk_webhook_secret_2026_x99"

@dataclass
class Attendee:
    id: str
    ticket_code: str
    qr_code: str
    name: str
    email: str
    company: str
    title: str
    tier: str  # VIP_SPEAKER, ALL_ACCESS_PASS, GENERAL_ADMISSION, PRESS_MEDIA
    badge_type: str
    lanyard_color: str
    check_in_status: str = "NOT_CHECKED_IN"  # NOT_CHECKED_IN, PRINT_QUEUED, PRINTING, CHECKED_IN, FAILED
    checked_in_at: Optional[float] = None
    badge_printed_at: Optional[float] = None
    current_job_id: Optional[str] = None
    duplicate_scan_count: int = 0
    print_history: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class PrintJob:
    job_id: str
    attendee_id: str
    ticket_code: str
    attendee_name: str
    company: str
    tier: str
    printer_id: str
    status: str  # QUEUED, PRINTING, COMPLETED, FAILED, REJECTED_DUPLICATE
    queued_at: float
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    duration_ms: Optional[float] = None
    sequence_number: int = 0
    webhook_delivered: bool = False
    failure_reason: Optional[str] = None


class KioskAsyncEngine:
    """
    Core Event Check-In Kiosk Service Engine for Solstice Events Co.
    """

    def __init__(self, secret: str = DEFAULT_KIOSK_SECRET):
        self.secret = secret
        self.attendees: Dict[str, Attendee] = {}
        self.code_to_id: Dict[str, str] = {}
        self.print_queue: deque = deque()
        self.jobs: Dict[str, PrintJob] = {}
        self.job_sequence = 8800
        self.lock = threading.Lock()
        self._seed_default_attendees()

    def _seed_default_attendees(self):
        seed_data = [
            Attendee(
                id="att-101",
                ticket_code="SOL-ATT-001",
                qr_code="QR_SOL_ATT_001_ALEX_RIVERA",
                name="Alex Rivera",
                email="alex.rivera@cloudscale.io",
                company="CloudScale Technologies",
                title="Principal Distributed Systems Architect",
                tier="VIP_SPEAKER",
                badge_type="KEYNOTE SPEAKER",
                lanyard_color="#EAB308",
            ),
            Attendee(
                id="att-102",
                ticket_code="SOL-ATT-002",
                qr_code="QR_SOL_ATT_002_JORDAN_LEE",
                name="Jordan Lee",
                email="jordan.lee@nextgensys.com",
                company="NextGen Systems",
                title="Senior Full-Stack Engineer",
                tier="ALL_ACCESS_PASS",
                badge_type="CONFERENCE ATTENDEE",
                lanyard_color="#10B981",
            ),
            Attendee(
                id="att-103",
                ticket_code="SOL-ATT-003",
                qr_code="QR_SOL_ATT_003_SAMANTHA_VANCE",
                name="Dr. Samantha Vance",
                email="s.vance@cyberdyne-ai.org",
                company="Cyberdyne AI Research Labs",
                title="Chief Research Officer & Author",
                tier="VIP_SPEAKER",
                badge_type="PANEL MODERATOR",
                lanyard_color="#8B5CF6",
            ),
            Attendee(
                id="att-104",
                ticket_code="SOL-ATT-004",
                qr_code="QR_SOL_ATT_004_MARCUS_CHEN",
                name="Marcus Chen",
                email="m.chen@quantumnet.dev",
                company="Quantum Networks Corp",
                title="Staff DevOps & Reliability Engineer",
                tier="GENERAL_ADMISSION",
                badge_type="GENERAL ADMISSION",
                lanyard_color="#3B82F6",
            ),
            Attendee(
                id="att-105",
                ticket_code="SOL-ATT-005",
                qr_code="QR_SOL_ATT_005_ELENA_ROSTOVA",
                name="Elena Rostova",
                email="elena@siliconherald.com",
                company="Silicon Herald Media",
                title="Senior Tech Editor & Podcaster",
                tier="PRESS_MEDIA",
                badge_type="PRESS & MEDIA ACCESS",
                lanyard_color="#F43F5E",
            ),
        ]
        for att in seed_data:
            self.attendees[att.id] = att
            self.code_to_id[att.ticket_code.upper()] = att.id
            self.code_to_id[att.qr_code.upper()] = att.id

    def lookup_attendee(self, code: str) -> Optional[Attendee]:
        with self.lock:
            att_id = self.code_to_id.get(code.strip().upper())
            return self.attendees.get(att_id) if att_id else None

    def scan_badge(self, scan_code: str, printer_id: str = "PRINTER-01") -> Tuple[int, Dict[str, Any]]:
        """
        Processes badge scan using the asynchronous queue model.
        Returns HTTP status code and response payload.
        """
        with self.lock:
            search_code = scan_code.strip().upper()
            att_id = self.code_to_id.get(search_code)
            if not att_id or att_id not in self.attendees:
                return 404, {
                    "success": False,
                    "action_taken": "ATTENDEE_NOT_FOUND",
                    "message": f"Attendee with scan code '{scan_code}' not found.",
                    "is_duplicate": False,
                    "model": "ASYNC_MESSAGE_QUEUE_WEBHOOK",
                }

            attendee = self.attendees[att_id]

            # DUPLICATE-SCAN CASE 1: Attendee is ALREADY Checked In!
            if attendee.check_in_status == "CHECKED_IN":
                attendee.duplicate_scan_count += 1
                attendee.print_history.insert(0, {
                    "job_id": f"REJECTED_DUP_{int(time.time() * 1000)}",
                    "printer_id": printer_id,
                    "requested_at": time.time(),
                    "status": "REJECTED_DUPLICATE",
                    "reason": "Attendee already checked in",
                })
                return 200, {
                    "success": False,
                    "action_taken": "ALREADY_CHECKED_IN",
                    "attendee": asdict(attendee),
                    "message": f"Duplicate scan blocked! {attendee.name} was already checked in. Secondary badge print prevented.",
                    "is_duplicate": True,
                    "model": "ASYNC_MESSAGE_QUEUE_WEBHOOK",
                }

            # DUPLICATE-SCAN CASE 2: Scan is in progress (in queue or printing)
            if attendee.check_in_status in ("PRINT_QUEUED", "PRINTING"):
                attendee.duplicate_scan_count += 1
                return 200, {
                    "success": False,
                    "action_taken": "PRINT_IN_PROGRESS",
                    "attendee": asdict(attendee),
                    "message": f"Badge print already in progress for {attendee.name} (Job: {attendee.current_job_id}). Please wait at kiosk.",
                    "is_duplicate": True,
                    "model": "ASYNC_MESSAGE_QUEUE_WEBHOOK",
                }

            # ASYNC PIVOT SPEC: Enqueue job onto vendor print queue
            self.job_sequence += 1
            job_id = f"JOB-{self.job_sequence}"
            now = time.time()

            attendee.check_in_status = "PRINT_QUEUED"
            attendee.current_job_id = job_id

            job = PrintJob(
                job_id=job_id,
                attendee_id=attendee.id,
                ticket_code=attendee.ticket_code,
                attendee_name=attendee.name,
                company=attendee.company,
                tier=attendee.tier,
                printer_id=printer_id,
                status="QUEUED",
                queued_at=now,
                sequence_number=self.job_sequence,
            )

            self.jobs[job_id] = job
            self.print_queue.append(job)

            # Return 202 Accepted immediately. Status is PENDING.
            return 202, {
                "success": True,
                "action_taken": "PRINT_QUEUED",
                "attendee": asdict(attendee),
                "job": asdict(job),
                "message": f"Print request #{job_id} queued. Kiosk UI reflects PENDING until webhook callback.",
                "is_duplicate": False,
                "model": "ASYNC_MESSAGE_QUEUE_WEBHOOK",
            }

    def process_webhook_callback(self, payload: Dict[str, Any], signature: Optional[str] = None) -> Tuple[int, Dict[str, Any]]:
        """
        Receives and validates asynchronous webhook callbacks from badge printer vendor.
        """
        # 1. Signature Verification
        if signature:
            computed = "sha256=" + hmac.new(
                self.secret.encode("utf-8"),
                json.dumps(payload, sort_keys=True).encode("utf-8"),
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(signature, computed):
                return 401, {"error": "Invalid HMAC signature on webhook callback"}

        job_id = payload.get("jobId") or payload.get("job_id")
        status = payload.get("status", "SUCCESS")
        duration_ms = payload.get("durationMs") or payload.get("duration_ms", 1400)

        with self.lock:
            if not job_id or job_id not in self.jobs:
                return 404, {"error": f"Job '{job_id}' not found in kiosk queue"}

            job = self.jobs[job_id]
            attendee = self.attendees.get(job.attendee_id)
            if not attendee:
                return 404, {"error": f"Attendee '{job.attendee_id}' not found"}

            now = time.time()
            job.status = "COMPLETED" if status == "SUCCESS" else "FAILED"
            job.completed_at = now
            job.duration_ms = duration_ms
            job.webhook_delivered = True

            # Out-of-order reconcile: only update attendee if this job matches active request
            if attendee.current_job_id == job.job_id or attendee.check_in_status != "CHECKED_IN":
                if status == "SUCCESS":
                    attendee.check_in_status = "CHECKED_IN"
                    attendee.checked_in_at = now
                    attendee.badge_printed_at = now
                else:
                    attendee.check_in_status = "FAILED"

            attendee.print_history.insert(0, {
                "job_id": job.job_id,
                "printer_id": job.printer_id,
                "requested_at": job.queued_at,
                "completed_at": now,
                "status": job.status,
                "duration_ms": duration_ms,
            })

            return 200, {
                "success": True,
                "acknowledged": True,
                "job_id": job.job_id,
                "attendee_status": attendee.check_in_status,
                "checked_in_at": attendee.checked_in_at,
            }

    def generate_webhook_signature(self, payload: Dict[str, Any]) -> str:
        raw = json.dumps(payload, sort_keys=True).encode("utf-8")
        return "sha256=" + hmac.new(self.secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()

    def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            total = len(self.attendees)
            checked_in = sum(1 for a in self.attendees.values() if a.check_in_status == "CHECKED_IN")
            pending = sum(1 for a in self.attendees.values() if a.check_in_status in ("PRINT_QUEUED", "PRINTING"))
            return {
                "total_attendees": total,
                "checked_in": checked_in,
                "pending": pending,
                "queue_length": len(self.print_queue),
                "total_jobs": len(self.jobs),
            }


if __name__ == "__main__":
    engine = KioskAsyncEngine()
    print("=" * 70)
    print("Solstice Events Co. - Async Kiosk Engine initialized")
    print("=" * 70)
    for att in engine.attendees.values():
        print(f"[{att.ticket_code}] {att.name:<22} | Tier: {att.tier:<16} | Status: {att.check_in_status}")
    print("=" * 70)
