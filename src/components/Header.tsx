/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  Zap, 
  Terminal, 
  HelpCircle, 
  FileText, 
  Layers, 
  Database,
  Radio,
  QrCode,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  onQuickSimulate: (mode: string) => void;
  pendingDlqCount: number;
  kioskPendingCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  onQuickSimulate,
  pendingDlqCount,
  kioskPendingCount = 0,
}) => {
  const tabs = [
    { id: 'kiosk', label: 'Check-In Kiosk (Solstice)', icon: QrCode, badge: kioskPendingCount > 0 ? `${kioskPendingCount} printing` : undefined, highlight: true },
    { id: 'inventory', label: 'Live Stock Grid', icon: Database },
    { id: 'support', label: 'Support Stock Tool', icon: HelpCircle },
    { id: 'simulator', label: 'Webhook Studio', icon: Zap },
    { id: 'logs', label: 'Audit Logs & DLQ', icon: Radio, badge: pendingDlqCount > 0 ? pendingDlqCount : undefined },
    { id: 'python', label: 'Python Suite & Tests', icon: Terminal },
    { id: 'pivot', label: 'Scope Delta (Assgn 2)', icon: Layers },
    { id: 'blockers', label: 'Blocker Log (Assgn 1)', icon: FileText },
    { id: 'adaptability', label: 'Adaptability (Assgn 3)', icon: ShieldCheck },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Client Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-md shadow-rose-950/40">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-lg tracking-tight text-white">Live Sync & Check-In Kiosk Engine</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                Solstice Events & Northstar
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/80">
                Meridian Pivot Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Asynchronous Message Queue • Badge Printer Fleet • Webhook Callbacks • Duplicate Scan Protection
            </p>
          </div>
        </div>

        {/* Status Indicators & Quick Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-800/90 border border-slate-700 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300">{isConnected ? 'SSE Live Stream: Connected' : 'Connecting...'}</span>
          </div>

          {/* Quick Sim Webhook Buttons */}
          <button
            onClick={() => onQuickSimulate('valid_update')}
            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title="Simulate inbound warehouse restock event"
          >
            <Zap className="w-3.5 h-3.5" />
            + Push Restock
          </button>
          <button
            onClick={() => onQuickSimulate('tampered_signature')}
            className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
            title="Simulate bad HMAC signature attack"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Test Attack
          </button>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-1 border-t border-slate-800/70 pt-1 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-rose-400 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
