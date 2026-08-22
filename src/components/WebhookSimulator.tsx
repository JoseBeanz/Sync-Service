/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Zap, 
  ShieldAlert, 
  Repeat, 
  Skull, 
  Send, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  Layers,
  Flame
} from 'lucide-react';
import { InventoryItem } from '../types';
import { DEFAULT_WEBHOOK_SECRET } from '../data/initialData';

interface WebhookSimulatorProps {
  items: InventoryItem[];
  onTriggerSimulation: (mode: string, params?: any) => Promise<any>;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  items,
  onTriggerSimulation,
}) => {
  const [selectedSku, setSelectedSku] = useState(items[0]?.sku || 'NSTR-PHN-01');
  const [eventType, setEventType] = useState<'inventory.updated' | 'inventory.restocked' | 'stock.reserved'>('inventory.restocked');
  const [deltaQuantity, setDeltaQuantity] = useState<number>(15);
  const [reason, setReason] = useState<string>('Inbound container pallet dock receipt');
  const [burstCount, setBurstCount] = useState<number>(10);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Custom Raw JSON payload state
  const [customPayload, setCustomPayload] = useState<string>(
    JSON.stringify(
      {
        eventId: `evt_${Date.now()}`,
        eventType: 'inventory.updated',
        sku: 'NSTR-PHN-01',
        sourceWarehouseId: 'WH-CENTRAL',
        deltaQuantity: 8,
        reason: 'Custom warehouse cycle count scan',
      },
      null,
      2
    )
  );

  const handleSimulatePreset = async (mode: string) => {
    setIsSending(true);
    try {
      const res = await onTriggerSimulation(mode, {
        sku: selectedSku,
        eventType,
        delta: deltaQuantity,
        reason,
        count: mode === 'burst' ? burstCount : 1,
      });
      setLastResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Studio Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-rose-600" />
              Warehouse Webhook Ingestion & Security Simulator Studio
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Test live push events, HMAC SHA-256 signature verification, idempotency replay guards,
              and Dead Letter Queue (DLQ) isolation.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono">
            Secret: <span className="font-bold text-slate-900">{DEFAULT_WEBHOOK_SECRET.slice(0, 14)}...</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Presets & Attack Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Quick Event Generator & Attack Suites */}
        <div className="lg:col-span-2 space-y-6">
          {/* Standard Event Configurator */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-600" />
              1. Standard Warehouse Event Dispatcher
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Product SKU</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 font-mono bg-white"
                >
                  {items.map((it) => (
                    <option key={it.sku} value={it.sku}>
                      {it.sku} ({it.title.slice(0, 24)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as any)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="inventory.restocked">inventory.restocked (+Stock)</option>
                  <option value="stock.reserved">stock.reserved (Order Hold)</option>
                  <option value="inventory.updated">inventory.updated (Delta Change)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {eventType === 'stock.reserved' ? 'Reserved Units' : 'Delta Quantity (+/-)'}
                </label>
                <input
                  type="number"
                  value={deltaQuantity}
                  onChange={(e) => setDeltaQuantity(Number(e.target.value))}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 font-mono"
                  placeholder="15"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Manifest Memo</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300"
                placeholder="e.g. Inbound dock shipment #BL-9914"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={isSending}
                onClick={() => handleSimulatePreset('valid_update')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Dispatching...' : 'Dispatch Signed Webhook (Valid HMAC)'}
              </button>

              <span className="text-[11px] text-slate-400">
                Headers: <code className="font-mono text-slate-600">X-Northstar-Signature</code>, <code className="font-mono text-slate-600">X-Idempotency-Key</code>
              </span>
            </div>
          </div>

          {/* Meridian Pivot Security & Edge-Case Testing Cards */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              2. Edge Cases & Attack Simulation Suite (Day 4 Meridian Pivot)
            </h3>
            <p className="text-xs text-slate-500">
              Verify that the service handles network retries, malicious signature tampering, and poison pills securely.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Test 1: Tampered Signature Attack */}
              <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Tampered Signature
                  </div>
                  <p className="text-[11px] text-rose-700/80 mt-1">
                    Dispatches modified payload with fake HMAC signature to verify HTTP 401 rejection.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSimulatePreset('tampered_signature')}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Test Tamper Attack
                </button>
              </div>

              {/* Test 2: Duplicate Replay Attack */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Repeat className="w-4 h-4 text-amber-600" />
                    Duplicate Replay
                  </div>
                  <p className="text-[11px] text-amber-700/80 mt-1">
                    Sends duplicate <code className="font-mono">X-Idempotency-Key</code> to verify no double-counting occurs.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSimulatePreset('duplicate_replay')}
                  className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Test Replay Guard
                </button>
              </div>

              {/* Test 3: Poison Pill to DLQ */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800">
                    <Skull className="w-4 h-4 text-purple-600" />
                    Poison Pill (DLQ)
                  </div>
                  <p className="text-[11px] text-purple-700/80 mt-1">
                    Dispatches unknown ghost SKU payload to verify safe Dead Letter Queue quarantine.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSimulatePreset('poison_dlq')}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  Test Poison Pill
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Batch Burst Simulation & Live Response Inspector */}
        <div className="space-y-6">
          {/* High-Volume Burst Simulator */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              High-Throughput Burst Mode
            </div>
            <h4 className="text-sm font-bold text-white">Simulate Warehouse Shift Scan Burst</h4>
            <p className="text-xs text-slate-300">
              Fires multiple signed webhook events concurrently to test sync engine throughput and queue latency.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Concurrent Event Count: <span className="font-bold text-amber-400">{burstCount}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={burstCount}
                  onChange={(e) => setBurstCount(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              <button
                type="button"
                disabled={isSending}
                onClick={() => handleSimulatePreset('burst')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                {isSending ? 'Simulating Burst...' : `Fire Burst (${burstCount} Events)`}
              </button>
            </div>
          </div>

          {/* Last Simulation Result Inspector */}
          {lastResult && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-slate-600" />
                Simulation Dispatch Result
              </h4>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
