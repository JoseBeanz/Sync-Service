/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveInventoryTable } from './components/LiveInventoryTable';
import { SupportToolWidget } from './components/SupportToolWidget';
import { WebhookSimulator } from './components/WebhookSimulator';
import { WebhookLogsViewer } from './components/WebhookLogsViewer';
import { ArchitecturePivotViewer } from './components/ArchitecturePivotViewer';
import { BlockerJournalViewer } from './components/BlockerJournalViewer';
import { AdaptabilityIndexViewer } from './components/AdaptabilityIndexViewer';
import { PythonSuiteViewer } from './components/PythonSuiteViewer';
import { KioskServiceView } from './components/KioskServiceView';

import {
  InventoryItem,
  WebhookLogEntry,
  DLQItem,
  SystemMetrics,
  KioskAttendee,
  KioskPrintJob,
  KioskPrinterDevice,
  KioskScanResponse
} from './types';
import { INITIAL_INVENTORY, INITIAL_ATTENDEES, INITIAL_PRINTERS } from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('kiosk');
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);
  const [dlqItems, setDlqItems] = useState<DLQItem[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [selectedSkuForSupport, setSelectedSkuForSupport] = useState<string>('NSTR-PHN-01');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'alert' } | null>(null);

  // Kiosk State
  const [kioskAttendees, setKioskAttendees] = useState<KioskAttendee[]>(INITIAL_ATTENDEES);
  const [kioskPrinters, setKioskPrinters] = useState<KioskPrinterDevice[]>(INITIAL_PRINTERS);
  const [kioskPrintJobs, setKioskPrintJobs] = useState<KioskPrintJob[]>([]);

  const showToast = (message: string, type: 'success' | 'alert' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      const [invRes, logsRes, dlqRes, metricsRes, kioskAttRes, kioskPrintRes, kioskJobsRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/webhooks/logs'),
        fetch('/api/webhooks/dlq'),
        fetch('/api/metrics'),
        fetch('/api/kiosk/attendees'),
        fetch('/api/kiosk/printers'),
        fetch('/api/kiosk/jobs'),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        if (invData.items) setItems(invData.items);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        if (logsData.logs) setWebhookLogs(logsData.logs);
      }
      if (dlqRes.ok) {
        const dlqData = await dlqRes.json();
        if (dlqData.items) setDlqItems(dlqData.items);
      }
      if (metricsRes.ok) {
        const metData = await metricsRes.json();
        if (metData.metrics) setMetrics(metData.metrics);
      }
      if (kioskAttRes.ok) {
        const attData = await kioskAttRes.json();
        if (attData.attendees) setKioskAttendees(attData.attendees);
      }
      if (kioskPrintRes.ok) {
        const prData = await kioskPrintRes.json();
        if (prData.printers) setKioskPrinters(prData.printers);
      }
      if (kioskJobsRes.ok) {
        const jobsData = await kioskJobsRes.json();
        if (jobsData.jobs) setKioskPrintJobs(jobsData.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Setup SSE live stream
    const eventSource = new EventSource('/api/events/stream');

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
    });

    eventSource.addEventListener('inventory_updated', (event) => {
      try {
        const updatedItem: InventoryItem = JSON.parse(event.data);
        setItems((prev) => {
          const index = prev.findIndex((i) => i.sku === updatedItem.sku);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedItem;
            return next;
          }
          return [updatedItem, ...prev];
        });
      } catch (err) {
        console.error('Error parsing SSE inventory_updated:', err);
      }
    });

    eventSource.addEventListener('webhook_received', (event) => {
      try {
        const logEntry: WebhookLogEntry = JSON.parse(event.data);
        setWebhookLogs((prev) => [logEntry, ...prev.slice(0, 99)]);
      } catch (err) {
        console.error('Error parsing SSE webhook_received:', err);
      }
    });

    eventSource.addEventListener('dlq_updated', (event) => {
      try {
        const dlqEntry: DLQItem = JSON.parse(event.data);
        setDlqItems((prev) => {
          const idx = prev.findIndex((d) => d.id === dlqEntry.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = dlqEntry;
            return copy;
          }
          return [dlqEntry, ...prev];
        });
      } catch (err) {
        console.error('Error parsing SSE dlq_updated:', err);
      }
    });

    // KIOSK SSE EVENT LISTENERS
    eventSource.addEventListener('kiosk_attendee_updated', (event) => {
      try {
        const updatedAtt: KioskAttendee = JSON.parse(event.data);
        setKioskAttendees((prev) => {
          const idx = prev.findIndex((a) => a.id === updatedAtt.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updatedAtt;
            return copy;
          }
          return [updatedAtt, ...prev];
        });
      } catch (err) {
        console.error('Error parsing kiosk_attendee_updated:', err);
      }
    });

    eventSource.addEventListener('kiosk_job_queued', (event) => {
      try {
        const newJob: KioskPrintJob = JSON.parse(event.data);
        setKioskPrintJobs((prev) => [newJob, ...prev]);
        showToast(`Print Job #${newJob.jobId} enqueued for ${newJob.attendeeName}! (Pending Webhook)`);
      } catch (err) {
        console.error('Error parsing kiosk_job_queued:', err);
      }
    });

    eventSource.addEventListener('kiosk_job_updated', (event) => {
      try {
        const updatedJob: KioskPrintJob = JSON.parse(event.data);
        setKioskPrintJobs((prev) => {
          const idx = prev.findIndex((j) => j.jobId === updatedJob.jobId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updatedJob;
            return copy;
          }
          return [updatedJob, ...prev];
        });
      } catch (err) {
        console.error('Error parsing kiosk_job_updated:', err);
      }
    });

    eventSource.addEventListener('kiosk_print_completed', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.job) {
          setKioskPrintJobs((prev) => {
            const idx = prev.findIndex((j) => j.jobId === data.job.jobId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = data.job;
              return copy;
            }
            return [data.job, ...prev];
          });
        }
        showToast(`Badge Printed & Checked In: ${data.attendee?.name || 'Attendee'}!`);
      } catch (err) {
        console.error('Error parsing kiosk_print_completed:', err);
      }
    });

    eventSource.addEventListener('kiosk_printers_updated', (event) => {
      try {
        const printersData: KioskPrinterDevice[] = JSON.parse(event.data);
        setKioskPrinters(printersData);
      } catch (err) {
        console.error('Error parsing kiosk_printers_updated:', err);
      }
    });

    eventSource.addEventListener('kiosk_duplicate_blocked', (event) => {
      try {
        const data = JSON.parse(event.data);
        showToast(`Duplicate Scan Blocked: ${data.attendee?.name} already checked in!`, 'alert');
      } catch (err) {
        console.error('Error parsing kiosk_duplicate_blocked:', err);
      }
    });

    eventSource.addEventListener('kiosk_reset', () => {
      fetchData();
      showToast('Kiosk attendees and printers reset to morning baseline');
    });

    eventSource.addEventListener('system_reset', () => {
      fetchData();
      showToast('System baseline reset to clean seed state');
    });

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchData]);

  // KIOSK HANDLERS
  const handleKioskScanBadge = async (ticketCode: string, printerId = 'PRINTER-01'): Promise<KioskScanResponse> => {
    try {
      const res = await fetch('/api/kiosk/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode, printerId }),
      });
      const data: KioskScanResponse = await res.json();
      if (!data.success && data.isDuplicate) {
        showToast(data.message, 'alert');
      }
      return data;
    } catch (err: any) {
      console.error('Kiosk scan failed:', err);
      return {
        success: false,
        actionTaken: 'ATTENDEE_NOT_FOUND',
        message: err.message || 'Scan network request failed',
        isDuplicate: false,
        model: 'ASYNC_MESSAGE_QUEUE_WEBHOOK',
      };
    }
  };

  const handleResetKiosk = async () => {
    try {
      await fetch('/api/kiosk/reset', { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Reset kiosk failed:', err);
    }
  };

  // Handlers
  const handleQuickSimulate = async (mode: string) => {
    try {
      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, sku: 'NSTR-PHN-01', delta: 10 }),
      });
      const data = await res.json();
      if (mode === 'tampered_signature') {
        showToast('Attack Blocked: Invalid HMAC SHA-256 Signature rejected (HTTP 401)', 'alert');
      } else {
        showToast('Webhook event dispatched and synced in real time!');
      }
      fetchData();
      return data;
    } catch (err) {
      console.error('Simulation failed:', err);
    }
  };

  const handleManualAdjust = async (
    sku: string,
    deltaQuantity: number,
    reservedDelta: number,
    reason: string,
    warehouseId: string
  ) => {
    try {
      const res = await fetch('/api/inventory/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku, deltaQuantity, reservedDelta, reason, warehouseId }),
      });
      if (res.ok) {
        showToast(`Stock updated for SKU ${sku}`);
        fetchData();
      }
    } catch (err) {
      console.error('Manual adjust failed:', err);
    }
  };

  const handleReserveUnit = async (sku: string, reason: string) => {
    await handleManualAdjust(sku, 0, 1, reason, 'WH-CENTRAL');
  };

  const handleRetryDlq = async (id: string) => {
    try {
      const res = await fetch('/api/webhooks/dlq/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('DLQ Item Replayed successfully!');
      } else {
        showToast(data.message || 'Retry failed', 'alert');
      }
      fetchData();
    } catch (err) {
      console.error('DLQ retry failed:', err);
    }
  };

  const handleTriggerLegacyPoll = async () => {
    try {
      const res = await fetch('/api/inventory/legacy-poll', { method: 'POST' });
      const data = await res.json();
      showToast('Legacy Day 3 Polling cycle simulated (Notice: Deprecated)');
      fetchData();
      return data;
    } catch (err) {
      console.error('Legacy poll error:', err);
    }
  };

  const handleResetSystem = async () => {
    if (confirm('Reset inventory and audit logs to initial sprint baseline?')) {
      await fetch('/api/inventory/reset', { method: 'POST' });
      fetchData();
    }
  };

  const pendingDlqCount = dlqItems.filter((i) => i.status === 'PENDING_RETRY').length;
  const kioskPendingCount = kioskPrintJobs.filter((j) => j.status === 'QUEUED' || j.status === 'PRINTING').length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        onQuickSimulate={handleQuickSimulate}
        pendingDlqCount={pendingDlqCount}
        kioskPendingCount={kioskPendingCount}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-slate-900 text-emerald-400 border-slate-800'
                : 'bg-rose-900 text-rose-200 border-rose-800'
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'kiosk' && (
          <KioskServiceView
            attendees={kioskAttendees}
            printers={kioskPrinters}
            printJobs={kioskPrintJobs}
            onScanBadge={handleKioskScanBadge}
            onResetKiosk={handleResetKiosk}
            onRefresh={fetchData}
          />
        )}

        {activeTab === 'inventory' && (
          <LiveInventoryTable
            items={items}
            onManualAdjust={handleManualAdjust}
            onRefresh={fetchData}
            onSelectForSupportQuery={(sku) => {
              setSelectedSkuForSupport(sku);
              setActiveTab('support');
            }}
          />
        )}

        {activeTab === 'support' && (
          <SupportToolWidget
            initialSku={selectedSkuForSupport}
            items={items}
            onReserveUnit={handleReserveUnit}
          />
        )}

        {activeTab === 'simulator' && (
          <WebhookSimulator
            items={items}
            onTriggerSimulation={handleQuickSimulate}
          />
        )}

        {activeTab === 'logs' && (
          <WebhookLogsViewer
            logs={webhookLogs}
            dlqItems={dlqItems}
            onRetryDlq={handleRetryDlq}
          />
        )}

        {activeTab === 'python' && <PythonSuiteViewer />}

        {activeTab === 'pivot' && (
          <ArchitecturePivotViewer
            metrics={metrics}
            onTriggerLegacyPoll={handleTriggerLegacyPoll}
          />
        )}

        {activeTab === 'blockers' && <BlockerJournalViewer />}

        {activeTab === 'adaptability' && <AdaptabilityIndexViewer />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-700">Northstar Retail Co.</span> • Sprint 2 Meridian Pivot Live Sync Deliverables
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleResetSystem}
              className="text-slate-500 hover:text-rose-600 transition cursor-pointer"
            >
              Reset Seed Baseline
            </button>
            <span>•</span>
            <span className="text-slate-400">Node.js + Python Dual Sync Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
