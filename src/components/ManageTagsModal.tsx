import React, { useState } from 'react';
import { X, Tag, Edit2, Trash2, Check, Search, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { Note } from '../types';

interface ManageTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onNotesUpdated: (updatedNotes: Note[]) => void;
}

interface TagStat {
  name: string;
  count: number;
}

export const ManageTagsModal: React.FC<ManageTagsModalProps> = ({
  isOpen,
  onClose,
  notes,
  onNotesUpdated
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  // Calculate unique tags and counts
  const tagCountsMap = new Map<string, number>();
  notes.forEach(note => {
    (note.tags || []).forEach(tag => {
      const normalized = tag.trim().toLowerCase();
      if (normalized) {
        tagCountsMap.set(normalized, (tagCountsMap.get(normalized) || 0) + 1);
      }
    });
  });

  const tagList: TagStat[] = Array.from(tagCountsMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const filteredTags = tagList.filter(t =>
    t.name.toLowerCase().includes(filterQuery.trim().toLowerCase())
  );

  const startRename = (tag: string) => {
    setEditingTag(tag);
    setNewTagName(tag);
    setFeedbackMsg(null);
  };

  const cancelRename = () => {
    setEditingTag(null);
    setNewTagName('');
  };

  const handleRenameSubmit = async (oldTag: string) => {
    const formattedNewTag = newTagName.trim().toLowerCase();
    if (!formattedNewTag) {
      setFeedbackMsg({ type: 'error', text: 'Tag name cannot be empty.' });
      return;
    }

    if (formattedNewTag === oldTag.toLowerCase()) {
      setEditingTag(null);
      return;
    }

    setIsProcessing(true);
    setFeedbackMsg(null);

    try {
      const response = await fetch('/api/tags/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldTag, newTag: formattedNewTag })
      });

      const data = await response.json();

      if (data.success && data.notes) {
        onNotesUpdated(data.notes);
        setFeedbackMsg({
          type: 'success',
          text: `Renamed tag '${oldTag}' to '${formattedNewTag}' across ${data.affectedCount} note(s).`
        });
        setEditingTag(null);
      } else {
        // Fallback local rename if offline
        const updatedLocal = notes.map(note => ({
          ...note,
          tags: (note.tags || []).map(t => t.toLowerCase() === oldTag.toLowerCase() ? formattedNewTag : t)
        }));
        onNotesUpdated(updatedLocal);
        setFeedbackMsg({
          type: 'success',
          text: `Renamed tag '${oldTag}' to '${formattedNewTag}' locally.`
        });
        setEditingTag(null);
      }
    } catch (err: any) {
      // Local offline fallback
      const updatedLocal = notes.map(note => ({
        ...note,
        tags: (note.tags || []).map(t => t.toLowerCase() === oldTag.toLowerCase() ? formattedNewTag : t)
      }));
      onNotesUpdated(updatedLocal);
      setFeedbackMsg({
        type: 'success',
        text: `Renamed tag '${oldTag}' to '${formattedNewTag}' locally.`
      });
      setEditingTag(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    setIsProcessing(true);
    setFeedbackMsg(null);

    try {
      const response = await fetch('/api/tags/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag })
      });

      const data = await response.json();

      if (data.success && data.notes) {
        onNotesUpdated(data.notes);
        setFeedbackMsg({
          type: 'success',
          text: `Removed tag '${tag}' from ${data.affectedCount} note(s).`
        });
        setDeletingTag(null);
      } else {
        const updatedLocal = notes.map(note => ({
          ...note,
          tags: (note.tags || []).filter(t => t.toLowerCase() !== tag.toLowerCase())
        }));
        onNotesUpdated(updatedLocal);
        setFeedbackMsg({ type: 'success', text: `Removed tag '${tag}' locally.` });
        setDeletingTag(null);
      }
    } catch (err: any) {
      const updatedLocal = notes.map(note => ({
        ...note,
        tags: (note.tags || []).filter(t => t.toLowerCase() !== tag.toLowerCase())
      }));
      onNotesUpdated(updatedLocal);
      setFeedbackMsg({ type: 'success', text: `Removed tag '${tag}' locally.` });
      setDeletingTag(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[85vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Manage Metadata Tags</h2>
              <p className="text-xs text-slate-400">
                {tagList.length} unique tag(s) across {notes.length} note(s) in SQLite database.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Bar */}
        {feedbackMsg && (
          <div className={`mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Search / Filter Input */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search tags by name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Tag List Container */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              {filterQuery ? `No tags found matching "${filterQuery}"` : 'No metadata tags present in vault notes.'}
            </div>
          ) : (
            filteredTags.map((t) => {
              const isEditing = editingTag === t.name;
              const isConfirmingDelete = deletingTag === t.name;

              return (
                <div
                  key={t.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSubmit(t.name);
                          if (e.key === 'Escape') cancelRename();
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/50 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleRenameSubmit(t.name)}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                        title="Save Tag Rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelRename}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isConfirmingDelete ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-rose-300 font-medium">
                        Delete tag <code className="font-mono text-rose-200">{t.name}</code> from {t.count} note(s)?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeleteTag(t.name)}
                          disabled={isProcessing}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeletingTag(null)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <Tag className="w-3 h-3 text-indigo-400" />
                          {t.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                          {t.count} {t.count === 1 ? 'note' : 'notes'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startRename(t.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                          title="Rename Tag"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingTag(t.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                          title="Delete Tag"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Renaming or deleting tags updates all notes in SQLite.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
