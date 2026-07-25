import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, Share2, Trash2, Edit3, Save, Check, Code2, BookOpen, Clock, Sparkles, FileText, Archive, ArchiveRestore, Maximize2, Minimize2, FileDown, Tag, Bookmark, MessageSquare } from 'lucide-react';
import { Note } from '../types';
import { CodeBlockViewer } from './CodeBlockViewer';
import { getReadingMetrics } from '../utils/readingProgress';
import { NoteMetricsSection } from './NoteMetricsSection';
import { FocusTimer } from './FocusTimer';
import { generateNotePDF } from '../utils/pdfGenerator';
import { AIChatSidePanel } from './AIChatSidePanel';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateNote: (updatedNote: Note) => void;
  onToggleArchive?: (id: string) => void;
  onToggleReadLater?: (id: string) => void;
  onNoteAdded?: (newNote: Note) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  onClose,
  onDelete,
  onUpdateNote,
  onToggleArchive,
  onToggleReadLater,
  onNoteAdded
}) => {
  if (!note) return null;

  const [studentNotesText, setStudentNotesText] = useState(note.student_notes || '');
  const [contentText, setContentText] = useState(note.content || note.summary || '');
  const [noteSummaryText, setNoteSummaryText] = useState(note.summary || '');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [isFullFocusMode, setIsFullFocusMode] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);

  const [isGeneratingAISummary, setIsGeneratingAISummary] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummarySuccess, setAiSummarySuccess] = useState(false);

  // Synchronize local state if prop note updates
  useEffect(() => {
    if (note) {
      setStudentNotesText(note.student_notes || '');
      setContentText(note.content || note.summary || '');
      setNoteSummaryText(note.summary || '');
      setAiSummaryError(null);
    }
  }, [note?.id]);

  // Dynamic live metric calculation based on current editor state
  const currentNoteDraft: Note = {
    ...note,
    student_notes: studentNotesText,
    content: contentText,
    summary: noteSummaryText || contentText.slice(0, 300)
  };
  const liveMetrics = getReadingMetrics(currentNoteDraft);

  const handleGenerateAISummary = async () => {
    if (!note) return;
    setIsGeneratingAISummary(true);
    setAiSummaryError(null);
    setAiSummarySuccess(false);

    try {
      const response = await fetch(`/api/notes/${note.id}/ai-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate AI summary.');
      }

      setNoteSummaryText(data.aiSummary);
      setAiSummarySuccess(true);
      setTimeout(() => setAiSummarySuccess(false), 4000);

      if (onUpdateNote && data.note) {
        onUpdateNote(data.note);
      }
    } catch (err: any) {
      console.error('AI summary error:', err);
      setAiSummaryError(err.message || 'Error generating AI summary via Gemini.');
    } finally {
      setIsGeneratingAISummary(false);
    }
  };

  const handleSaveStudentNotes = async () => {
    setIsSavingNotes(true);
    setSavedSuccess(false);

    try {
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_notes: studentNotesText,
          content: contentText,
          summary: contentText.slice(0, 300)
        })
      });

      const data = await response.json();
      if (data.success && data.note) {
        onUpdateNote(data.note);
        setSavedSuccess(true);
        setIsEditingContent(false);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error saving study notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `KayBiT Note: ${note.title}`,
      text: `${note.summary}\nExtracted ${note.code_snippets.length} code snippets.`,
      url: note.url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {}
    } else {
      const shareText = `KayBiT Note: ${note.title}\nSource: ${note.url}\n\nSummary:\n${note.summary}`;
      await navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const handleExportMarkdown = () => {
    window.open(`/api/notes/${note.id}/markdown`, '_blank');
  };

  const handleDownloadPDF = () => {
    generateNotePDF(currentNoteDraft);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${note.title}" permanently from local SQLite database?`)) {
      onDelete(note.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full ${isAIChatOpen ? 'max-w-6xl' : 'max-w-4xl'} max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-300`}>
        
        {/* Left / Main Note Section */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                  {note.domain}
                </span>
                {note.languages && note.languages.map((lang, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-mono">
                    {lang}
                  </span>
                ))}
                {currentNoteDraft.tags && currentNoteDraft.tags.map((tag, idx) => (
                  <span key={`tag-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs font-mono">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 leading-tight">
                {note.title}
              </h2>

              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                <a
                  href={note.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:underline font-mono"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {note.url}
                </a>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Scraped: {note.created_at}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isAIChatOpen
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
                title="Toggle Gemini AI Tutor side-panel chat"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{isAIChatOpen ? 'Close AI Chat' : 'Ask AI Tutor'}</span>
                <span className="sm:hidden">AI Chat</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Modal Scrollable Body */}
        <div className={`p-6 overflow-y-auto space-y-6 flex-1 transition-all ${
          isFullFocusMode ? 'bg-slate-950/90 ring-2 ring-emerald-500/50' : ''
        }`}>
          
          {/* Focus Mode Reading Timer Component */}
          <FocusTimer
            note={currentNoteDraft}
            onUpdateNote={onUpdateNote}
            isFullFocusMode={isFullFocusMode}
            onToggleFullFocusMode={() => setIsFullFocusMode(!isFullFocusMode)}
          />

          {!isFullFocusMode && (
            <>
              {/* Live Reading Progress Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-md">
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Live Reading Progress Bar
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {liveMetrics.percentage}% <span className="text-slate-400 font-normal text-xs">({liveMetrics.wordCount} words)</span>
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/80 p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-green-400 transition-all duration-300 shadow-sm shadow-emerald-500/50"
                    style={{ width: `${liveMetrics.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Est. ~{liveMetrics.readTimeMinutes} min read
                  </span>
                  <span className="text-emerald-400 font-mono text-[11px]">
                    {liveMetrics.wordCount >= 250 ? '100% Comprehensive Note' : `${250 - liveMetrics.wordCount} words remaining to 100%`}
                  </span>
                </div>
              </div>

              {/* Note Metrics Sub-Component: Word Count, Reading Time & Language/Tag Density */}
              <NoteMetricsSection note={currentNoteDraft} />
            </>
          )}

          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>{note.code_snippets.length} Code Snippets Extracted</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onToggleReadLater && (
                <button
                  onClick={() => onToggleReadLater(note.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    note.is_read_later
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${note.is_read_later ? 'fill-white' : 'text-indigo-400'}`} />
                  {note.is_read_later ? 'In Reading List' : 'Read Later'}
                </button>
              )}

              <button
                onClick={handleGenerateAISummary}
                disabled={isGeneratingAISummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                title="Use Gemini API to create a 3-sentence summary and append metadata tag"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isGeneratingAISummary ? 'animate-spin' : ''}`} />
                {isGeneratingAISummary ? 'Generating AI Summary...' : 'Generate AI Summary'}
              </button>

              {onToggleArchive && (
                <button
                  onClick={() => onToggleArchive(note.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    note.is_archived
                      ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {note.is_archived ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5 text-amber-400" />
                      Restore / Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5 text-amber-400" />
                      Archive Note
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                {shareSuccess ? 'Copied to Share!' : 'Share Note'}
              </button>

              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition cursor-pointer"
                title="Download formatted PDF document with study notes & code snippets"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download PDF
              </button>

              <button
                onClick={handleExportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                Export Markdown (.md)
              </button>

              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>

          {/* Student Study Notes Section */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                Student Remarks & Exam Study Notes
              </label>
              <button
                onClick={handleSaveStudentNotes}
                disabled={isSavingNotes}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={3}
              value={studentNotesText}
              onChange={(e) => setStudentNotesText(e.target.value)}
              placeholder="Add your study remarks, code explanation notes, or exam key points here..."
              className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Gemini AI 3-Sentence Summary Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-indigo-950/40 border border-purple-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold text-purple-200 uppercase tracking-wider font-mono">
                  Gemini 3-Sentence AI Summary
                </span>
                {currentNoteDraft.tags?.includes('ai-summarized') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                    Metadata: ai-summarized
                  </span>
                )}
              </div>

              <button
                onClick={handleGenerateAISummary}
                disabled={isGeneratingAISummary}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow transition cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isGeneratingAISummary ? 'animate-spin' : ''}`} />
                {isGeneratingAISummary ? 'Generating Summary...' : 'Generate AI Summary'}
              </button>
            </div>

            {aiSummaryError && (
              <p className="text-xs text-rose-300 bg-rose-950/60 p-2.5 rounded-lg border border-rose-800/60 my-2">
                {aiSummaryError}
              </p>
            )}

            {aiSummarySuccess && (
              <p className="text-xs text-emerald-300 bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/60 my-2 flex items-center gap-1.5 font-medium">
                <Check className="w-4 h-4 text-emerald-400" /> 3-sentence summary generated via Gemini and saved to note metadata!
              </p>
            )}

            <div className="mt-2 p-3.5 rounded-lg bg-purple-900/15 border border-purple-500/15 text-xs sm:text-sm text-purple-100/90 leading-relaxed italic">
              {noteSummaryText ? (
                <span>{noteSummaryText}</span>
              ) : (
                <span className="text-slate-400 not-italic">
                  No AI summary generated yet. Click <strong className="text-purple-300">"Generate AI Summary"</strong> to invoke Gemini and produce a concise 3-sentence summary.
                </span>
              )}
            </div>
          </div>

          {/* Tutorial Summary Text & Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                Note Text Content & Summary
              </h3>
              <button
                onClick={() => setIsEditingContent(!isEditingContent)}
                className="text-xs font-medium text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditingContent ? 'Preview Mode' : 'Edit Stored Content'}
              </button>
            </div>

            {isEditingContent ? (
              <textarea
                rows={6}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Edit stored tutorial content..."
                className="w-full p-4 rounded-xl bg-slate-950 border border-emerald-500/50 text-xs sm:text-sm text-slate-100 focus:outline-none transition leading-relaxed font-mono"
              />
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 whitespace-pre-line">
                {contentText}
              </div>
            )}
          </div>

          {/* Extracted Code Snippets List */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Extracted Code Blocks ({note.code_snippets.length})
            </h3>

            {note.code_snippets.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 rounded-xl bg-slate-950 border border-slate-800">
                No code blocks detected on target web page.
              </p>
            ) : (
              <div className="space-y-4">
                {note.code_snippets.map((snippet) => (
                  <CodeBlockViewer key={snippet.id} snippet={snippet} defaultExpanded={true} />
                ))}
              </div>
            )}
          </div>

          </div>
        </div>

        {/* Side Panel AI Chat Interface */}
        {isAIChatOpen && (
          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-[500px] md:h-auto">
            <AIChatSidePanel
              note={currentNoteDraft}
              onClose={() => setIsAIChatOpen(false)}
              onNoteAdded={(newNote) => {
                if (onNoteAdded) onNoteAdded(newNote);
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
};
