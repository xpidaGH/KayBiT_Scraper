import React, { useState } from 'react';
import { ExternalLink, Code2, Trash2, Share2, Download, Star, BookOpen, Clock, Tag, Archive, ArchiveRestore, Plus, X, Check, Bookmark } from 'lucide-react';
import { Note } from '../types';
import { CodeBlockViewer } from './CodeBlockViewer';
import { getReadingMetrics } from '../utils/readingProgress';
import { NoteMetricsSection } from './NoteMetricsSection';
import { HighlightText } from '../utils/textHighlight';

const TAG_PALETTES = [
  { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30', icon: 'text-indigo-400' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', icon: 'text-emerald-400' },
  { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', icon: 'text-amber-400' },
  { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30', icon: 'text-sky-400' },
  { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30', icon: 'text-purple-400' },
  { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', icon: 'text-rose-400' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', icon: 'text-cyan-400' },
  { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30', icon: 'text-violet-400' },
];

const getTagColorStyle = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_PALETTES.length;
  return TAG_PALETTES[index];
};

interface NoteCardProps {
  note: Note;
  searchTerm?: string;
  onSelect: (note: Note) => void;
  onDelete: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onToggleArchive?: (id: string) => void;
  onToggleReadLater?: (id: string) => void;
  onUpdateNote?: (updatedNote: Note) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  searchTerm,
  onSelect,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
  onToggleReadLater,
  onUpdateNote
}) => {
  const [shareToast, setShareToast] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const metrics = getReadingMetrics(note);

  const handleAddTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tagToSave = newTagInput.trim().toLowerCase();
    if (!tagToSave) {
      setIsAddingTag(false);
      return;
    }

    const existingTags = note.tags || [];
    if (existingTags.includes(tagToSave)) {
      setNewTagInput('');
      setIsAddingTag(false);
      return;
    }

    const updatedTags = [...existingTags, tagToSave];
    const updatedNote = { ...note, tags: updatedTags };

    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags })
      });
      if (onUpdateNote) {
        onUpdateNote(updatedNote);
      }
    } catch (err) {
      console.error('Error adding tag to note:', err);
    } finally {
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedTags = (note.tags || []).filter(t => t !== tagToRemove);
    const updatedNote = { ...note, tags: updatedTags };

    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags })
      });
      if (onUpdateNote) {
        onUpdateNote(updatedNote);
      }
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: `KayBiT Note: ${note.title}`,
      text: `${note.summary}\nExtracted ${note.code_snippets.length} code snippets.`,
      url: note.url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share
      }
    } else {
      // System share fallback to clipboard
      const shareText = `KayBiT Note: ${note.title}\nSource: ${note.url}\n\nSummary:\n${note.summary}`;
      await navigator.clipboard.writeText(shareText);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${note.title}" from local SQLite database?`)) {
      setIsDeleting(true);
      onDelete(note.id);
    }
  };

  const handleExportMarkdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/api/notes/${note.id}/markdown`, '_blank');
  };

  return (
    <div
      onClick={() => onSelect(note)}
      className="group relative rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 p-5 shadow-lg transition-all duration-200 hover:shadow-2xl hover:shadow-emerald-950/30 cursor-pointer flex flex-col justify-between"
    >
      {/* Top Header Row */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
              <HighlightText text={note.title} highlight={searchTerm} />
            </h3>

            {/* User-defined Tag Badges directly below title */}
            {note.tags && note.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                {note.tags.map((tag, idx) => {
                  const palette = getTagColorStyle(tag);
                  return (
                    <span
                      key={`title-tag-${idx}`}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${palette.bg} ${palette.text} ${palette.border}`}
                    >
                      <Tag className={`w-2.5 h-2.5 ${palette.icon}`} />
                      <HighlightText text={tag} highlight={searchTerm} />
                    </span>
                  );
                })}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <HighlightText text={note.domain} highlight={searchTerm} />
              </span>
              {note.is_read_later && (
                <span className="flex items-center gap-1 font-mono text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30 font-bold">
                  <Bookmark className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                  Read Later
                </span>
              )}
              {note.is_archived && (
                <span className="flex items-center gap-1 font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                  <Archive className="w-3 h-3 text-amber-400" />
                  Archived
                </span>
              )}
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3" />
                {note.created_at ? note.created_at.slice(0, 10) : 'Recent'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 opacity-90 sm:opacity-70 group-hover:opacity-100 transition-opacity">
            {onToggleReadLater && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleReadLater(note.id); }}
                className={`p-1.5 rounded-lg transition ${note.is_read_later ? 'text-indigo-400 bg-indigo-500/20 border border-indigo-500/30' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'}`}
                title={note.is_read_later ? 'Remove from Read Later Queue' : 'Bookmark for Read Later Queue'}
              >
                <Bookmark className={`w-4 h-4 ${note.is_read_later ? 'fill-indigo-400' : ''}`} />
              </button>
            )}

            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(note.id); }}
                className={`p-1.5 rounded-lg transition ${note.is_favorite ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'}`}
                title="Toggle Favorite"
              >
                <Star className={`w-4 h-4 ${note.is_favorite ? 'fill-amber-400' : ''}`} />
              </button>
            )}

            {onToggleArchive && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleArchive(note.id); }}
                className={`p-1.5 rounded-lg transition ${note.is_archived ? 'text-amber-400 bg-amber-500/20' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'}`}
                title={note.is_archived ? 'Restore / Unarchive Note' : 'Archive Note'}
              >
                {note.is_archived ? (
                  <ArchiveRestore className="w-4 h-4 text-amber-400" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition relative"
              title="Share Note (System Share Sheet / Clipboard)"
            >
              <Share2 className="w-4 h-4" />
              {shareToast && (
                <span className="absolute -top-8 right-0 bg-cyan-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap animate-bounce">
                  Copied for Share!
                </span>
              )}
            </button>

            <button
              onClick={handleExportMarkdown}
              className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition"
              title="Download Markdown (.md)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Delete from SQLite database"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Text */}
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-3">
          {note.summary ? (
            <HighlightText text={note.summary} highlight={searchTerm} />
          ) : (
            'No text summary extracted.'
          )}
        </p>

        {/* Reading Progress Bar Section */}
        <div className="my-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
            <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Reading Progress
            </span>
            <span className="text-emerald-400 font-bold">
              {metrics.percentage}% <span className="text-slate-500 font-normal">({metrics.wordCount} words)</span>
            </span>
          </div>

          <div className="w-full bg-slate-800/90 rounded-full h-2 overflow-hidden border border-slate-700/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-green-400 transition-all duration-500 shadow-sm shadow-emerald-500/50"
              style={{ width: `${metrics.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
            <span>Est. ~{metrics.readTimeMinutes} min read</span>
            <span>{metrics.wordCount >= 250 ? '100% Comprehensive' : `${Math.max(0, 250 - metrics.wordCount)} w to 100%`}</span>
          </div>
        </div>

        {/* Note Metrics Sub-Component: Word Count, Reading Time & Language/Tag Density */}
        <NoteMetricsSection note={note} />

        {/* First Code Block Quick Preview */}
        {note.code_snippets && note.code_snippets.length > 0 && (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <CodeBlockViewer snippet={note.code_snippets[0]} defaultExpanded={false} />
          </div>
        )}
      </div>

      {/* Footer Meta Row */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs">
        {/* Language & Custom Tag Badges */}
        <div className="flex items-center flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {note.languages && note.languages.map((lang, idx) => (
            <span
              key={`lang-${idx}`}
              className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700"
            >
              <HighlightText text={lang} highlight={searchTerm} />
            </span>
          ))}

          {note.tags && note.tags.map((tag, idx) => {
            const palette = getTagColorStyle(tag);
            return (
              <span
                key={`tag-${idx}`}
                className={`group/tag inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium ${palette.bg} ${palette.text} border ${palette.border} transition`}
              >
                <Tag className={`w-3 h-3 ${palette.icon}`} />
                <HighlightText text={tag} highlight={searchTerm} />
                <button
                  onClick={(e) => handleRemoveTag(tag, e)}
                  className="opacity-60 hover:opacity-100 hover:text-rose-400 ml-0.5 transition"
                  title={`Remove tag "${tag}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {isAddingTag ? (
            <form onSubmit={handleAddTag} className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="new tag..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAddingTag(false);
                }}
                className="w-20 px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-950 border border-emerald-500 text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 transition text-[10px]"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsAddingTag(false)}
                className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 transition text-[10px]"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setIsAddingTag(true); }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
              title="Add custom categorization tag"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              Tag
            </button>
          )}
        </div>

        {/* Code Block Counter & Detail Link */}
        <div className="flex items-center gap-2 font-mono text-emerald-400 text-[11px]">
          <span className="flex items-center gap-1 font-semibold">
            <Code2 className="w-3.5 h-3.5" />
            {note.code_snippets ? note.code_snippets.length : 0} Snippets
          </span>
          <span className="text-slate-500">•</span>
          <span className="flex items-center gap-1 text-slate-400 hover:text-slate-200">
            <BookOpen className="w-3.5 h-3.5" /> View
          </span>
        </div>
      </div>

    </div>
  );
};
