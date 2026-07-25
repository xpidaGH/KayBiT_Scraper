export interface CodeSnippet {
  id: string;
  language: string;
  code: string;
  title?: string;
  lineCount?: number;
}

export interface Note {
  id: string;
  title: string;
  url: string;
  domain: string;
  summary: string;
  content: string;
  code_snippets: CodeSnippet[];
  languages: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
  is_archived?: boolean;
  is_read_later?: boolean;
  focus_time_seconds?: number;
  student_notes?: string;
}

export interface ScrapeRequest {
  url: string;
  custom_tags?: string[];
}

export interface ScrapeResult {
  success: boolean;
  note?: Note;
  error?: string;
  is_offline_fallback?: boolean;
  warning?: string;
}

export interface PythonScriptFile {
  id: string;
  filename: string;
  platform: 'fastapi' | 'flet' | 'pywebview' | 'kivy' | 'buildozer' | 'readme';
  title: string;
  description: string;
  code: string;
}

export interface SystemStatus {
  online: boolean;
  dbType: 'SQLite3 File' | 'Local Cache' | 'Memory';
  noteCount: number;
  lastScrapedAt?: string;
  pythonVersion: string;
}
