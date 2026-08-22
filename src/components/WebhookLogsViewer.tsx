/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Repeat, 
  Skull, 
  RefreshCw, 
  Eye, 
  Clock, 
  Layers, 
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { WebhookLogEntry, DLQItem } from '../types';

interface WebhookLogsViewerProps {
  logs: WebhookLogEntry[];
  dlqItems: DLQItem[];
  onRetryDlq: (id: string) => Promise<void>;
  onClearLogs?: () => void;
}

export const WebhookLogsViewer: React.FC<WebhookLogsViewerProps> = ({
  logs,
  dlqItems,
  onRetryDlq,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'dlq'>('logs');
  const [selectedLog, setSelectedLog] = useState<WebhookLogEntry | null>(null);
  const [selectedDlq, setSelectedDlq] = useState<DLQItem | null>(null);
  const [isRetryingId, setIsRetryingId] = useState<string | null>(null);

  const getStatusPill = (status: WebhookLogEntry['status']) => {
    switch (status) {
      case 'PROCESSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            PROCESSED
          </span>
        );
      case 'DROPPED_DUPLICATE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Repeat className="w-3 h-3 text-amber-600" />
            REPLAY_DROPPED
          </span>
        );
      case 'INVALID_SIGNATURE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            INVALID_SIG
          </span>
        );
      case 'DLQ_FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Skull className="w-3 h-3 text-purple-600" />
            DLQ_QUARANTINED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const handleRetry = async (id: string) => {
    setIsRetryingId(id);
    try {
      await onRetryDlq(id);
    } finally {
      setIsRetryingId(null);
    }
  };

  const pendingDlq = dlqItems.filter((i) => i.status === 'PENDING_RETRY');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Sub-tab Switch */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-600 animate-pulse" />
            Webhook Ingestion Audit Logs & Dead Letter Queue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic verification audit trail, idempotency replay tracking, and fault-tolerant DLQ.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Webhook Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('dlq')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'dlq' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dead Letter Queue
            {pendingDlq.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {pendingDlq.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* View 1: Live Webhook Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Product SKU</th>
                  <th className="py-3 px-4">Status & Security</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Details / Idempotency Key</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No webhook logs captured yet in this session. Dispatch an event via Webhook Studio!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-mono">{new Date(log.receivedAt).toLocaleTimeString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {Math.max(0, Math.round((Date.now() - log.receivedAt) / 1000))}s ago
                        </div>
                      </td>

                      {/* Event Type */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {log.eventType}
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                          {log.sku}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusPill(log.status)}</td>

                      {/* Latency */}
                      <td className="py-3 px-4 font-mono text-emerald-700 font-semibold">
                        {log.processingTimeMs} ms
                      </td>

                      {/* Details */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={log.details}>
                        {log.details}
                      </td>

                      {/* Inspect */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                          title="Inspect raw payload & HMAC headers"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Dead Letter Queue (DLQ) */}
      {activeSubTab === 'dlq' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
            <Skull className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Dead Letter Queue (DLQ) Fault Isolation Channel</div>
              <div className="mt-0.5 text-purple-800">
                Poison pill payloads, unparseable JSON, and unrecognized SKUs are isolated here to prevent
                infinite retry loops or worker queue stalls. Operators can review errors and trigger manual replays.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">DLQ Entry ID</th>
                    <th className="py-3 px-4">Received Time</th>
                    <th className="py-3 px-4">Failure Reason</th>
                    <th className="py-3 px-4">Retries</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dlqItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        Dead Letter Queue is empty. No faulted payloads detected!
                      </td>
                    </tr>
                  ) : (
                    dlqItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-purple-900">{item.id}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(item.receivedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-rose-700">{item.failedReason}</td>
                        <td className="py-3 px-4 font-mono">
                          {item.retryCount} / {item.maxRetries}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'EXHAUSTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedDlq(item)}
                              className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              title="Inspect raw payload"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {item.status === 'PENDING_RETRY' && (
                              <button
                                onClick={() => handleRetry(item.id)}
                                disabled={isRetryingId === item.id}
                                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                {isRetryingId === item.id ? 'Replaying...' : 'Replay Event'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detailed Log Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-600" />
                Webhook Audit Inspector: {selectedLog.id}
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500">Security Signature Check:</span>
                <div className="font-bold mt-0.5 flex items-center gap-1">
                  {selectedLog.signatureValid ? (
                    <span className="text-emerald-700">HMAC SHA-256 Valid ✅</span>
                  ) : (
                    <span className="text-rose-700">HMAC Mismatch / Rejected ❌</span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500">Idempotency Key:</span>
                <div className="font-mono font-bold text-slate-900 mt-0.5 truncate">
                  {selectedLog.idempotencyKey}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Raw JSON Ingestion Payload:
              </span>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-60">
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            <div className="text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: DLQ Item Inspector */}
      {selectedDlq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Skull className="w-4 h-4 text-purple-600" />
                Dead Letter Queue Item: {selectedDlq.id}
              </h3>
              <button
                onClick={() => setSelectedDlq(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900">
              <span className="font-bold">Failure Reason:</span> {selectedDlq.failedReason}
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-1">
                Raw Poison Payload:
              </span>
              <pre className="p-3 bg-slate-900 text-rose-400 rounded-xl text-xs font-mono overflow-x-auto max-h-60">
                {selectedDlq.rawPayload}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedDlq(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
              {selectedDlq.status === 'PENDING_RETRY' && (
                <button
                  onClick={() => {
                    handleRetry(selectedDlq.id);
                    setSelectedDlq(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Retry & Replay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
