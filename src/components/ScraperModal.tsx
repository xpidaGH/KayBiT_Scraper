import React, { useState, useRef, useEffect } from 'react';
import { X, Globe, Sparkles, Loader2, AlertTriangle, CheckCircle2, Tag, Mic, MicOff, Radio, Plus, FileText, Volume2 } from 'lucide-react';
import { Note, ScrapeResult } from '../types';

interface ScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteAdded: (note: Note) => void;
}

const PRESET_URLS = [
  { name: 'Python 3.14 AsyncIO Docs', url: 'https://docs.python.org/3/library/asyncio.html' },
  { name: 'FastAPI Tutorial', url: 'https://fastapi.tiangolo.com/tutorial/' },
  { name: 'React 19 Hooks Cheatsheet', url: 'https://react.dev/reference/react/hooks' },
  { name: 'C++ Smart Pointers Guide', url: 'https://en.cppreference.com/w/cpp/memory/unique_ptr' },
  { name: 'Rust Book Ownership', url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html' }
];

export const ScraperModal: React.FC<ScraperModalProps> = ({ isOpen, onClose, onNoteAdded }) => {
  const [activeTab, setActiveTab] = useState<'scraper' | 'dictation'>('scraper');

  // Web Scraper State
  const [url, setUrl] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Voice Dictation State
  const [voiceTitle, setVoiceTitle] = useState('');
  const [voiceContent, setVoiceContent] = useState('');
  const [voiceTags, setVoiceTags] = useState('dictated, voice-note');
  const [isListening, setIsListening] = useState(false);
  const [activeDictateField, setActiveDictateField] = useState<'title' | 'content' | 'tags' | 'url'>('content');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [isSavingVoice, setIsSavingVoice] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount or modal close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  if (!isOpen) return null;

  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const toggleListening = (targetField: 'title' | 'content' | 'tags' | 'url' = 'content') => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setActiveDictateField(targetField);
        setSpeechError(null);
        setInterimText('');
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interimChunk += transcript;
          }
        }

        setInterimText(interimChunk);

        if (finalChunk) {
          if (targetField === 'title') {
            setVoiceTitle(prev => (prev ? `${prev} ${finalChunk}` : finalChunk).trim());
          } else if (targetField === 'content') {
            setVoiceContent(prev => (prev ? `${prev}\n${finalChunk}` : finalChunk).trim());
          } else if (targetField === 'tags') {
            setVoiceTags(prev => (prev ? `${prev}, ${finalChunk}` : finalChunk).trim());
          } else if (targetField === 'url') {
            setUrl(finalChunk.trim().toLowerCase().replace(/\s+/g, ''));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser.');
        } else {
          setSpeechError(`Speech API error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize Speech Recognition:', err);
      setSpeechError(`Speech initialization error: ${err.message || 'Unknown error'}`);
      setIsListening(false);
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setWarningMsg(null);
    setSuccessMsg(null);

    const tagsArray = customTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), custom_tags: tagsArray })
      });

      const data: ScrapeResult = await response.json();

      if (data.success && data.note) {
        setSuccessMsg(`Successfully scraped "${data.note.title}" with ${data.note.code_snippets.length} code blocks! Saved to SQLite.`);
        onNoteAdded(data.note);
        setTimeout(() => {
          setIsLoading(false);
          setUrl('');
          setCustomTags('');
          onClose();
        }, 1200);
      } else if (data.is_offline_fallback) {
        setErrorMsg(data.error || 'Network unreachable.');
        setWarningMsg(data.warning || 'Switched to Offline SQLite Mode.');
        setIsLoading(false);
      } else {
        setErrorMsg(data.error || 'Failed to scrape URL');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(`Connection error: ${err.message || 'Unable to reach backend scraper'}. You can continue accessing local SQLite notes offline.`);
      setIsLoading(false);
    }
  };

  const handleSaveVoiceNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voiceTitle.trim() && !voiceContent.trim()) {
      setSpeechError('Please dictate or enter a title or content for your voice note.');
      return;
    }

    setIsSavingVoice(true);
    setSpeechError(null);

    const tagsArray = voiceTags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const titleToUse = voiceTitle.trim() || `Voice Dictation ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToUse,
          content: voiceContent.trim() || 'Dictated audio note text.',
          summary: voiceContent.trim().slice(0, 250) || 'Dictated study note.',
          tags: tagsArray,
          domain: 'voice-dictation',
          url: 'Browser Web Speech API'
        })
      });

      const data = await response.json();

      if (data.success && data.note) {
        setSuccessMsg(`Voice note "${data.note.title}" successfully saved to local SQLite database!`);
        onNoteAdded(data.note);
        setTimeout(() => {
          setIsSavingVoice(false);
          setVoiceTitle('');
          setVoiceContent('');
          onClose();
        }, 1200);
      } else {
        setSpeechError(data.error || 'Failed to save voice note to SQLite.');
        setIsSavingVoice(false);
      }
    } catch (err: any) {
      setSpeechError(`Error saving to SQLite: ${err.message}`);
      setIsSavingVoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={() => {
            if (isListening) toggleListening();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Navigation Tabs */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {activeTab === 'scraper' ? <Globe className="w-6 h-6" /> : <Mic className="w-6 h-6 text-indigo-400" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {activeTab === 'scraper' ? 'Scrape Web Documentation' : 'Voice Dictation & Speech Notes'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'scraper'
                  ? 'Extract tutorial text & code blocks into SQLite database.'
                  : 'Dictate notes using browser Web Speech API & save directly to SQLite.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                if (isListening) toggleListening();
                setActiveTab('scraper');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'scraper'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              URL Scraper
            </button>
            <button
              onClick={() => setActiveTab('dictation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dictation'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-amber-300" />
              Voice Dictation
            </button>
          </div>
        </div>

        {/* TAB 1: WEB SCRAPER */}
        {activeTab === 'scraper' && (
          <form onSubmit={handleScrape} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Target Documentation / Tutorial URL
                </label>
                {SpeechRecognition && (
                  <button
                    type="button"
                    onClick={() => toggleListening('url')}
                    className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded transition ${
                      isListening && activeDictateField === 'url'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    {isListening && activeDictateField === 'url' ? 'Listening...' : 'Dictate URL'}
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.python.org/3/library/sqlite3.html"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Quick Presets for Testing
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_URLS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setUrl(preset.url)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-teal-400" />
                Custom Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                placeholder="e.g. python, concurrency, student-notes, exam-prep"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Diagnostics */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-rose-200">Scraper Diagnostics</p>
                  <p>{errorMsg}</p>
                  {warningMsg && <p className="mt-1 text-amber-300 font-medium">{warningMsg}</p>}
                </div>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p>{successMsg}</p>
              </div>
            )}

            {/* Scraper Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing HTML & Extracting Code...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Extract & Save to SQLite</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: VOICE DICTATION MODE */}
        {activeTab === 'dictation' && (
          <form onSubmit={handleSaveVoiceNote} className="space-y-4">
            
            {/* Speech Recording Bar */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-950 to-purple-950/60 border border-indigo-500/30 text-slate-200">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleListening(activeDictateField)}
                    className={`relative p-3.5 rounded-full font-bold transition shadow-lg flex items-center justify-center cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white shadow-rose-600/40 ring-4 ring-rose-500/30 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    }`}
                    title={isListening ? 'Click to pause dictation' : 'Click to start voice dictation'}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        {isListening ? 'Listening via Web Speech API...' : 'Ready for Voice Dictation'}
                      </span>
                      {isListening && (
                        <span className="flex items-center gap-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 font-semibold">
                          <Radio className="w-3 h-3 animate-spin" /> Live Recording
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isListening
                        ? `Speak clearly into your microphone (Dictating to: ${activeDictateField.toUpperCase()})`
                        : 'Click the microphone button to dictate titles, study notes, or tags directly.'}
                    </p>
                  </div>
                </div>

                {/* Target Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[11px] font-mono text-slate-400 px-1">Dictate To:</span>
                  {(['title', 'content', 'tags'] as const).map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => {
                        setActiveDictateField(field);
                        if (!isListening) toggleListening(field);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition cursor-pointer ${
                        activeDictateField === field
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interim Real-time Transcript Stream */}
              {interimText && (
                <div className="mt-3 p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 font-mono flex items-center gap-2 animate-pulse">
                  <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Hearing: "{interimText}"</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {speechError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{speechError}</p>
              </div>
            )}

            {/* Note Title Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Note Title</label>
                <button
                  type="button"
                  onClick={() => toggleListening('title')}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded transition ${
                    isListening && activeDictateField === 'title'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : 'text-slate-400 hover:text-indigo-400'
                  }`}
                >
                  <Mic className="w-3 h-3 inline mr-1" />
                  {isListening && activeDictateField === 'title' ? 'Listening...' : 'Dictate Title'}
                </button>
              </div>
              <input
                type="text"
                value={voiceTitle}
                onChange={(e) => setVoiceTitle(e.target.value)}
                placeholder="e.g. Dictated Study Notes on Python Generators and Iterators"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Note Content Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Dictated Note Body / Content</label>
                <div className="flex items-center gap-2">
                  {voiceContent && (
                    <button
                      type="button"
                      onClick={() => setVoiceContent('')}
                      className="text-[11px] text-slate-500 hover:text-rose-400 transition"
                    >
                      Clear Content
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleListening('content')}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition ${
                      isListening && activeDictateField === 'content'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                        : 'text-slate-400 hover:text-indigo-400'
                    }`}
                  >
                    <Mic className="w-3 h-3 inline mr-1" />
                    {isListening && activeDictateField === 'content' ? 'Listening...' : 'Dictate Content'}
                  </button>
                </div>
              </div>
              <textarea
                rows={5}
                value={voiceContent}
                onChange={(e) => setVoiceContent(e.target.value)}
                placeholder="Start speaking or type your study notes here..."
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed"
              />
            </div>

            {/* Tags Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" /> Custom Categorization Tags
                </label>
                <button
                  type="button"
                  onClick={() => toggleListening('tags')}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded transition ${
                    isListening && activeDictateField === 'tags'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                      : 'text-slate-400 hover:text-indigo-400'
                  }`}
                >
                  <Mic className="w-3 h-3 inline mr-1" />
                  {isListening && activeDictateField === 'tags' ? 'Listening...' : 'Dictate Tags'}
                </button>
              </div>
              <input
                type="text"
                value={voiceTags}
                onChange={(e) => setVoiceTags(e.target.value)}
                placeholder="dictated, voice-note, python, exam-prep"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Success Notification */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p>{successMsg}</p>
              </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (isListening) toggleListening();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingVoice || (!voiceTitle.trim() && !voiceContent.trim())}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                {isSavingVoice ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to SQLite...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Save Voice Note to SQLite</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
