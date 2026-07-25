import React from 'react';
import { WifiOff, Database, ShieldCheck, RefreshCw, HardDrive, CheckCircle2 } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  onRetry: () => void;
  onManualSync: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  pendingSyncCount,
  isSyncing,
  onRetry,
  onManualSync
}) => {
  if (isOnline && pendingSyncCount === 0) return null;

  return (
    <div className={`px-4 py-2.5 text-xs transition ${
      !isOnline
        ? 'bg-amber-500/10 border-b border-amber-500/30 text-amber-200'
        : 'bg-indigo-500/10 border-b border-indigo-500/30 text-indigo-200'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {!isOnline ? 'Network Disconnected: ' : 'IndexedDB Auto-Save Queue: '}
            </span>
            <span>
              {!isOnline
                ? 'Your edits and new notes are auto-saved locally in browser IndexedDB. They will automatically sync with SQLite when reconnected.'
                : `${pendingSyncCount} offline edit(s) safely auto-saved in IndexedDB. Syncing with SQLite backend...`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingSyncCount > 0 && isOnline && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now with SQLite'}</span>
            </button>
          )}

          {!isOnline && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-medium transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry SQLite Connection</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
