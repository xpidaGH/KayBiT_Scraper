import React, { useState } from 'react';
import { X, FileCode, Download, Copy, Check, Play, Terminal, Layers, BookOpen, ExternalLink, Cpu } from 'lucide-react';
import { PYTHON_CODE_HUB } from '../data/pythonCodeHub';
import { PythonScriptFile } from '../types';

interface PythonCodeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonCodeHubModal: React.FC<PythonCodeHubModalProps> = ({ isOpen, onClose }) => {
  const [activeScriptId, setActiveScriptId] = useState<string>('fastapi-core');
  const [copied, setCopied] = useState(false);
  const [simulatedTestUrl, setSimulatedTestUrl] = useState('https://docs.python.org/3/library/asyncio.html');
  const [simRunning, setSimRunning] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentScript = PYTHON_CODE_HUB.find(s => s.id === activeScriptId) || PYTHON_CODE_HUB[0];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([currentScript.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentScript.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const runPythonSimulation = () => {
    setSimRunning(true);
    setSimLogs([
      `[KayBiT_Python 3.14.4 Engine] Booting Python 3.14 environment...`,
      `[HTTPX] Async Request GET ${simulatedTestUrl}`,
      `[BeautifulSoup4] Parsing HTML DOM tree (lxml / html.parser)...`,
      `[Regex Language Analyzer] Found <pre class="language-python"> block (18 lines)`,
      `[Regex Language Analyzer] Found <code class="lang-sql"> block (12 lines)`,
      `[SQLite3 Engine] Executing INSERT INTO notes (id, title, code_snippets)...`,
      `[SUCCESS] Note saved to local SQLite database kaybit_notes.sqlite`
    ]);

    setTimeout(() => {
      setSimRunning(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header Bar */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-bold">
              <Terminal className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">KayBiT_Scraper Python 3.14 Multi-Platform Suite</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-semibold">
                  Python 3.14.4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Executable source code files for FastAPI, Flet (Windows/Android), PyWebview, Kivy, and Buildozer packaging.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* File Selection Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
            {PYTHON_CODE_HUB.map((file) => (
              <button
                key={file.id}
                onClick={() => setActiveScriptId(file.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition shrink-0 cursor-pointer border ${
                  activeScriptId === file.id
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-slate-800'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>{file.filename}</span>
              </button>
            ))}
          </div>

          {/* Active File Metadata & Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-100">{currentScript.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{currentScript.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleDownloadFile}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {currentScript.filename}</span>
              </button>
            </div>
          </div>

          {/* Code Viewer Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-inner">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono flex items-center justify-between">
              <span>{currentScript.filename}</span>
              <span>Python 3.14.4 Source</span>
            </div>
            <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-96 leading-relaxed selection:bg-emerald-500 selection:text-slate-950">
              <code>{currentScript.code}</code>
            </pre>
          </div>

          {/* Python 3.14 Scraper Code Sandbox Simulator */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Python 3.14 Scraper Execution Sandbox</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">FastAPI + BeautifulSoup4 Engine</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={simulatedTestUrl}
                onChange={(e) => setSimulatedTestUrl(e.target.value)}
                placeholder="https://docs.python.org/3/library/asyncio.html"
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={runPythonSimulation}
                disabled={simRunning}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Run Python Scraper</span>
              </button>
            </div>

            {/* Terminal Output */}
            {simLogs.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
                {simLogs.map((log, i) => (
                  <p key={i} className="leading-snug">{log}</p>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
