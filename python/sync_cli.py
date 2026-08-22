#!/usr/bin/env python3
"""
==============================================================================
Northstar Retail Co. - Inventory CLI Utility Tool (Python)
==============================================================================
Description:
    Command-line tool for operations, DevOps, and warehouse technicians:
    - `lookup <sku>`: Instant support inquiry stock check
    - `stock`: List all catalog items with safety alerts
    - `verify-sig`: Test raw payload against HMAC secret
    - `dlq`: Inspect and replay Dead Letter Queue entries
    - `benchmark`: Run high-volume in-memory load test

Usage Examples:
    python3 sync_cli.py lookup NSTR-PHN-01
    python3 sync_cli.py stock
    python3 sync_cli.py verify-sig --payload '{"sku":"NSTR-01"}' --secret "northstar_wh_sec_9948271038af8831"
==============================================================================
"""

import sys
import os
import argparse
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from warehouse_sync_service import sync_service, WebhookSecurityManager


def cmd_lookup(args):
    """Execute customer support stock query."""
    res = sync_service.support_query(args.sku)
    print("\n" + "=" * 60)
    print(f"📦 INVENTORY LOOKUP: {args.sku}")
    print("=" * 60)
    print(f"Item Title:         {res.get('title', 'N/A')}")
    print(f"Category:           {res.get('category', 'N/A')}")
    print(f"Unit Price:         ${res.get('price', 0.0):.2f}")
    print(f"Status:             {res.get('status', 'NOT_FOUND')}")
    print(f"Available Quantity: {res.get('availableQuantity', 0)} units")
    print(f"Total Physical:     {res.get('totalQuantity', 0)} (Reserved: {res.get('totalReserved', 0)})")
    print(f"Can Ship Today?     {'YES ✅' if res.get('canFulfillImmediately') else 'NO ❌'}")
    print(f"Dispatch Window:    {res.get('estimatedDispatchTime', 'N/A')}")
    print(f"Query Latency:      {res.get('queryLatencyMs', 0):.3f} ms")
    print("\n💬 AGENT SUGGESTED SCRIPT:")
    print(f"   \"{res.get('supportScript', '')}\"")
    print("=" * 60 + "\n")


def cmd_stock(args):
    """List all inventory items in the catalog."""
    print("\n" + "=" * 80)
    print(f"{'SKU':<14} | {'STATUS':<12} | {'AVAIL':<6} | {'PHYS':<6} | {'RES':<5} | {'PRODUCT TITLE'}")
    print("-" * 80)
    for sku, item in sync_service.inventory.items():
        status_icon = "🟢" if item.status == "IN_STOCK" else ("🟡" if item.status == "LOW_STOCK" else "🔴")
        print(f"{sku:<14} | {status_icon} {item.status:<9} | {item.available_quantity:<6} | {item.total_quantity:<6} | {item.total_reserved:<5} | {item.title[:30]}")
    print("=" * 80 + "\n")


def cmd_verify_sig(args):
    """Verify or generate HMAC signatures."""
    sec_mgr = WebhookSecurityManager(args.secret)
    computed = sec_mgr.compute_signature(args.payload)
    print(f"Payload:  {args.payload}")
    print(f"Secret:   {args.secret[:6]}...{args.secret[-4:]}")
    print(f"HMAC Sig: {computed}")
    if args.sig:
        valid = sec_mgr.verify_signature(args.payload, args.sig)
        print(f"Target:   {args.sig}")
        print(f"Match?    {'VALID ✅' if valid else 'INVALID ❌'}")


def main():
    parser = argparse.ArgumentParser(description="Northstar Inventory CLI Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # lookup
    p_lookup = subparsers.add_parser("lookup", help="Query stock for support agents")
    p_lookup.add_argument("sku", help="Product SKU (e.g. NSTR-PHN-01)")

    # stock
    subparsers.add_parser("stock", help="List all inventory items")

    # verify-sig
    p_sig = subparsers.add_parser("verify-sig", help="Compute and verify HMAC signatures")
    p_sig.add_argument("--payload", required=True, help="Raw payload string")
    p_sig.add_argument("--secret", default="northstar_wh_sec_9948271038af8831", help="HMAC secret")
    p_sig.add_argument("--sig", help="Optional signature to verify against")

    args = parser.parse_args()

    if args.command == "lookup":
        cmd_lookup(args)
    elif args.command == "stock":
        cmd_stock(args)
    elif args.command == "verify-sig":
        cmd_verify_sig(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
