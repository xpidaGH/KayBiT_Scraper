import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, PlusCircle, Check, RefreshCw, MessageSquare, Copy, HelpCircle, ChevronRight, X, Code2 } from 'lucide-react';
import { Note, CodeSnippet } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isInserting?: boolean;
  inserted?: boolean;
}

interface AIChatSidePanelProps {
  note: Note;
  onClose?: () => void;
  onNoteAdded?: (newNote: Note) => void;
}

const SUGGESTED_QUESTIONS = [
  "Explain this concept step-by-step in simple terms.",
  "What are the main key takeaways and formulas/patterns?",
  "Show me a practical code example applying this.",
  "What are potential edge cases or common bugs to avoid?",
  "Generate 2 quick study practice questions to test my memory."
];

// Helper to parse markdown code blocks into CodeSnippets for new note insertion
function extractCodeSnippetsFromMarkdown(text: string): { snippets: CodeSnippet[]; languages: string[] } {
  const snippets: CodeSnippet[] = [];
  const languagesSet = new Set<string>();

  // Match ```lang ... ``` blocks
  const codeBlockRegex = /```([a-zA-Z0-9_+#-]*)\n([\s\S]*?)```/g;
  let match;
  let idx = 1;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const rawLang = (match[1] || 'text').trim().toLowerCase();
    const code = match[2].trim();
    if (code.length > 0) {
      const lang = rawLang || 'javascript';
      languagesSet.add(lang);
      snippets.push({
        id: `snippet-ai-${Date.now()}-${idx}`,
        language: lang,
        code,
        lineCount: code.split('\n').length
      });
      idx++;
    }
  }

  return { snippets, languages: Array.from(languagesSet) };
}

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  note,
  onClose,
  onNoteAdded
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello! I'm your Gemini AI Study Assistant. Ask me anything about **"${note.title}"** or click a suggested prompt below to start.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);
    setErrorMsg(null);

    // Build chat history for Gemini context
    const historyPayload = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, text: m.text }));

    try {
      const response = await fetch(`/api/notes/${note.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          history: historyPayload,
          noteContext: note
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get answer from Gemini AI.');
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'model',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      setErrorMsg(err.message || 'Unable to connect to Gemini AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertAsNewNote = async (msg: ChatMessage) => {
    if (!msg.text || msg.role !== 'model') return;

    // Mark as inserting
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isInserting: true } : m));

    try {
      // Find the user's preceding question if available
      const msgIdx = messages.findIndex(m => m.id === msg.id);
      let userQuestion = note.title;
      if (msgIdx > 0 && messages[msgIdx - 1].role === 'user') {
        userQuestion = messages[msgIdx - 1].text;
      }

      const { snippets, languages } = extractCodeSnippetsFromMarkdown(msg.text);

      const noteTitle = `AI Explanation: ${userQuestion.length > 50 ? userQuestion.slice(0, 50) + '...' : userQuestion}`;
      const summaryText = `AI Explanation generated by Gemini for "${note.title}". Key topic: ${userQuestion}`;

      const newNoteObj: Note = {
        id: `note-ai-${Date.now()}`,
        title: noteTitle,
        url: note.url || 'AI Tutor Session',
        domain: 'ai-tutor',
        summary: summaryText,
        content: msg.text,
        code_snippets: snippets,
        languages: languages.length > 0 ? languages : (note.languages || ['general']),
        tags: Array.from(new Set(['ai-explanation', 'gemini-tutor', ...(note.tags || [])])),
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };

      // Persist via API
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNoteObj)
      });

      const resData = await res.json();
      const savedNote = resData.success && resData.note ? resData.note : newNoteObj;

      if (onNoteAdded) {
        onNoteAdded(savedNote);
      }

      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isInserting: false, inserted: true } : m));
    } catch (err) {
      console.error('Error inserting AI note:', err);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isInserting: false } : m));
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/95 border-l border-slate-800 text-slate-100 w-full rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5 leading-none">
              <span>Gemini AI Tutor</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                gemini-3.6
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-[260px]">
              Asking about: {note.title}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Close AI Assistant Panel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400 font-mono">
              {msg.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-emerald-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-300 font-semibold">Gemini Tutor</span>
                </>
              )}
              <span>•</span>
              <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
            </div>

            <div
              className={`p-3 rounded-2xl max-w-[92%] sm:max-w-[88%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs shadow-md shadow-emerald-600/10'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans break-words">
                {msg.text}
              </div>

              {/* Action Toolbar for AI Messages */}
              {msg.role === 'model' && msg.id !== 'welcome' && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleInsertAsNewNote(msg)}
                    disabled={msg.isInserting || msg.inserted}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      msg.inserted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30'
                    }`}
                    title="Insert this explanation as a brand new note in your Vault"
                  >
                    {msg.inserted ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Inserted as Note</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className={`w-3.5 h-3.5 ${msg.isInserting ? 'animate-spin' : ''}`} />
                        <span>{msg.isInserting ? 'Inserting...' : 'Insert as New Note'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs w-fit">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="font-mono">Gemini is analyzing note content & thinking...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Gemini Request Failed</p>
              <p className="text-[11px] opacity-80">{errorMsg}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      {messages.length <= 2 && (
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 space-y-1.5">
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-indigo-400" />
            <span>Suggested Questions:</span>
          </p>
          <div className="flex flex-col gap-1">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] transition cursor-pointer flex items-center justify-between group"
              >
                <span className="truncate pr-2">{q}</span>
                <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about this note..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || isLoading}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
          title="Send Question"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
