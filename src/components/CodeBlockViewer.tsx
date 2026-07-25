import React, { useState, useEffect } from 'react';
import Prism from 'prismjs';
// Load Prism language components
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-markup'; // html
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import { Copy, Check, Code, ChevronDown, ChevronUp } from 'lucide-react';
import { CodeSnippet } from '../types';

interface CodeBlockViewerProps {
  snippet: CodeSnippet;
  defaultExpanded?: boolean;
}

export const CodeBlockViewer: React.FC<CodeBlockViewerProps> = ({ snippet, defaultExpanded = true }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    Prism.highlightAll();
  }, [snippet.code, isExpanded]);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizedLang = (snippet.language || 'text').toLowerCase();
  const displayLang = normalizedLang === 'cpp' ? 'C++' : 
                      normalizedLang === 'js' ? 'JavaScript' :
                      normalizedLang === 'ts' ? 'TypeScript' :
                      normalizedLang === 'py' ? 'Python' :
                      normalizedLang.toUpperCase();

  const lines = snippet.code.split('\n');
  const isLong = lines.length > 20;

  return (
    <div className="my-3 rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg transition-all hover:border-slate-700">
      {/* Code Block Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-semibold border border-emerald-500/20">
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            {displayLang}
          </span>
          {snippet.title && (
            <span className="font-medium text-slate-300 truncate max-w-xs">{snippet.title}</span>
          )}
          <span className="text-slate-500 text-[11px] font-mono">
            {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isLong && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Expand
                </>
              )}
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 transition text-xs font-medium cursor-pointer"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Area with Line Numbers */}
      <div className={`overflow-x-auto p-4 font-mono text-xs sm:text-sm bg-slate-950/90 ${!isExpanded && isLong ? 'max-h-64 overflow-y-hidden relative' : ''}`}>
        <pre className={`language-${normalizedLang}`}>
          <code className={`language-${normalizedLang}`}>
            {snippet.code}
          </code>
        </pre>

        {!isExpanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 to-transparent flex items-end justify-center pb-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md transition cursor-pointer"
            >
              Show all {lines.length} lines
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
