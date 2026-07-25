import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Note } from '../types';
import { getReadingMetrics } from '../utils/readingProgress';
import { BookOpen, Clock, Code2, BarChart2, Layers, Award, Sparkles, TrendingUp, Flame } from 'lucide-react';

interface ReadingStatsViewProps {
  notes: Note[];
  onClose?: () => void;
}

const LANGUAGE_COLORS: Record<string, string> = {
  PYTHON: '#3572A5',
  JAVASCRIPT: '#f1e05a',
  TYPESCRIPT: '#3178c6',
  CPP: '#f34b7d',
  C: '#555555',
  RUST: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SQL: '#e38c00',
  BASH: '#89e051',
  JAVA: '#b07219',
  GO: '#00ADD8',
  GENERAL: '#10b981',
};

const DEFAULT_BAR_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
];

export const ReadingStatsView: React.FC<ReadingStatsViewProps> = ({ notes }) => {
  const [chartType, setChartType] = useState<'words' | 'snippets' | 'readingTime'>('words');

  // Compute aggregate stats across all notes in database
  let totalWordsInVault = 0;
  let totalReadTimeMinutes = 0;
  let totalCodeSnippets = 0;
  let totalFocusSeconds = 0;

  // Language breakdown map: language -> { wordCount, snippetCount, noteCount }
  const languageStatsMap: Record<string, { wordCount: number; snippetCount: number; noteCount: number }> = {};

  notes.forEach((note) => {
    const metrics = getReadingMetrics(note);
    totalWordsInVault += metrics.wordCount;
    totalReadTimeMinutes += metrics.readTimeMinutes;
    totalCodeSnippets += metrics.totalSnippets;
    totalFocusSeconds += (note.focus_time_seconds || 0);

    // Detect languages associated with this note
    const langSet = new Set<string>();
    (note.code_snippets || []).forEach((s) => {
      if (s.language) langSet.add(s.language.toUpperCase());
    });
    (note.languages || []).forEach((l) => langSet.add(l.toUpperCase()));

    if (langSet.size === 0) {
      langSet.add('GENERAL');
    }

    // Distribute words across languages in this note
    const wordsPerLang = Math.round(metrics.wordCount / langSet.size);

    langSet.forEach((lang) => {
      if (!languageStatsMap[lang]) {
        languageStatsMap[lang] = { wordCount: 0, snippetCount: 0, noteCount: 0 };
      }
      languageStatsMap[lang].wordCount += wordsPerLang;
      languageStatsMap[lang].noteCount += 1;
      
      // Add snippet count for this language
      const snippetsForLang = (note.code_snippets || []).filter(
        (s) => (s.language || 'general').toUpperCase() === lang
      ).length;
      languageStatsMap[lang].snippetCount += snippetsForLang || 1;
    });
  });

  // Prepare data array for Recharts
  const chartData = Object.entries(languageStatsMap)
    .map(([language, data]) => ({
      language,
      wordCount: data.wordCount,
      snippetCount: data.snippetCount,
      noteCount: data.noteCount,
      readTimeMin: Math.max(1, Math.ceil(data.wordCount / 200)),
      color: LANGUAGE_COLORS[language] || DEFAULT_BAR_COLORS[Math.abs(language.charCodeAt(0)) % DEFAULT_BAR_COLORS.length]
    }))
    .sort((a, b) => b.wordCount - a.wordCount);

  // Top programming language by word count
  const topLanguage = chartData[0]?.language || 'N/A';
  const avgWordsPerNote = notes.length > 0 ? Math.round(totalWordsInVault / notes.length) : 0;

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono space-y-1 z-50">
          <div className="font-bold text-slate-100 flex items-center gap-1.5 border-b border-slate-800 pb-1">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: data.color }}
            />
            {data.language} Programming Notes
          </div>
          <div className="text-emerald-400 font-semibold">
            Total Words: {data.wordCount.toLocaleString()} words
          </div>
          <div className="text-slate-300">
            Est. Reading Time: ~{data.readTimeMin} min
          </div>
          <div className="text-slate-400">
            Code Snippets: {data.snippetCount} | Notes: {data.noteCount}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-100">Reading Stats & Language Analytics</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Comprehensive analysis of content word counts, estimated reading duration, and programming language density across all {notes.length} notes in your vault.
          </p>
        </div>

        {/* Chart View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
          <button
            onClick={() => setChartType('words')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
              chartType === 'words'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Words / Lang
          </button>
          <button
            onClick={() => setChartType('readingTime')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
              chartType === 'readingTime'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Read Time
          </button>
          <button
            onClick={() => setChartType('snippets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${
              chartType === 'snippets'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Snippets
          </button>
        </div>
      </div>

      {/* Summary KPI Metrics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Total Word Count</span>
            <BookOpen className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {totalWordsInVault.toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Across {notes.length} stored notes</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Total Read Time</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-cyan-300">
            ~{totalReadTimeMinutes} <span className="text-xs font-normal">mins</span>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">At standard 200 WPM</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Focus Timer</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {Math.floor(totalFocusSeconds / 60)}m {totalFocusSeconds % 60}s
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Tracked focus study time</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Avg Words / Note</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-300">
            {avgWordsPerNote}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">Content density score</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Top Tech Stack</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 truncate">
            {topLanguage}
          </div>
          <p className="text-[10px] text-slate-500 font-mono">{totalCodeSnippets} total code snippets</p>
        </div>
      </div>

      {/* Main Recharts Bar Chart Container */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 font-mono">
            <Code2 className="w-4 h-4 text-emerald-400" />
            {chartType === 'words' && 'Words per Language Distribution'}
            {chartType === 'readingTime' && 'Estimated Reading Minutes per Language'}
            {chartType === 'snippets' && 'Code Snippet Count per Language'}
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Recharts Interactive Analytics
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="py-12 text-center text-slate-500 font-mono text-xs">
            No note data available to render charts yet.
          </div>
        ) : (
          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="language"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  dy={8}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={
                    chartType === 'words'
                      ? 'wordCount'
                      : chartType === 'readingTime'
                      ? 'readTimeMin'
                      : 'snippetCount'
                  }
                  name={
                    chartType === 'words'
                      ? 'Words'
                      : chartType === 'readingTime'
                      ? 'Minutes'
                      : 'Snippets'
                  }
                  radius={[6, 6, 0, 0]}
                  barSize={40}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="hover:opacity-80 transition cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend Pills below chart */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-800/80">
          {chartData.map((item) => (
            <div key={item.language} className="flex items-center gap-1.5 text-xs font-mono">
              <span
                className="w-3 h-3 rounded-full border border-slate-700"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 font-semibold">{item.language}:</span>
              <span className="text-slate-400">{item.wordCount.toLocaleString()} words</span>
            </div>
          ))}
        </div>
      </div>

      {/* Language Breakdown Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Language Density Share
          </h4>
          <div className="space-y-2">
            {chartData.map((item) => {
              const sharePercentage = totalWordsInVault > 0
                ? Math.round((item.wordCount / totalWordsInVault) * 100)
                : 0;

              return (
                <div key={item.language} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-200 font-semibold">{item.language}</span>
                    <span className="text-emerald-400">{sharePercentage}% ({item.wordCount} words)</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${sharePercentage}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vault Insights Summary */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Reading Insights & Highlights
          </h4>
          <ul className="space-y-2 text-xs text-slate-300 leading-relaxed font-sans">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span>
                <strong>Primary Language Focus:</strong> {topLanguage} accounts for the highest volume of tutorial notes and code snippets in your vault.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span>
                <strong>Estimated Total Study Time:</strong> Consuming your entire vault from start to finish takes ~{totalReadTimeMinutes} minutes ({Math.round(totalReadTimeMinutes / 60 * 10) / 10} hours).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span>
                <strong>Average Note Depth:</strong> Each note averages {avgWordsPerNote} words, ensuring concise study cards.
              </span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
};
