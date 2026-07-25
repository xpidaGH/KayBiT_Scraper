import React from 'react';
import { Clock, FileText, Code, Tag, Layers, Flame } from 'lucide-react';
import { Note } from '../types';
import { getReadingMetrics } from '../utils/readingProgress';

interface NoteMetricsSectionProps {
  note: Note;
  compact?: boolean;
}

// Color palette generator for language density bars
const LANG_COLORS: Record<string, string> = {
  PYTHON: 'bg-amber-400 text-amber-950 border-amber-300',
  JAVASCRIPT: 'bg-yellow-400 text-yellow-950 border-yellow-300',
  TYPESCRIPT: 'bg-blue-500 text-white border-blue-400',
  HTML: 'bg-orange-500 text-white border-orange-400',
  CSS: 'bg-sky-400 text-sky-950 border-sky-300',
  SQL: 'bg-emerald-400 text-emerald-950 border-emerald-300',
  RUST: 'bg-red-500 text-white border-red-400',
  GO: 'bg-cyan-400 text-cyan-950 border-cyan-300',
  JAVA: 'bg-red-600 text-white border-red-500',
  CPP: 'bg-indigo-500 text-white border-indigo-400',
  C: 'bg-slate-400 text-slate-950 border-slate-300',
  BASH: 'bg-emerald-500 text-white border-emerald-400',
  JSON: 'bg-teal-400 text-teal-950 border-teal-300',
};

const BAR_COLORS: string[] = [
  'bg-emerald-400',
  'bg-cyan-400',
  'bg-indigo-400',
  'bg-amber-400',
  'bg-rose-400',
  'bg-teal-400',
];

export const NoteMetricsSection: React.FC<NoteMetricsSectionProps> = ({ note, compact = false }) => {
  const metrics = getReadingMetrics(note);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="my-2.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs shadow-inner space-y-2.5"
    >
      {/* Metrics Row: Word Count, Reading Time & Focus Time */}
      <div className={`grid ${note.focus_time_seconds && note.focus_time_seconds > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pb-2 border-b border-slate-800/80`}>
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60">
          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">Word Count</div>
            <div className="font-bold text-slate-100 font-mono text-xs">
              {metrics.wordCount} <span className="text-[10px] font-normal text-slate-400">words</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60">
          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">Read Time</div>
            <div className="font-bold text-cyan-300 font-mono text-xs">
              ~{metrics.readTimeMinutes} <span className="text-[10px] font-normal text-cyan-400/70">min</span>
            </div>
          </div>
        </div>

        {note.focus_time_seconds !== undefined && note.focus_time_seconds > 0 && (
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-emerald-500/30">
            <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">Focused</div>
              <div className="font-bold text-emerald-400 font-mono text-xs">
                {Math.floor(note.focus_time_seconds / 60)}m {note.focus_time_seconds % 60}s
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Language & Tag Density Breakdown */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Language & Tag Density
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {metrics.tagDensityScore > 0 ? `${metrics.tagDensityScore} tags/100w` : `${metrics.tags.length} tags`}
          </span>
        </div>

        {/* Multi-segmented Language Density Bar */}
        {metrics.languageDensities.length > 0 ? (
          <div className="w-full bg-slate-900 rounded-full h-2.5 flex overflow-hidden border border-slate-800/90 my-1.5">
            {metrics.languageDensities.map((lang, idx) => (
              <div
                key={lang.language}
                title={`${lang.language}: ${lang.percentage}% (${lang.lines} lines)`}
                className={`h-full transition-all duration-300 ${BAR_COLORS[idx % BAR_COLORS.length]}`}
                style={{ width: `${lang.percentage}%` }}
              />
            ))}
          </div>
        ) : (
          <div className="w-full bg-slate-900/50 rounded h-1.5 border border-slate-800 my-1" />
        )}

        {/* Language Density Pills & Tag Badges */}
        <div className="flex items-center justify-between flex-wrap gap-1.5 mt-2">
          {/* Language Breakdown Pills */}
          <div className="flex items-center flex-wrap gap-1">
            {metrics.languageDensities.length > 0 ? (
              metrics.languageDensities.map((lang, idx) => {
                const colorClass = LANG_COLORS[lang.language] || 'bg-slate-800 text-slate-200 border-slate-700';
                return (
                  <span
                    key={lang.language}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shadow-xs ${colorClass}`}
                  >
                    <Code className="w-2.5 h-2.5 opacity-80" />
                    {lang.language}
                    <span className="opacity-80 font-normal">({lang.percentage}%)</span>
                  </span>
                );
              })
            ) : (
              <span className="text-[10px] text-slate-500 font-mono italic">No code snippets</span>
            )}
          </div>

          {/* Tag Density Badge */}
          {metrics.tags.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <Tag className="w-3 h-3 text-emerald-400" />
              <span>{metrics.tags.length} Tag{metrics.tags.length > 1 ? 's' : ''} ({metrics.tagDensityScore}/100w)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
