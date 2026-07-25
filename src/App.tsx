import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { NoteCard } from './components/NoteCard';
import { NoteDetailModal } from './components/NoteDetailModal';
import { ScraperModal } from './components/ScraperModal';
import { PythonCodeHubModal } from './components/PythonCodeHubModal';
import { JsonImportExportModal } from './components/JsonImportExportModal';
import { ManageTagsModal } from './components/ManageTagsModal';
import { ReadingStatsView } from './components/ReadingStatsView';
import { Note } from './types';
import { INITIAL_SAMPLE_NOTES } from './data/sampleNotes';
import { Sparkles, Code2, Plus, Terminal, Filter, RefreshCw, BookOpen, Layers, BarChart2, LayoutGrid, Bookmark } from 'lucide-react';
import {
  cacheNotesInIndexedDB,
  getCachedNotesFromIndexedDB,
  queuePendingSync,
  getPendingSyncQueue,
  dequeuePendingSync,
  syncIndexedDBWithSQLiteBackend
} from './utils/indexedDBStorage';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'snippets'>('newest');
  const [activeViewTab, setActiveViewTab] = useState<'notes' | 'reading-list' | 'stats'>('notes');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Search input DOM reference for Cmd+K focus
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Global Keyboard Shortcuts Manager (Cmd/Ctrl + K, N, B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const key = e.key.toLowerCase();

      // Cmd/Ctrl + K: Focus Search
      if (key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }

      // Cmd/Ctrl + N: Open Add Note / Scraper Modal
      if (key === 'n') {
        e.preventDefault();
        setIsScrapeModalOpen(true);
      }

      // Cmd/Ctrl + B: Back to Notes Vault
      if (key === 'b') {
        e.preventDefault();
        setActiveViewTab('notes');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check and refresh pending sync count in IndexedDB
  const checkPendingQueue = useCallback(async () => {
    const queue = await getPendingSyncQueue();
    setPendingSyncCount(queue.length);
  }, []);

  // Background Sync function
  const runIndexedDBSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncIndexedDBWithSQLiteBackend();
      if (result.syncedCount > 0) {
        console.log(`Synced ${result.syncedCount} item(s) from IndexedDB to SQLite backend.`);
        // Re-fetch server notes after successful sync
        fetchNotes(searchTerm);
      }
    } catch (err) {
      console.warn('Auto-save sync error:', err);
    } finally {
      setIsSyncing(false);
      checkPendingQueue();
    }
  }, [isSyncing, searchTerm]);

  // Modal Controls
  const [isScrapeModalOpen, setIsScrapeModalOpen] = useState<boolean>(false);
  const [isPythonHubOpen, setIsPythonHubOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState<boolean>(false);
  const [activeNoteDetail, setActiveNoteDetail] = useState<Note | null>(null);

  // Fetch Notes from Express + SQLite Backend with IndexedDB fallback
  const fetchNotes = async (query = '') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes${query ? `?search=${encodeURIComponent(query)}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
        setIsOnline(true);
        // Cache snapshot to IndexedDB for offline protection
        cacheNotesInIndexedDB(data);
      } else {
        throw new Error('API response not ok');
      }
    } catch (err) {
      console.warn('Falling back to IndexedDB local cache:', err);
      setIsOnline(false);
      const cachedNotes = await getCachedNotesFromIndexedDB();
      if (cachedNotes && cachedNotes.length > 0) {
        setNotes(cachedNotes);
      } else if (notes.length === 0) {
        setNotes(INITIAL_SAMPLE_NOTES);
        cacheNotesInIndexedDB(INITIAL_SAMPLE_NOTES);
      }
    } finally {
      setIsLoading(false);
      checkPendingQueue();
    }
  };

  useEffect(() => {
    fetchNotes(searchTerm);
  }, [searchTerm]);

  // Periodic health check & auto-save sync loop
  useEffect(() => {
    const checkHealthAndSync = async () => {
      try {
        const res = await fetch('/api/health');
        const onlineStatus = res.ok;
        setIsOnline(onlineStatus);
        if (onlineStatus) {
          runIndexedDBSync();
        }
      } catch {
        setIsOnline(false);
      }
      checkPendingQueue();
    };

    checkHealthAndSync();
    const interval = setInterval(checkHealthAndSync, 15000);

    const handleOnlineEvent = () => {
      setIsOnline(true);
      runIndexedDBSync();
    };
    const handleOfflineEvent = () => setIsOnline(false);

    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
    };
  }, [runIndexedDBSync, checkPendingQueue]);

  // Delete Note Handler with IndexedDB Auto-Save Queueing
  const handleDeleteNote = async (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    // Auto-save deletion in IndexedDB first
    await queuePendingSync({ id: noteId }, 'DELETE');
    checkPendingQueue();

    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        await dequeuePendingSync(noteId);
        checkPendingQueue();
      }
    } catch (err) {
      console.warn('Network offline during delete: change queued in IndexedDB', err);
    }
  };

  // Favorite Toggle Handler with IndexedDB Auto-Save Queueing
  const handleToggleFavorite = async (noteId: string) => {
    let updatedNoteObj: Note | null = null;
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        const newFav = !n.is_favorite;
        updatedNoteObj = { ...n, is_favorite: newFav };
        return updatedNoteObj;
      }
      return n;
    }));

    if (updatedNoteObj) {
      await queuePendingSync(updatedNoteObj, 'UPDATE');
      checkPendingQueue();

      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_favorite: (updatedNoteObj as Note).is_favorite })
        });
        if (res.ok) {
          await dequeuePendingSync(noteId);
          checkPendingQueue();
        }
      } catch (err) {
        console.warn('Network offline during favorite toggle: change queued in IndexedDB', err);
      }
    }
  };

  // Archive Toggle Handler with IndexedDB Auto-Save Queueing
  const handleToggleArchive = async (noteId: string) => {
    let updatedNoteObj: Note | null = null;
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        const newArchived = !n.is_archived;
        updatedNoteObj = { ...n, is_archived: newArchived };
        return updatedNoteObj;
      }
      return n;
    }));

    if (activeNoteDetail?.id === noteId) {
      setActiveNoteDetail(prev => prev ? { ...prev, is_archived: !prev.is_archived } : null);
    }

    if (updatedNoteObj) {
      await queuePendingSync(updatedNoteObj, 'UPDATE');
      checkPendingQueue();

      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_archived: (updatedNoteObj as Note).is_archived })
        });
        if (res.ok) {
          await dequeuePendingSync(noteId);
          checkPendingQueue();
        }
      } catch (err) {
        console.warn('Network offline during archive toggle: change queued in IndexedDB', err);
      }
    }
  };

  // Read Later Toggle Handler with IndexedDB Auto-Save Queueing
  const handleToggleReadLater = async (noteId: string) => {
    let updatedNoteObj: Note | null = null;
    setNotes(prev => prev.map(n => {
      if (n.id === noteId) {
        const newReadLater = !n.is_read_later;
        updatedNoteObj = { ...n, is_read_later: newReadLater };
        return updatedNoteObj;
      }
      return n;
    }));

    if (activeNoteDetail?.id === noteId) {
      setActiveNoteDetail(prev => prev ? { ...prev, is_read_later: !prev.is_read_later } : null);
    }

    if (updatedNoteObj) {
      await queuePendingSync(updatedNoteObj, 'UPDATE');
      checkPendingQueue();

      try {
        const res = await fetch(`/api/notes/${noteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_read_later: (updatedNoteObj as Note).is_read_later })
        });
        if (res.ok) {
          await dequeuePendingSync(noteId);
          checkPendingQueue();
        }
      } catch (err) {
        console.warn('Network offline during read later toggle: change queued in IndexedDB', err);
      }
    }
  };

  // Add Scraped or Dictated Note Handler
  const handleNoteAdded = async (newNote: Note) => {
    setNotes(prev => [newNote, ...prev]);
    await cacheNotesInIndexedDB([newNote, ...notes]);
    checkPendingQueue();
  };

  // Update Note Handler
  const handleUpdateNote = async (updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    if (activeNoteDetail?.id === updatedNote.id) {
      setActiveNoteDetail(updatedNote);
    }
    await queuePendingSync(updatedNote, 'UPDATE');
    checkPendingQueue();
  };

  const archivedCount = notes.filter(n => n.is_archived).length;
  const readLaterCount = notes.filter(n => n.is_read_later && !n.is_archived).length;

  // Filtering & Sorting Logic
  const filteredNotes = notes.filter(note => {
    // If active view is Reading List Queue, strictly show bookmarked read-later notes
    if (activeViewTab === 'reading-list') {
      if (!note.is_read_later || note.is_archived) return false;
    }

    if (selectedLanguage === 'archived') {
      return note.is_archived === true;
    }

    // Hide archived notes from primary vault views
    if (note.is_archived) {
      return false;
    }

    if (selectedLanguage === 'all') return true;
    if (selectedLanguage === 'favorites') return note.is_favorite;
    if (selectedLanguage === 'has_code') return note.code_snippets && note.code_snippets.length > 0;
    
    return (note.languages || []).some(l => l.toLowerCase().includes(selectedLanguage)) ||
           (note.tags || []).some(t => t.toLowerCase().includes(selectedLanguage));
  }).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'snippets') return (b.code_snippets?.length || 0) - (a.code_snippets?.length || 0);
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Top Navigation */}
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenScrapeModal={() => setIsScrapeModalOpen(true)}
        onOpenPythonHub={() => setIsPythonHubOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenTagsModal={() => setIsTagsModalOpen(true)}
        onRefreshData={() => fetchNotes(searchTerm)}
        isOnline={isOnline}
        totalNotes={notes.length}
        searchInputRef={searchInputRef}
      />

      {/* Connection Offline & IndexedDB Sync Banner */}
      <OfflineBanner
        isOnline={isOnline}
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncing}
        onRetry={() => fetchNotes(searchTerm)}
        onManualSync={runIndexedDBSync}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Navigation View Switcher (Notes Grid vs Reading List vs Reading Stats) */}
        <div className="flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveViewTab('notes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition cursor-pointer shrink-0 ${
                activeViewTab === 'notes'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Return to Vault (Shortcut: Cmd/Ctrl + B)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Notes Vault ({notes.length})</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800/80 text-slate-300 rounded border border-slate-700 ml-0.5">
                ⌘B
              </kbd>
            </button>

            <button
              onClick={() => setActiveViewTab('reading-list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition cursor-pointer shrink-0 ${
                activeViewTab === 'reading-list'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bookmark className="w-4 h-4 text-indigo-400 fill-indigo-400" />
              <span>Reading List ({readLaterCount})</span>
            </button>

            <button
              onClick={() => setActiveViewTab('stats')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold font-mono transition cursor-pointer shrink-0 ${
                activeViewTab === 'stats'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart2 className="w-4 h-4 text-cyan-300" />
              <span>Reading Stats & Analytics</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono pr-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQLite + IndexedDB Vault</span>
          </div>
        </div>

        {activeViewTab === 'stats' ? (
          <ReadingStatsView notes={notes} />
        ) : (
          <>
            {/* Reading List Banner when active */}
            {activeViewTab === 'reading-list' && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Bookmark className="w-5 h-5 fill-indigo-400 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>Reading List Queue</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {readLaterCount} bookmarked
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400">
                      Notes bookmarked for later study. All items auto-save in IndexedDB & sync with SQLite.
                    </p>
                  </div>
                </div>
                {readLaterCount > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all items from your Reading List queue?')) {
                        notes.filter(n => n.is_read_later).forEach(n => handleToggleReadLater(n.id));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-rose-300 text-xs font-mono font-medium border border-slate-700 transition cursor-pointer"
                  >
                    Clear Queue
                  </button>
                )}
              </div>
            )}

            {/* Language Filter & Sort Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              
              {/* Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 shrink-0 mr-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filter:
                </span>
                {[
                  { id: 'all', label: 'All Notes' },
                  { id: 'python', label: 'Python' },
                  { id: 'javascript', label: 'JavaScript' },
                  { id: 'cpp', label: 'C++' },
                  { id: 'rust', label: 'Rust' },
                  { id: 'html', label: 'HTML / CSS' },
                  { id: 'favorites', label: '★ Favorites' },
                  { id: 'has_code', label: 'With Code' },
                  { id: 'archived', label: `📦 Archived${archivedCount > 0 ? ` (${archivedCount})` : ''}` }
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedLanguage(filter.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 border ${
                      selectedLanguage === filter.id
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Sort Selector */}
              <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 w-full md:w-auto justify-end">
                <span className="font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="snippets">Most Code Snippets</option>
                </select>
              </div>

            </div>

            {/* Content Section / Notes Grid */}
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Loading SQLite Notes Vault...</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-16 px-4 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-4 max-w-lg mx-auto">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                  activeViewTab === 'reading-list'
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
                    : 'bg-slate-800 text-emerald-400'
                }`}>
                  {activeViewTab === 'reading-list' ? (
                    <Bookmark className="w-6 h-6 fill-indigo-400" />
                  ) : (
                    <BookOpen className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-200">
                    {activeViewTab === 'reading-list' ? 'Your Reading List Queue is Empty' : 'No matching programming notes found'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeViewTab === 'reading-list'
                      ? 'Click the Bookmark icon on any note card to queue it here for later reading.'
                      : searchTerm ? `No records matching "${searchTerm}". Try a different keyword or filter.` : 'Your local SQLite vault is empty. Scrape your first programming tutorial URL!'}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  {activeViewTab === 'reading-list' ? (
                    <button
                      onClick={() => setActiveViewTab('notes')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      Browse Notes Vault
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsScrapeModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Scrape Web Tutorial</span>
                      </button>
                      {searchTerm && (
                        <button
                          onClick={() => { setSearchTerm(''); setSelectedLanguage('all'); }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                <AnimatePresence>
                  {filteredNotes.map(note => (
                    <motion.div
                      key={note.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <NoteCard
                        note={note}
                        searchTerm={searchTerm}
                        onSelect={setActiveNoteDetail}
                        onDelete={handleDeleteNote}
                        onToggleFavorite={handleToggleFavorite}
                        onToggleArchive={handleToggleArchive}
                        onToggleReadLater={handleToggleReadLater}
                        onUpdateNote={handleUpdateNote}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </>
        )}

      </main>

      {/* Modals */}
      <ScraperModal
        isOpen={isScrapeModalOpen}
        onClose={() => setIsScrapeModalOpen(false)}
        onNoteAdded={handleNoteAdded}
      />

      <NoteDetailModal
        note={activeNoteDetail}
        onClose={() => setActiveNoteDetail(null)}
        onDelete={handleDeleteNote}
        onUpdateNote={handleUpdateNote}
        onToggleArchive={handleToggleArchive}
        onToggleReadLater={handleToggleReadLater}
        onNoteAdded={handleNoteAdded}
      />

      <PythonCodeHubModal
        isOpen={isPythonHubOpen}
        onClose={() => setIsPythonHubOpen(false)}
      />

      <JsonImportExportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        notes={notes}
        onNotesImported={() => fetchNotes(searchTerm)}
      />

      <ManageTagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        notes={notes}
        onNotesUpdated={(updatedNotes) => {
          setNotes(updatedNotes);
          cacheNotesInIndexedDB(updatedNotes);
        }}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-slate-900 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500 font-mono">
        <p>KayBiT_Scraper v3.14.4 • Multi-Platform Python 3.14 Web / Windows / Android Suite</p>
        <p className="mt-1 text-slate-600">SQLite3 Local Database Engine • BeautifulSoup4 Code Block Extractor</p>
      </footer>

    </div>
  );
}
