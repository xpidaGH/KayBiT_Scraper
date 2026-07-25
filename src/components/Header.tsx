import React from 'react';
import { Terminal, Search, PlusCircle, FileCode, Database, RefreshCw, Wifi, WifiOff, Tag } from 'lucide-react';

interface HeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onOpenScrapeModal: () => void;
  onOpenPythonHub: () => void;
  onOpenBackupModal: () => void;
  onOpenTagsModal: () => void;
  onRefreshData: () => void;
  isOnline: boolean;
  totalNotes: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  setSearchTerm,
  onOpenScrapeModal,
  onOpenPythonHub,
  onOpenBackupModal,
  onOpenTagsModal,
  onRefreshData,
  isOnline,
  totalNotes,
  searchInputRef
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand & Python Status */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Terminal className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  KayBiT_Scraper
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-semibold">
                  Python 3.14.4
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Multi-Platform Programming Study Vault
              </p>
            </div>
          </div>

          {/* Mobile Online / Count Pill */}
          <div className="flex md:hidden items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
              {totalNotes} Notes
            </span>
          </div>
        </div>

        {/* Real-Time Keyword Search Bar */}
        <div className="w-full md:max-w-md relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search titles, code snippets, tags, languages..."
            className="w-full pl-10 pr-16 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded shadow-xs">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Control Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5 w-full md:w-auto justify-end">
          <button
            onClick={onOpenScrapeModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition cursor-pointer"
            title="Scrape URL (Shortcut: Cmd/Ctrl + N)"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Scrape URL</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-emerald-700/60 text-emerald-100 rounded border border-emerald-500/40 ml-0.5">
              ⌘N
            </kbd>
          </button>

          <button
            onClick={onOpenPythonHub}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm border border-slate-700 font-medium transition cursor-pointer"
            title="Python Source Code & Packaging README"
          >
            <FileCode className="w-4 h-4 text-teal-400" />
            <span className="hidden sm:inline">Python Suite & README</span>
            <span className="sm:hidden">Python Code</span>
          </button>

          <button
            onClick={onOpenBackupModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm border border-slate-700 font-medium transition cursor-pointer"
            title="JSON Backup Import & Export"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="hidden lg:inline">JSON Backup</span>
          </button>

          <button
            onClick={onOpenTagsModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm border border-slate-700 font-medium transition cursor-pointer"
            title="Manage and clean up vault metadata tags"
          >
            <Tag className="w-4 h-4 text-indigo-400" />
            <span className="hidden lg:inline">Manage Tags</span>
          </button>

          <button
            onClick={onRefreshData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
            title="Refresh SQLite database connection"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
