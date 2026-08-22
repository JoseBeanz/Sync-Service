/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  Code, 
  FileCode, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Cpu,
  Layers
} from 'lucide-react';

export const PythonSuiteViewer: React.FC = () => {
  const [pythonFiles, setPythonFiles] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<string>('warehouse_sync_service.py');
  const [terminalOutput, setTerminalOutput] = useState<string>('Click any Python test or command above to execute in real-time...\n');
  const [isRunning, setIsRunning] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);

  useEffect(() => {
    fetchPythonFiles();
  }, []);

  const fetchPythonFiles = async () => {
    try {
      const res = await fetch('/api/python/files');
      const data = await res.json();
      if (data.files) {
        setPythonFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to load python source files:', err);
    }
  };

  const handleRunScript = async (scriptName: string, args: string[] = []) => {
    setIsRunning(true);
    setTerminalOutput(`$ python3 ${scriptName} ${args.join(' ')}\n[⚡ EXECUTING PYTHON DAEMON] Please wait...\n`);
    try {
      const res = await fetch('/api/python/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName, args }),
      });
      const data = await res.json();
      setLastExitCode(data.exitCode);
      const combined = `${data.command}\n--------------------------------------------------\n${data.stdout || ''}${data.stderr || ''}\n[Process exited with code ${data.exitCode}]`;
      setTerminalOutput(combined);
    } catch (err: any) {
      setTerminalOutput(`Error executing python command: ${err.message}`);
      setLastExitCode(1);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyCode = () => {
    if (!pythonFiles[selectedFile]) return;
    navigator.clipboard.writeText(pythonFiles[selectedFile]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Cpu className="w-3.5 h-3.5" />
              Python & JavaScript Dual-Language Architecture
            </div>
            <h2 className="text-xl font-bold text-white">
              Python Synchronization Engine, CLI & Automated Test Suite
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Complete standalone Python 3.10+ implementation with zero external pip dependencies:
              HMAC SHA-256 verification, Idempotency TTL guard, DLQ router, support lookup CLI, and automated unittests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
              Python 3.10.12 (Standard Library)
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Command Runner Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-rose-600" />
          Interactive Live Python Runners
        </h3>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleRunScript('test_kiosk_sync.py')}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'text-white'}`} />
            Run Kiosk Async Test Suite (7 Tests)
          </button>

          <button
            onClick={() => handleRunScript('kiosk_printer_simulator.py')}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Play className="w-3.5 h-3.5 text-indigo-300" />
            Simulate Kiosk Scan & Printer Daemon
          </button>

          <button
            onClick={() => handleRunScript('test_inventory_sync.py')}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : 'text-emerald-400'}`} />
            Run Inventory Tests (11 Tests + Benchmark)
          </button>

          <button
            onClick={() => handleRunScript('warehouse_webhook_emitter.py', ['--test-edge-cases'])}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-amber-600" />
            Inventory Edge & Attack Tests
          </button>

          <button
            onClick={() => handleRunScript('sync_cli.py', ['stock'])}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-600" />
            CLI: Stock Report
          </button>
        </div>
      </div>

      {/* Real-time Terminal Execution Console */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-xs font-mono text-slate-400 pl-2">Python Execution Terminal (stdout / stderr)</span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            {lastExitCode !== null && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  lastExitCode === 0 ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                }`}
              >
                Exit Code: {lastExitCode} {lastExitCode === 0 ? 'SUCCESS' : 'FAILED'}
              </span>
            )}
            <button
              onClick={() => setTerminalOutput('')}
              className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        <pre className="p-4 text-emerald-400 font-mono text-xs overflow-x-auto min-h-[160px] max-h-[300px] leading-relaxed whitespace-pre-wrap">
          {terminalOutput}
        </pre>
      </div>

      {/* Python Source Code Inspector & Documentation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* File Tabs */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-1">
            {Object.keys(pythonFiles).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setSelectedFile(fileName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  selectedFile === fileName
                    ? 'bg-white text-rose-600 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                {fileName}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Python Source
              </>
            )}
          </button>
        </div>

        {/* Source Code Display */}
        <div className="p-4 bg-slate-900 overflow-x-auto max-h-[500px]">
          <pre className="text-slate-200 font-mono text-xs leading-relaxed">
            {pythonFiles[selectedFile] || '# Loading python source file...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
