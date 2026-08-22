/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  QrCode, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  Sparkles, 
  Layers, 
  RotateCcw, 
  UserCheck, 
  Scan, 
  Cpu, 
  Radio, 
  Send,
  Sliders,
  Award,
  Hash,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { KioskAttendee, KioskPrintJob, KioskPrinterDevice, KioskScanResponse } from '../types';

interface KioskServiceViewProps {
  attendees: KioskAttendee[];
  printers: KioskPrinterDevice[];
  printJobs: KioskPrintJob[];
  onScanBadge: (ticketCode: string, printerId?: string) => Promise<KioskScanResponse>;
  onResetKiosk: () => Promise<void>;
  onRefresh: () => void;
}

export const KioskServiceView: React.FC<KioskServiceViewProps> = ({
  attendees,
  printers,
  printJobs,
  onScanBadge,
  onResetKiosk,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'kiosk' | 'queue' | 'attendees' | 'architecture'>('kiosk');
  const [inputCode, setInputCode] = useState<string>('SOL-ATT-001');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('PRINTER-01');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanResult, setLastScanResult] = useState<KioskScanResponse | null>(null);
  const [activeAttendeeForPreview, setActiveAttendeeForPreview] = useState<KioskAttendee>(attendees[0]);
  const [legacySyncLoading, setLegacySyncLoading] = useState<boolean>(false);
  const [legacySyncResult, setLegacySyncResult] = useState<any>(null);

  const handleScan = async (codeToScan: string) => {
    setIsScanning(true);
    try {
      const res = await onScanBadge(codeToScan, selectedPrinter);
      setLastScanResult(res);
      if (res.attendee) {
        setActiveAttendeeForPreview(res.attendee);
      }
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRunLegacySync = async (ticketCode: string) => {
    setLegacySyncLoading(true);
    try {
      const res = await fetch('/api/kiosk/legacy-sync-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode }),
      });
      const data = await res.json();
      setLegacySyncResult(data);
      onRefresh();
    } catch (err) {
      console.error('Legacy scan error:', err);
    } finally {
      setLegacySyncLoading(false);
    }
  };

  const checkedInCount = attendees.filter((a) => a.checkInStatus === 'CHECKED_IN').length;
  const pendingCount = attendees.filter((a) => a.checkInStatus === 'PRINT_QUEUED' || a.checkInStatus === 'PRINTING').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Solstice Kiosk Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Solstice Events Co. • Tech Conference 2026 Kiosk Service
            </div>
            <h2 className="text-xl font-bold text-white">
              Event Check-In Kiosk & Asynchronous Badge Printer Fleet
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Meridian Pivot Solution: Non-blocking scan publishing to vendor message queue,
              HMAC-verified completion webhooks, real-time pending visualizer, and strict duplicate-scan protection.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Checked In</span>
              <span className="text-base font-bold text-emerald-400">
                {checkedInCount} / {attendees.length}
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">In Queue</span>
              <span className={`text-base font-bold ${pendingCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
                {pendingCount}
              </span>
            </div>
            <button
              onClick={onResetKiosk}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Reset Kiosk state"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'kiosk' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="w-4 h-4" />
            Interactive Kiosk Terminal
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'queue' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            Printer Fleet & Message Queue ({printJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('attendees')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'attendees' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Attendee Directory & Test Cases ({attendees.length})
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'architecture' ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Architectural Pivot Comparison
          </button>
        </div>
      </div>

      {/* VIEW 1: INTERACTIVE KIOSK TERMINAL */}
      {activeTab === 'kiosk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Scanner Station Simulator */}
          <div className="lg:col-span-7 space-y-6">
            {/* Virtual QR Code Scanner Unit */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-rose-600" />
                  Kiosk Optical Scanner Terminal
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  SCANNER STATUS: READY
                </span>
              </div>

              {/* Code Input & Scan Trigger */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="Enter Ticket Code (e.g. SOL-ATT-001) or Scan QR..."
                      className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                    />
                    <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>
                  <button
                    onClick={() => handleScan(inputCode)}
                    disabled={isScanning}
                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Scan className="w-4 h-4" />
                    {isScanning ? 'Scanning...' : 'Scan Badge'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Routing Destination:</span>
                  <select
                    value={selectedPrinter}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                    className="p-1.5 rounded-lg border border-slate-300 text-xs font-mono bg-white"
                  >
                    {printers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Scenario Scanners (Required by Assignment handout) */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Quick Test Scenarios (Client Handout Verification)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Case 1 */}
                  <button
                    onClick={() => {
                      setInputCode('SOL-ATT-001');
                      handleScan('SOL-ATT-001');
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">1. Alex Rivera (Speaker)</div>
                      <div className="text-[10px] text-slate-500">First-time scan & async print</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      SOL-ATT-001
                    </span>
                  </button>

                  {/* Case 2 */}
                  <button
                    onClick={() => {
                      setInputCode('SOL-ATT-002');
                      handleScan('SOL-ATT-002');
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">2. Jordan Lee (Attendee)</div>
                      <div className="text-[10px] text-slate-500">Standard All-Access check-in</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      SOL-ATT-002
                    </span>
                  </button>

                  {/* Case 3 */}
                  <button
                    onClick={() => {
                      setInputCode('SOL-ATT-003');
                      handleScan('SOL-ATT-003');
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">3. Dr. Samantha Vance</div>
                      <div className="text-[10px] text-slate-500">VIP Speaker priority pass</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                      SOL-ATT-003
                    </span>
                  </button>

                  {/* Case 4: Duplicate Scan Attack Test */}
                  <button
                    onClick={() => {
                      setInputCode('SOL-ATT-002');
                      handleScan('SOL-ATT-002');
                    }}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-left transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-rose-900 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                        4. Test Duplicate Scan
                      </div>
                      <div className="text-[10px] text-rose-700">Scan Jordan Lee again</div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                      Test Rejection
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Kiosk State Display Panel */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  Kiosk Customer-Facing Display Screen
                </span>
                <span className="text-[10px] font-mono text-slate-400">Terminal #01</span>
              </div>

              {/* Status Screen Content */}
              {activeAttendeeForPreview.checkInStatus === 'NOT_CHECKED_IN' && (
                <div className="py-8 text-center space-y-3">
                  <Scan className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
                  <div className="text-base font-bold text-white">Please Scan Your Conference QR Code</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hold your registration confirmation QR code or badge voucher in front of the scanner.
                  </p>
                </div>
              )}

              {(activeAttendeeForPreview.checkInStatus === 'PRINT_QUEUED' ||
                activeAttendeeForPreview.checkInStatus === 'PRINTING') && (
                <div className="py-6 bg-slate-800/80 rounded-xl p-5 border border-amber-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-spin">
                    <Printer className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                      STATUS: PENDING CONFIRMATION
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1.5">
                      Printing Badge #{activeAttendeeForPreview.currentJobId}...
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Job dispatched to badge printer queue. UI reflecting pending state until webhook callback confirms completion.
                    </p>
                  </div>

                  {/* Animated Progress Bar */}
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-400 to-rose-500 h-full w-3/4 animate-pulse" />
                  </div>
                </div>
              )}

              {activeAttendeeForPreview.checkInStatus === 'CHECKED_IN' && (
                <div className="py-6 bg-emerald-950/60 rounded-xl p-5 border border-emerald-500/40 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold tracking-wider uppercase">
                      STATUS: CHECKED IN & PRINTED
                    </span>
                    <h4 className="text-lg font-bold text-white mt-1.5">
                      Welcome to Solstice 2026, {activeAttendeeForPreview.name}!
                    </h4>
                    <p className="text-xs text-emerald-200 mt-1">
                      Your personalized conference badge has printed successfully at {selectedPrinter}. Please collect your lanyard!
                    </p>
                  </div>
                </div>
              )}

              {lastScanResult && lastScanResult.actionTaken === 'ALREADY_CHECKED_IN' && (
                <div className="py-4 bg-rose-950/60 rounded-xl p-4 border border-rose-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    DUPLICATE-SCAN GUARD ACTIVATED
                  </div>
                  <p className="text-xs text-rose-200">
                    {lastScanResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: High-Fidelity Physical Badge Visualizer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-4 h-4 text-rose-600" />
                  Physical Badge Output Preview
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeAttendeeForPreview.ticketCode}
                </span>
              </div>

              {/* Graphical Badge Preview Card */}
              <div className="p-1 bg-slate-200 rounded-2xl shadow-inner max-w-sm mx-auto">
                {/* Lanyard Strap Visualizer */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 h-6 rounded-t-md shadow-xs flex items-center justify-center text-[9px] font-bold text-white uppercase"
                    style={{ backgroundColor: activeAttendeeForPreview.lanyardColor }}
                  >
                    SOLSTICE
                  </div>
                  <div className="w-5 h-2.5 bg-slate-400 rounded-b-xs mb-1" />
                </div>

                {/* Badge Body */}
                <div className="bg-white rounded-xl border border-slate-300 shadow-md p-5 text-center relative overflow-hidden space-y-4">
                  {/* Top Header Ribbon */}
                  <div 
                    className="py-1.5 px-3 rounded-lg text-[11px] font-black tracking-wider uppercase text-white shadow-xs"
                    style={{ backgroundColor: activeAttendeeForPreview.lanyardColor }}
                  >
                    {activeAttendeeForPreview.badgeType}
                  </div>

                  {/* Conference Logo */}
                  <div className="text-xs font-black text-slate-900 tracking-tight">
                    SOLSTICE TECH CONF 2026
                  </div>

                  {/* Attendee Avatar & Details */}
                  <div className="space-y-1">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-bold text-lg text-slate-700 mx-auto">
                      {activeAttendeeForPreview.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div className="text-base font-black text-slate-900 pt-1">
                      {activeAttendeeForPreview.name}
                    </div>
                    <div className="text-xs font-semibold text-rose-600">
                      {activeAttendeeForPreview.company}
                    </div>
                    <div className="text-[11px] text-slate-500 max-w-xs mx-auto">
                      {activeAttendeeForPreview.title}
                    </div>
                  </div>

                  {/* Bottom Barcode & Verification Hologram */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-left">
                    <div>
                      <span className="text-[9px] text-slate-400 block">SECURITY HASH</span>
                      <span className="text-[10px] font-mono font-bold text-slate-800">
                        {activeAttendeeForPreview.qrCode.slice(0, 14)}...
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 opacity-80" />
                  </div>
                </div>
              </div>

              {/* Attendee Metadata Breakdown */}
              <div className="text-xs space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Check-In Status:</span>
                  <span className={`font-bold ${
                    activeAttendeeForPreview.checkInStatus === 'CHECKED_IN'
                      ? 'text-emerald-600'
                      : activeAttendeeForPreview.checkInStatus === 'PRINT_QUEUED' || activeAttendeeForPreview.checkInStatus === 'PRINTING'
                      ? 'text-amber-600'
                      : 'text-slate-600'
                  }`}>
                    {activeAttendeeForPreview.checkInStatus}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Duplicate Scan Attempts:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {activeAttendeeForPreview.duplicateScanCount}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Badge Printed At:</span>
                  <span className="font-mono text-slate-800">
                    {activeAttendeeForPreview.badgePrintedAt
                      ? new Date(activeAttendeeForPreview.badgePrintedAt).toLocaleTimeString()
                      : 'Not Printed Yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: PRINTER FLEET & ASYNC MESSAGE QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          {/* Printer Fleet Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {printers.map((printer) => (
              <div
                key={printer.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{printer.name}</h4>
                      <span className="text-[10px] text-slate-400">{printer.location}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      printer.status === 'ONLINE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : printer.status === 'PRINTING'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {printer.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Prints</span>
                    <span className="font-mono font-bold text-slate-900">{printer.totalPrintsCount} badges</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Avg Duration</span>
                    <span className="font-mono font-bold text-emerald-700">{printer.avgDurationMs} ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Async Message Queue Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-rose-600" />
                  Vendor Badge Printer Message Queue & Callback Log
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Async message broker: print requests published to queue, consumed by printer hardware, followed by webhook callback.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Job ID</th>
                    <th className="py-3 px-4">Attendee</th>
                    <th className="py-3 px-4">Ticket Tier</th>
                    <th className="py-3 px-4">Printer</th>
                    <th className="py-3 px-4">Queue Status</th>
                    <th className="py-3 px-4">Webhook Callback</th>
                    <th className="py-3 px-4">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        No print jobs in queue yet. Scan an attendee badge from the Kiosk tab!
                      </td>
                    </tr>
                  ) : (
                    printJobs.map((job) => (
                      <tr key={job.jobId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{job.jobId}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{job.attendeeName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {job.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">{job.printerId}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : job.status === 'PRINTING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {job.webhookDelivered ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Callback Received
                            </span>
                          ) : (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Awaiting Webhook
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {job.durationMs ? `${job.durationMs} ms` : 'In progress...'}
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

      {/* VIEW 3: ATTENDEE DIRECTORY & TEST CASES */}
      {activeTab === 'attendees' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-rose-600" />
                Conference Registration Roster (Test Attendees Required by Client)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Inspect test attendees, check-in timestamps, and duplicate scan counts.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ticket Code</th>
                  <th className="py-3 px-4">Attendee Name</th>
                  <th className="py-3 px-4">Company / Title</th>
                  <th className="py-3 px-4">Tier & Badge</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duplicate Rejections</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendees.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">{att.ticketCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{att.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{att.company}</div>
                      <div className="text-[10px] text-slate-400">{att.title}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                        style={{ backgroundColor: att.lanyardColor }}
                      >
                        {att.badgeType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          att.checkInStatus === 'CHECKED_IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : att.checkInStatus === 'PRINT_QUEUED' || att.checkInStatus === 'PRINTING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {att.checkInStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-600">
                      {att.duplicateScanCount > 0 ? `${att.duplicateScanCount} Blocked` : '0'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          setInputCode(att.ticketCode);
                          handleScan(att.ticketCode);
                          setActiveTab('kiosk');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                      >
                        Scan at Kiosk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: ARCHITECTURAL PIVOT COMPARISON */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Deprecated Synchronous Model */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Day 3: Synchronous REST Printer API (DEPRECATED)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  DEPRECATED
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Staff scans QR code → Kiosk holds HTTP connection open for 2-5 seconds → Waits for printer hardware before unlocking UI.
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-bold">Why the Vendor Deprecated It:</div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                  <li>Kiosk terminals froze when physical printers ran low on paper or jammed.</li>
                  <li>HTTP connection timeouts caused double-printing when staff re-pressed buttons.</li>
                  <li>Could not scale during 8:30 AM morning conference rush (500+ attendees).</li>
                </ul>
              </div>

              <button
                onClick={() => handleRunLegacySync('SOL-ATT-001')}
                disabled={legacySyncLoading}
                className="w-full py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${legacySyncLoading ? 'animate-spin' : ''}`} />
                {legacySyncLoading ? 'Simulating 2.8s blocking freeze...' : 'Simulate Legacy Synchronous Scan (Test)'}
              </button>

              {legacySyncResult && (
                <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl text-[10px] font-mono">
                  {JSON.stringify(legacySyncResult, null, 2)}
                </pre>
              )}
            </div>

            {/* Shipped Asynchronous Webhook Pivot Model */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-500 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-600" />
                  Day 5: Asynchronous Message Queue + Webhook Push
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ACTIVE PIVOT SPEC
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Staff scans QR code → Kiosk publishes message onto queue → Returns HTTP 202 Accepted immediately → Vendor delivers webhook callback on print completion.
              </p>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <div className="font-bold">Key Architectural Guarantees:</div>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-emerald-800">
                  <li><strong>Zero UI Freeze</strong>: Kiosk acknowledges in <strong>0.5ms</strong> and shows real-time pending progress.</li>
                  <li><strong>Duplicate-Scan Protection</strong>: Rejects secondary scans even if webhooks arrive out of order.</li>
                  <li><strong>Fault Isolation</strong>: Printer hardware delays never block other kiosks in the venue fleet.</li>
                </ul>
              </div>

              <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs flex items-center justify-between">
                <span>Scan Ingestion Latency:</span>
                <span className="font-mono font-bold">&lt; 1.0 ms response (HTTP 202)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
