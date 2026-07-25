import React, { useState } from 'react';
import { X, Database, Download, Upload, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import { Note } from '../types';

interface JsonImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onNotesImported: () => void;
}

export const JsonImportExportModal: React.FC<JsonImportExportModalProps> = ({
  isOpen,
  onClose,
  notes,
  onNotesImported
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    window.open('/api/notes/export/backup.json', '_blank');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setErrorStatus(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      let importedNotes: Note[] = [];
      if (Array.isArray(parsed)) {
        importedNotes = parsed;
      } else if (parsed && Array.isArray(parsed.notes)) {
        importedNotes = parsed.notes;
      } else {
        throw new Error('Invalid backup file format. Expected JSON array or object with "notes" array.');
      }

      const response = await fetch('/api/notes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: importedNotes })
      });

      const result = await response.json();
      if (result.success) {
        setImportStatus(`Successfully restored ${result.importedCount} notes into local SQLite database! Total: ${result.total}`);
        onNotesImported();
      } else {
        setErrorStatus(result.error || 'Failed to import backup file.');
      }
    } catch (err: any) {
      setErrorStatus(`Import Error: ${err.message || 'Invalid JSON file structure'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">JSON Import / Export Backup Utility</h2>
            <p className="text-xs text-slate-400">
              Preserve and migrate your SQLite database notes without requiring smartphone root access.
            </p>
          </div>
        </div>

        {/* Export Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-emerald-400" />
                Export SQLite Database
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Download all {notes.length} notes, code blocks, and tags as <code className="text-emerald-400">kaybit_notes_backup.json</code>.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportJson}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Backup (.json)</span>
          </button>
        </div>

        {/* Import Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Import & Restore Backup
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a previously exported <code className="text-cyan-400">.json</code> backup file to restore notes into SQLite.
            </p>
          </div>

          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl bg-slate-900/50 cursor-pointer transition">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-slate-300">Click to select JSON backup file</span>
            <span className="text-[11px] text-slate-500 mt-1">Supports kaybit_notes_backup.json</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Status Messages */}
        {importStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {errorStatus && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
