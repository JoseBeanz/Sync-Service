/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ShieldAlert, 
  Copy, 
  Check, 
  Send, 
  Clock, 
  Zap, 
  Bookmark, 
  Truck,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { SupportQueryResult, InventoryItem } from '../types';

interface SupportToolWidgetProps {
  initialSku?: string;
  items: InventoryItem[];
  onReserveUnit: (sku: string, reason: string) => Promise<void>;
}

export const SupportToolWidget: React.FC<SupportToolWidgetProps> = ({
  initialSku,
  items,
  onReserveUnit,
}) => {
  const [querySku, setQuerySku] = useState(initialSku || 'NSTR-PHN-01');
  const [queryResult, setQueryResult] = useState<SupportQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isReserving, setIsReserving] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  // Auto-run lookup when query or initialSku changes
  useEffect(() => {
    if (initialSku) {
      setQuerySku(initialSku);
      performLookup(initialSku);
    } else {
      performLookup(querySku);
    }
  }, [initialSku]);

  const performLookup = async (sku: string) => {
    if (!sku.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/inventory/lookup?sku=${encodeURIComponent(sku.trim())}`);
      const data: SupportQueryResult = await res.json();
      setQueryResult(data);
    } catch (err) {
      console.error('Failed to query inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(querySku);
  };

  const handleCopyScript = () => {
    if (!queryResult?.supportScript) return;
    navigator.clipboard.writeText(queryResult.supportScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleQuickReserve = async () => {
    if (!queryResult?.sku) return;
    setIsReserving(true);
    try {
      await onReserveUnit(queryResult.sku, 'Support Agent phone order reservation');
      setReservationSuccess(true);
      setTimeout(() => setReservationSuccess(false), 3000);
      // Re-query to refresh numbers
      await performLookup(queryResult.sku);
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Northstar Customer Support Live Stock Verification
            </div>
            <h2 className="text-xl font-bold text-white">
              Support Agent "Is this in stock?" Instant Query Portal
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Answers customer availability questions with 100% real-time accuracy, eliminating
              overselling and outdated 5-minute batch polling discrepancies.
            </p>
          </div>
          <div className="text-right flex md:flex-col items-center md:items-end justify-between gap-1 text-xs">
            <span className="text-slate-400">Target SLA:</span>
            <span className="font-mono font-bold text-emerald-400">&lt; 5ms query response</span>
          </div>
        </div>

        {/* Live Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="mt-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={querySku}
              onChange={(e) => setQuerySku(e.target.value)}
              placeholder="Enter product SKU (e.g., NSTR-PHN-01, NSTR-AUD-02, NSTR-LAP-03) or keyword..."
              className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold flex items-center gap-2 transition cursor-pointer shrink-0"
          >
            <Zap className="w-4 h-4" />
            {isLoading ? 'Checking...' : 'Check Stock'}
          </button>
        </form>

        {/* Quick SKU Chips */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-400">Quick Test SKUs:</span>
          {items.slice(0, 5).map((it) => (
            <button
              key={it.sku}
              type="button"
              onClick={() => {
                setQuerySku(it.sku);
                performLookup(it.sku);
              }}
              className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              {it.sku}
            </button>
          ))}
        </div>
      </div>

      {/* Query Result Display */}
      {queryResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left / Center 2 Cols: Availability Card & Agent Script */}
          <div className="md:col-span-2 space-y-5">
            {/* Primary Status Banner */}
            <div
              className={`p-5 rounded-2xl border ${
                queryResult.status === 'IN_STOCK'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : queryResult.status === 'LOW_STOCK'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : queryResult.status === 'RESERVED_ONLY'
                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {queryResult.status === 'IN_STOCK' && (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  {queryResult.status === 'LOW_STOCK' && (
                    <AlertTriangle className="w-7 h-7 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  {queryResult.status === 'RESERVED_ONLY' && (
                    <ShieldAlert className="w-7 h-7 text-indigo-600 shrink-0 mt-0.5" />
                  )}
                  {queryResult.status === 'OUT_OF_STOCK' && (
                    <XCircle className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
                  )}

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-75">
                      Stock Availability Status
                    </div>
                    <div className="text-xl font-extrabold mt-0.5">
                      {queryResult.status === 'IN_STOCK' && 'YES — In Stock & Ready to Ship'}
                      {queryResult.status === 'LOW_STOCK' && 'LOW STOCK — Few Units Remaining'}
                      {queryResult.status === 'RESERVED_ONLY' && 'RESERVED ONLY — Backorder Required'}
                      {queryResult.status === 'OUT_OF_STOCK' && 'OUT OF STOCK — Restock In Progress'}
                      {!queryResult.found && 'PRODUCT NOT FOUND'}
                    </div>
                    <div className="text-xs mt-1 font-medium">
                      {queryResult.title || 'Unknown Product'}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-black">{queryResult.availableQuantity ?? 0}</div>
                  <div className="text-[11px] font-semibold opacity-75">Units Available</div>
                </div>
              </div>
            </div>

            {/* Customer Support Ready Script */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-rose-600" />
                  Agent Response Script (Verified Live Data)
                </h3>
                <button
                  onClick={handleCopyScript}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy to Clipboard
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 font-sans leading-relaxed relative">
                <span className="text-slate-400 font-serif text-2xl absolute -top-1 left-2">“</span>
                <p className="pl-4">{queryResult.supportScript}</p>
              </div>

              {/* Action Buttons for Support Rep */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleQuickReserve}
                  disabled={isReserving || (queryResult.availableQuantity || 0) <= 0}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Bookmark className="w-4 h-4" />
                  {isReserving ? 'Holding unit...' : 'Hold / Reserve 1 Unit for Customer'}
                </button>

                {reservationSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold animate-pulse flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Unit Reserved!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Logistics & Telemetry Breakdown */}
          <div className="space-y-4">
            {/* Fulfillment & Dispatch Info */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-slate-600" />
                Fulfillment Logistics
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Product SKU:</span>
                  <span className="font-mono font-bold text-slate-900">{queryResult.sku}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Physical Stock Total:</span>
                  <span className="font-semibold text-slate-800">{queryResult.totalQuantity ?? 0} units</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Reserved for Orders:</span>
                  <span className="font-semibold text-amber-600">{queryResult.totalReserved ?? 0} units</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Immediate Dispatch:</span>
                  <span
                    className={`font-semibold ${
                      queryResult.canFulfillImmediately ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {queryResult.canFulfillImmediately ? 'Eligible' : 'Not Eligible'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Dispatch Estimate:</span>
                  <span className="font-medium text-slate-800">{queryResult.estimatedDispatchTime}</span>
                </div>
              </div>
            </div>

            {/* Performance Telemetry */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-3">
              <h4 className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Query Telemetry
              </h4>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Response Latency:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {queryResult.queryLatencyMs} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cache Architecture:</span>
                  <span className="text-slate-200">Zero-Staleness Push Cache</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Synced:</span>
                  <span className="text-slate-200">
                    {queryResult.lastSyncedAgoSec}s ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
