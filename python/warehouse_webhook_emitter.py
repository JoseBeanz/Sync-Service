#!/usr/bin/env python3
"""
==============================================================================
Northstar Retail Co. - Warehouse Webhook Emitter & Stress Simulator (Python)
==============================================================================
Description:
    Industrial webhook emitter simulating physical warehouse events:
    - Inbound pallet scanning & restocks (`inventory.restocked`)
    - Barcode pick-and-pack fulfillment allocations (`stock.reserved`)
    - Inter-facility inventory transfers (`warehouse.transfer`)
    - Generates cryptographic HMAC-SHA256 signatures (`X-Northstar-Signature`)
    - Attaches UUIDv4 idempotency keys (`X-Idempotency-Key`)
    - Supports edge-case simulation (tampered signatures, duplicate replays, malformed JSON)

Usage:
    python3 warehouse_webhook_emitter.py --help
    python3 warehouse_webhook_emitter.py --event restock --sku NSTR-PHN-01 --qty 10
    python3 warehouse_webhook_emitter.py --simulate-burst --count 15
    python3 warehouse_webhook_emitter.py --tamper-sig
==============================================================================
"""

import argparse
import hmac
import hashlib
import json
import time
import urllib.request
import urllib.error
import uuid
import random
from typing import Dict, Any, Optional

DEFAULT_ENDPOINT = "http://localhost:3000/api/webhooks/inventory"
DEFAULT_SECRET = "northstar_wh_sec_9948271038af8831"

SAMPLE_SKUS = [
    ("NSTR-PHN-01", "Central Logistics Hub (Chicago)", "WH-CENTRAL"),
    ("NSTR-AUD-02", "Pacific Depot (Seattle)", "WH-WEST"),
    ("NSTR-LAP-03", "Atlantic Gateway (Newark)", "WH-EAST"),
    ("NSTR-WTC-04", "Central Logistics Hub (Chicago)", "WH-CENTRAL"),
    ("NSTR-CAM-05", "Pacific Depot (Seattle)", "WH-WEST"),
    ("NSTR-DSP-06", "Atlantic Gateway (Newark)", "WH-EAST"),
    ("NSTR-KB-07", "Central Logistics Hub (Chicago)", "WH-CENTRAL"),
    ("NSTR-ROU-08", "Pacific Depot (Seattle)", "WH-WEST"),
]


def generate_hmac_signature(payload_json: str, secret: str) -> str:
    """Generate SHA256 HMAC signature for a raw payload string."""
    sig = hmac.new(
        secret.encode('utf-8'),
        payload_json.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return f"sha256={sig}"


def create_event_payload(
    event_type: str,
    sku: str,
    delta_qty: int,
    source_wh: str,
    reason: str,
    reserved_delta: int = 0
) -> Dict[str, Any]:
    """Build a structured warehouse webhook payload matching Northstar spec."""
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    return {
        "eventId": event_id,
        "eventType": event_type,
        "timestamp": int(time.time() * 1000),
        "sku": sku,
        "sourceWarehouseId": source_wh,
        "deltaQuantity": delta_qty,
        "reservedDelta": reserved_delta,
        "reason": reason,
        "correlationId": f"corr_{uuid.uuid4().hex[:8]}",
        "operatorId": f"wh_op_{random.randint(101, 999)}"
    }


def send_webhook(
    payload: Dict[str, Any],
    endpoint: str = DEFAULT_ENDPOINT,
    secret: str = DEFAULT_SECRET,
    idempotency_key: Optional[str] = None,
    tamper_signature: bool = False,
    raw_payload_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatches a cryptographic webhook to the inventory sync endpoint.
    Handles HTTP status codes, network errors, and signature injection.
    """
    raw_body = raw_payload_override if raw_payload_override is not None else json.dumps(payload, separators=(',', ':'))
    
    if tamper_signature:
        signature = "sha256=bad000000000000000000000000000000000000000000000000000000000dead"
    else:
        signature = generate_hmac_signature(raw_body, secret)

    idem_key = idempotency_key or payload.get("eventId") or str(uuid.uuid4())

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Northstar-Warehouse-Emitter/2.4 (Python 3.10)",
        "X-Northstar-Signature": signature,
        "X-Idempotency-Key": idem_key,
        "X-Timestamp": str(int(time.time()))
    }

    req = urllib.request.Request(
        endpoint,
        data=raw_body.encode('utf-8'),
        headers=headers,
        method="POST"
    )

    start_time = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=5.0) as response:
            status_code = response.getcode()
            response_body = response.read().decode('utf-8')
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            try:
                parsed_json = json.loads(response_body)
            except Exception:
                parsed_json = {"raw": response_body}
            
            return {
                "success": True,
                "status_code": status_code,
                "elapsed_ms": round(elapsed_ms, 2),
                "signature": signature,
                "idempotency_key": idem_key,
                "response": parsed_json
            }
    except urllib.error.HTTPError as http_err:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        error_body = http_err.read().decode('utf-8', errors='ignore')
        try:
            parsed_err = json.loads(error_body)
        except Exception:
            parsed_err = {"raw": error_body}
        return {
            "success": False,
            "status_code": http_err.code,
            "elapsed_ms": round(elapsed_ms, 2),
            "signature": signature,
            "idempotency_key": idem_key,
            "error": http_err.reason,
            "response": parsed_err
        }
    except urllib.error.URLError as url_err:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        return {
            "success": False,
            "status_code": 0,
            "elapsed_ms": round(elapsed_ms, 2),
            "signature": signature,
            "idempotency_key": idem_key,
            "error": f"Connection failed: {str(url_err.reason)} (Is the sync server running at {endpoint}?)"
        }


def run_burst_simulation(count: int = 10, endpoint: str = DEFAULT_ENDPOINT) -> None:
    """Simulates a rapid burst of concurrent warehouse scans."""
    print(f"\n[🚀 SIMULATOR] Initiating burst of {count} warehouse events to {endpoint}...")
    successes = 0
    total_time = 0.0

    for i in range(1, count + 1):
        sku_info = random.choice(SAMPLE_SKUS)
        event_types = ["inventory.updated", "inventory.restocked", "stock.reserved"]
        ev_type = random.choice(event_types)
        
        if ev_type == "stock.reserved":
            delta = 0
            reserved = random.randint(1, 3)
            reason = f"Automated customer checkout reservation #ORD-{random.randint(10000, 99999)}"
        elif ev_type == "inventory.restocked":
            delta = random.randint(10, 40)
            reserved = 0
            reason = f"Freight shipment dock receipt #BOL-{random.randint(4000, 8999)}"
        else:
            delta = random.randint(-5, 10)
            reserved = 0
            reason = f"Routine cycle count variance adjustment"

        payload = create_event_payload(
            event_type=ev_type,
            sku=sku_info[0],
            delta_qty=delta,
            source_wh=sku_info[2],
            reason=reason,
            reserved_delta=reserved
        )

        res = send_webhook(payload, endpoint=endpoint)
        status_symbol = "✅" if res["success"] else "⚠️"
        print(f" [{i}/{count}] {status_symbol} Event: {ev_type:<20} SKU: {sku_info[0]:<12} Code: {res.get('status_code', 0)} ({res['elapsed_ms']}ms)")
        
        if res["success"]:
            successes += 1
            total_time += res["elapsed_ms"]
        
        time.sleep(0.05)  # brief pacing

    avg_latency = total_time / max(1, successes)
    print(f"\n[📊 SUMMARY] Sent: {count} | Successful: {successes} | Failed: {count - successes} | Avg Latency: {avg_latency:.2f}ms\n")


def test_edge_cases(endpoint: str = DEFAULT_ENDPOINT) -> None:
    """Executes a series of edge case security tests."""
    print("\n" + "=" * 70)
    print("NORTHSTAR INVENTORY SYNC - SECURITY & INTEGRITY EDGE TEST SUITE")
    print("=" * 70)

    # Test 1: Valid Normal Update
    print("\n[TEST 1] Dispatching Valid HMAC Webhook...")
    p1 = create_event_payload("inventory.updated", "NSTR-PHN-01", 5, "WH-CENTRAL", "Valid test update")
    r1 = send_webhook(p1, endpoint=endpoint)
    print(f"  Result: {r1}")

    # Test 2: Tampered HMAC Signature Attack
    print("\n[TEST 2] Simulating Tampered Signature Attack (X-Northstar-Signature mismatch)...")
    p2 = create_event_payload("inventory.updated", "NSTR-PHN-01", 100, "WH-CENTRAL", "Tampered stock injection")
    r2 = send_webhook(p2, endpoint=endpoint, tamper_signature=True)
    print(f"  Result (Expected 401 Unauthorized / INVALID_SIGNATURE): {r2}")

    # Test 3: Duplicate Replay Attack
    print("\n[TEST 3] Simulating Duplicate Replay Attack (Identical Idempotency Key)...")
    duplicate_key = f"idem_replay_{uuid.uuid4().hex[:8]}"
    p3 = create_event_payload("inventory.restocked", "NSTR-AUD-02", 20, "WH-WEST", "Original restock")
    r3_first = send_webhook(p3, endpoint=endpoint, idempotency_key=duplicate_key)
    print(f"  First attempt: Success={r3_first.get('success')}, Code={r3_first.get('status_code')}")
    
    r3_second = send_webhook(p3, endpoint=endpoint, idempotency_key=duplicate_key)
    print(f"  Replay attempt: Success={r3_second.get('success')}, Response={r3_second.get('response')} (Should be DROPPED_DUPLICATE)")

    # Test 4: Malformed Payload -> Dead Letter Queue
    print("\n[TEST 4] Simulating Poison Pill Malformed JSON -> Dead Letter Queue...")
    r4 = send_webhook({}, endpoint=endpoint, raw_payload_override="{bad_json_token: <xml_not_json}")
    print(f"  Result (Expected 400 Bad Request & DLQ isolation): {r4}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Northstar Retail Live Warehouse Webhook Emitter")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="Target webhook URL")
    parser.add_argument("--secret", default=DEFAULT_SECRET, help="HMAC secret key")
    parser.add_argument("--sku", default="NSTR-PHN-01", help="Product SKU to update")
    parser.add_argument("--qty", type=int, default=5, help="Delta quantity")
    parser.add_argument("--event", choices=["update", "restock", "reserve"], default="update", help="Event type")
    parser.add_argument("--simulate-burst", type=int, metavar="COUNT", help="Fire a burst of N random webhook events")
    parser.add_argument("--test-edge-cases", action="store_true", help="Run comprehensive security test suite")
    parser.add_argument("--tamper-sig", action="store_true", help="Inject invalid HMAC signature")

    args = parser.parse_args()

    if args.simulate_burst:
        run_burst_simulation(count=args.simulate_burst, endpoint=args.endpoint)
    elif args.test_edge_cases:
        test_edge_cases(endpoint=args.endpoint)
    else:
        event_map = {
            "update": "inventory.updated",
            "restock": "inventory.restocked",
            "reserve": "stock.reserved"
        }
        res_delta = args.qty if args.event == "reserve" else 0
        delta_val = 0 if args.event == "reserve" else args.qty

        payload = create_event_payload(
            event_type=event_map[args.event],
            sku=args.sku,
            delta_qty=delta_val,
            source_wh="WH-CENTRAL",
            reason=f"CLI manual trigger ({args.event})",
            reserved_delta=res_delta
        )
        print(f"Dispatched webhook to {args.endpoint}:")
        result = send_webhook(payload, endpoint=args.endpoint, secret=args.secret, tamper_signature=args.tamper_sig)
        print(json.dumps(result, indent=2))
