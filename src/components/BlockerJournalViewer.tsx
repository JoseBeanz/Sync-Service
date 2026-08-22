/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Terminal, 
  ShieldCheck, 
  AlertCircle, 
  Zap,
  Code2
} from 'lucide-react';
import { BlockerEntry } from '../types';
import { INITIAL_BLOCKER_LOGS } from '../data/initialData';

export const BlockerJournalViewer: React.FC = () => {
  const [blockers] = useState<BlockerEntry[]>(INITIAL_BLOCKER_LOGS);
  const [selectedBlocker, setSelectedBlocker] = useState<BlockerEntry | null>(blockers[0]);

  const totalBudgetHours = blockers.reduce((a, b) => a + b.timeBoxBudgetHours, 0);
  const totalActualHours = blockers.reduce((a, b) => a + b.actualTimeHours, 0);
  const efficiencyRatio = Math.round((1 - (totalActualHours / totalBudgetHours)) * 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Assignment 1 Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5" />
              Assignment 1: Independent Learning & Blocker Journal
            </div>
            <h2 className="text-xl font-bold text-white">
              Unfamiliar Tools Solo Recon & Troubleshooting Autonomy
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Solo exploration and implementation of unfamiliar tools under pressure: Cryptographic HMAC-SHA256,
              Idempotency Sliding Windows, Dead Letter Queues (DLQ), and Zero-Staleness Caching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-right text-xs">
              <span className="text-slate-400 block text-[10px]">Resource Efficiency:</span>
              <span className="font-bold text-emerald-400 text-sm">{efficiencyRatio}% Faster</span>
              <span className="text-[10px] text-slate-400 block">({totalActualHours}h actual vs {totalBudgetHours}h budget)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: List of Blocker Journal Entries */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
            Recon Log Entries ({blockers.length})
          </h3>
          {blockers.map((b) => {
            const isSelected = selectedBlocker?.id === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBlocker(b)}
                className={`w-full text-left p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-rose-50 border-rose-300 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-rose-700 mb-1">
                  <span>{b.day}</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {b.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 line-clamp-1">{b.toolConcept}</div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    Actual: {b.actualTimeHours}h / Budget: {b.timeBoxBudgetHours}h
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Detailed Journal Deep-Dive */}
        <div className="md:col-span-2">
          {selectedBlocker ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600 mb-1">
                  <span>{selectedBlocker.day}</span> • <span>Tool: {selectedBlocker.toolConcept}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Technical Challenge & Blocker Breakdown
                </h3>
              </div>

              {/* Challenge Faced */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700">Problem Statement & Root Cause:</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                  {selectedBlocker.challengeFaced}
                </p>
              </div>

              {/* Error Log Snippet */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-rose-600" />
                  Error Log Encountered:
                </span>
                <pre className="p-3.5 bg-slate-900 text-rose-300 rounded-xl text-xs font-mono overflow-x-auto">
                  {selectedBlocker.errorLogSnippet}
                </pre>
              </div>

              {/* Resources Consulted */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-600" />
                  Authoritative Resources Consulted:
                </span>
                <ul className="space-y-1 pl-1">
                  {selectedBlocker.resourcesConsulted.map((res, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      {res}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Autonomous Resolution */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Autonomous Resolution & Fix Implemented:
                </span>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  {selectedBlocker.autonomousResolution}
                </p>
              </div>

              {/* Time-box Metrics */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-slate-100">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Allocated Timebox Budget:</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {selectedBlocker.timeBoxBudgetHours} hours
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500">Actual Time to Resolution:</span>
                  <div className="font-mono font-bold text-emerald-700 mt-0.5">
                    {selectedBlocker.actualTimeHours} hours ({Math.round(((selectedBlocker.timeBoxBudgetHours - selectedBlocker.actualTimeHours) / selectedBlocker.timeBoxBudgetHours) * 100)}% under budget)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              Select a recon entry to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
