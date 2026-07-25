import { Note } from '../types';

export interface LanguageDensity {
  language: string;
  snippetCount: number;
  lines: number;
  percentage: number;
}

export interface TagDensity {
  tag: string;
  densityPer100Words: number; // occurrences / tag count relative to words
}

export interface NoteMetrics {
  wordCount: number;
  percentage: number;
  readTimeMinutes: number;
  readTimeSeconds: number;
  languageDensities: LanguageDensity[];
  primaryLanguage: string;
  totalSnippets: number;
  totalCodeLines: number;
  tagDensityScore: number; // tags per 100 words
  tags: string[];
}

/**
 * Calculates word count for a note across all stored content fields.
 */
export function getNoteWordCount(note: Note): number {
  if (!note) return 0;

  const contentText = note.content || note.summary || '';
  const studentText = note.student_notes || '';
  const codeText = (note.code_snippets || []).map(s => s.code || '').join(' ');

  const contentWords = contentText.trim().split(/\s+/).filter(Boolean).length;
  const studentWords = studentText.trim().split(/\s+/).filter(Boolean).length;
  const codeWords = codeText.trim().split(/\s+/).filter(Boolean).length;

  return contentWords + studentWords + codeWords;
}

export function getReadingMetrics(note: Note): NoteMetrics {
  const wordCount = getNoteWordCount(note);
  
  // Benchmark target word count for 100% reading progress
  const TARGET_WORD_COUNT = 250;
  
  let percentage = 0;
  if (wordCount > 0) {
    percentage = Math.min(100, Math.max(5, Math.round((wordCount / TARGET_WORD_COUNT) * 100)));
  }

  // Estimated reading time assuming standard 200 words per minute
  const readTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const readTimeSeconds = Math.round((wordCount / 200) * 60);

  // Language & Tag Density calculations
  const snippets = note.code_snippets || [];
  const totalSnippets = snippets.length;
  let totalCodeLines = 0;

  const langMap: Record<string, { count: number; lines: number }> = {};

  snippets.forEach(s => {
    const lang = (s.language || 'text').toUpperCase();
    const lineCount = s.code ? s.code.split('\n').filter(l => l.trim().length > 0).length : 1;
    if (!langMap[lang]) {
      langMap[lang] = { count: 0, lines: 0 };
    }
    langMap[lang].count += 1;
    langMap[lang].lines += lineCount;
    totalCodeLines += lineCount;
  });

  // Include note.languages if snippet list missed any
  (note.languages || []).forEach(l => {
    const lang = l.toUpperCase();
    if (!langMap[lang]) {
      langMap[lang] = { count: 1, lines: 5 };
      totalCodeLines += 5;
    }
  });

  const languageDensities: LanguageDensity[] = Object.entries(langMap).map(([lang, data]) => {
    const langPercent = totalCodeLines > 0 ? Math.round((data.lines / totalCodeLines) * 100) : 0;
    return {
      language: lang,
      snippetCount: data.count,
      lines: data.lines,
      percentage: langPercent || (100 / (Object.keys(langMap).length || 1))
    };
  }).sort((a, b) => b.percentage - a.percentage);

  // Tag Density Score (tags per 100 words)
  const tagCount = (note.tags || []).length;
  const tagDensityScore = wordCount > 0 ? parseFloat(((tagCount / wordCount) * 100).toFixed(1)) : tagCount;

  return {
    wordCount,
    percentage,
    readTimeMinutes,
    readTimeSeconds,
    languageDensities,
    primaryLanguage: languageDensities[0]?.language || 'GENERAL',
    totalSnippets,
    totalCodeLines,
    tagDensityScore,
    tags: note.tags || []
  };
}
