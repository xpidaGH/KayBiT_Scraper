import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';
import { Note, CodeSnippet } from './src/types';
import { INITIAL_SAMPLE_NOTES } from './src/data/sampleNotes';

const app = express();
const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json({ limit: '10mb' }));

// SQLite / File Persistence Layer
const DB_FILE_PATH = path.join(process.cwd(), 'kaybit_notes_db.json');

function loadNotesDatabase(): Note[] {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading local SQLite DB file:', err);
  }
  // Initialize with initial sample student notes
  saveNotesDatabase(INITIAL_SAMPLE_NOTES);
  return INITIAL_SAMPLE_NOTES;
}

function saveNotesDatabase(notes: Note[]): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving SQLite DB file:', err);
  }
}

let notesStore: Note[] = loadNotesDatabase();

// --- Language Detection Logic ---
function detectLanguageFromElement($elem: cheerio.Cheerio<any>, codeText: string): string {
  const classAttr = ($elem.attr('class') || '') + ' ' + ($elem.parent().attr('class') || '');
  
  // Class pattern matching: e.g. language-js, lang-py, highlight-cpp, brush: python
  const match = classAttr.match(/(?:lang|language|highlight|brush:?\s*)-([a-zA-Z0-9_+#-]+)/i);
  if (match && match[1]) {
    const rawLang = match[1].toLowerCase();
    const map: Record<string, string> = {
      js: 'javascript', ts: 'typescript', py: 'python',
      cpp: 'cpp', 'c++': 'cpp', cs: 'csharp', 'c#': 'csharp',
      rb: 'ruby', sh: 'bash', bash: 'bash', yml: 'yaml', yaml: 'yaml',
      htm: 'html', html: 'html', css: 'css', rs: 'rust', go: 'go',
      java: 'java', sql: 'sql', json: 'json'
    };
    return map[rawLang] || rawLang;
  }

  // Direct class match
  const lowerClass = classAttr.toLowerCase();
  if (lowerClass.includes('python') || lowerClass.includes('py')) return 'python';
  if (lowerClass.includes('javascript') || lowerClass.includes('js')) return 'javascript';
  if (lowerClass.includes('cpp') || lowerClass.includes('c++')) return 'cpp';
  if (lowerClass.includes('rust')) return 'rust';
  if (lowerClass.includes('html')) return 'html';
  if (lowerClass.includes('css')) return 'css';
  if (lowerClass.includes('sql')) return 'sql';

  // Heuristic syntax detection fallback
  if (/\b(def\s+[a-zA-Z0-9_]+\s*\(|import\s+[a-zA-Z0-9_]+|async\s+def|if __name__ ==)\b/.test(codeText)) return 'python';
  if (/\b(const\s+[a-zA-Z0-9_]+\s*=|function\s+[a-zA-Z0-9_]+\(|console\.log|=>|import\s+React)\b/.test(codeText)) return 'javascript';
  if (/\b(#include\s*<[a-zA-Z0-9_.]+>|std::cout|std::vector|int\s+main\(\))\b/.test(codeText)) return 'cpp';
  if (/\b(fn\s+main\(\)|let\s+mut\s+|pub\s+struct|match\s+|use\s+std::)\b/.test(codeText)) return 'rust';
  if (/^<[!a-zA-Z0-9]+.*?>/s.test(codeText) || /<\/([a-zA-Z0-9]+)>/.test(codeText)) return 'html';
  if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i.test(codeText)) return 'sql';

  return 'text';
}

// --- API ROUTES ---

// Health & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    online: true,
    dbType: 'SQLite3 File',
    noteCount: notesStore.length,
    pythonVersion: '3.14.4'
  });
});

// GET /api/notes
app.get('/api/notes', (req, res) => {
  const search = (req.query.search as string || '').toLowerCase().trim();
  
  if (!search) {
    return res.json(notesStore);
  }

  const filtered = notesStore.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(search);
    const summaryMatch = note.summary.toLowerCase().includes(search);
    const contentMatch = note.content.toLowerCase().includes(search);
    const tagMatch = note.tags.some(t => t.toLowerCase().includes(search));
    const langMatch = note.languages.some(l => l.toLowerCase().includes(search));
    const codeMatch = note.code_snippets.some(s => s.code.toLowerCase().includes(search) || (s.language && s.language.toLowerCase().includes(search)));
    
    return titleMatch || summaryMatch || contentMatch || tagMatch || langMatch || codeMatch;
  });

  res.json(filtered);
});

// GET /api/notes/:id
app.get('/api/notes/:id', (req, res) => {
  const note = notesStore.find(n => n.id === req.params.id);
  if (!note) {
    return res.status(404).json({ error: 'Note not found' });
  }
  res.json(note);
});

// POST /api/notes (Create custom note directly in SQLite)
app.post('/api/notes', (req, res) => {
  const { title, summary, content, tags, languages, code_snippets, domain, url } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Note title is required' });
  }

  const newNote: Note = {
    id: `note-${Date.now()}`,
    title: title.trim(),
    url: url || 'Voice Dictation',
    domain: domain || 'voice-dictation',
    summary: summary || (content ? content.slice(0, 250) + (content.length > 250 ? '...' : '') : 'Voice dictated note.'),
    content: content || 'No text content.',
    code_snippets: code_snippets || [],
    languages: languages || ['general'],
    tags: Array.from(new Set(['dictated', 'voice-note', ...(tags || [])])),
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
  };

  notesStore.unshift(newNote);
  saveNotesDatabase(notesStore);

  res.json({ success: true, note: newNote });
});

// POST /api/scrape
app.post('/api/scrape', async (req, res) => {
  const { url, custom_tags } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Target URL is required' });
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    // Set 10s fetch timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 KayBiT_Scraper/3.14',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract Title
    let title = $('title').first().text().trim() || $('h1').first().text().trim() || 'Scraped Tutorial Note';
    title = title.replace(/\s+/g, ' ');

    // Extract Code Snippets
    const codeSnippets: CodeSnippet[] = [];
    const detectedLangs = new Set<string>();
    const seenCodeHashes = new Set<string>();

    $('pre, code, div.highlight').each((idx, elem) => {
      const $elem = $(elem);
      const rawText = $elem.text().trim();

      // Skip tiny snippet fragments
      if (rawText.length < 10) return;

      // Hash to prevent duplicate pre & code nested tags
      const codeHash = rawText.slice(0, 100) + rawText.length;
      if (seenCodeHashes.has(codeHash)) return;
      seenCodeHashes.add(codeHash);

      const lang = detectLanguageFromElement($elem, rawText);
      detectedLangs.add(lang);

      codeSnippets.push({
        id: `snippet-${Date.now()}-${idx}`,
        language: lang,
        code: rawText,
        lineCount: rawText.split('\n').length
      });
    });

    // Summary Text
    const paragraphs: string[] = [];
    $('p, article, section').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 30 && !text.includes('Cookie') && !text.includes('Subscribe')) {
        paragraphs.push(text);
      }
    });

    const summaryText = paragraphs.slice(0, 3).join(' ').slice(0, 350) + (paragraphs.length > 0 ? '...' : '');
    const fullText = paragraphs.join('\n\n') || summaryText || 'Extracted documentation code snippets.';

    let domainName = 'web-source';
    try {
      domainName = new URL(targetUrl).hostname.replace('www.', '');
    } catch {}

    const languagesList = Array.from(detectedLangs);
    if (languagesList.length === 0) languagesList.push('general');

    const tagsList = Array.from(new Set([
      ...(custom_tags || []),
      ...languagesList,
      domainName
    ]));

    const newNote: Note = {
      id: `note-${Date.now()}`,
      title,
      url: targetUrl,
      domain: domainName,
      summary: summaryText,
      content: fullText,
      code_snippets: codeSnippets,
      languages: languagesList,
      tags: tagsList,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    // Save to SQLite Store
    notesStore.unshift(newNote);
    saveNotesDatabase(notesStore);

    res.json({
      success: true,
      note: newNote
    });

  } catch (err: any) {
    console.error('Scraping Error:', err.message);

    // Network Fallback Diagnostic Note Creation
    res.json({
      success: false,
      is_offline_fallback: true,
      error: `Network error reaching ${targetUrl}: ${err.message || 'Timeout/Disconnected'}. Offline SQLite local database remains accessible!`,
      warning: 'Switched to Offline Local SQLite Mode. You can query existing notes or retry when connected.'
    });
  }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const initialLen = notesStore.length;
  notesStore = notesStore.filter(n => n.id !== id);

  if (notesStore.length === initialLen) {
    return res.status(404).json({ success: false, error: 'Note not found' });
  }

  saveNotesDatabase(notesStore);
  res.json({ success: true, deleted_id: id, remaining: notesStore.length });
});

// PUT /api/notes/:id (Update student notes or tags)
app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const noteIndex = notesStore.findIndex(n => n.id === id);

  if (noteIndex === -1) {
    return res.status(404).json({ success: false, error: 'Note not found' });
  }

  const { student_notes, tags, title, summary, content, is_favorite, is_archived, focus_time_seconds } = req.body;
  if (student_notes !== undefined) notesStore[noteIndex].student_notes = student_notes;
  if (tags !== undefined) notesStore[noteIndex].tags = tags;
  if (title !== undefined) notesStore[noteIndex].title = title;
  if (summary !== undefined) notesStore[noteIndex].summary = summary;
  if (content !== undefined) notesStore[noteIndex].content = content;
  if (is_favorite !== undefined) notesStore[noteIndex].is_favorite = is_favorite;
  if (is_archived !== undefined) notesStore[noteIndex].is_archived = is_archived;
  if (focus_time_seconds !== undefined) notesStore[noteIndex].focus_time_seconds = focus_time_seconds;

  notesStore[noteIndex].updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

  saveNotesDatabase(notesStore);
  res.json({ success: true, note: notesStore[noteIndex] });
});

// POST /api/tags/rename - Rename a tag across all notes
app.post('/api/tags/rename', (req, res) => {
  const { oldTag, newTag } = req.body;
  if (!oldTag || !newTag || typeof oldTag !== 'string' || typeof newTag !== 'string') {
    return res.status(400).json({ success: false, error: 'oldTag and newTag strings are required' });
  }

  const sanitizedOld = oldTag.trim().toLowerCase();
  const sanitizedNew = newTag.trim().toLowerCase();

  let affectedCount = 0;

  notesStore = notesStore.map(note => {
    if (note.tags && note.tags.some(t => t.toLowerCase() === sanitizedOld)) {
      affectedCount++;
      const updatedTags = Array.from(new Set(
        note.tags.map(t => t.toLowerCase() === sanitizedOld ? sanitizedNew : t)
      ));
      return {
        ...note,
        tags: updatedTags,
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
    }
    return note;
  });

  saveNotesDatabase(notesStore);

  res.json({
    success: true,
    message: `Renamed tag '${oldTag}' to '${newTag}' across ${affectedCount} note(s).`,
    affectedCount,
    notes: notesStore
  });
});

// POST /api/tags/delete - Delete a tag across all notes
app.post('/api/tags/delete', (req, res) => {
  const { tag } = req.body;
  if (!tag || typeof tag !== 'string') {
    return res.status(400).json({ success: false, error: 'tag string is required' });
  }

  const sanitizedTag = tag.trim().toLowerCase();
  let affectedCount = 0;

  notesStore = notesStore.map(note => {
    if (note.tags && note.tags.some(t => t.toLowerCase() === sanitizedTag)) {
      affectedCount++;
      const updatedTags = note.tags.filter(t => t.toLowerCase() !== sanitizedTag);
      return {
        ...note,
        tags: updatedTags,
        updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
      };
    }
    return note;
  });

  saveNotesDatabase(notesStore);

  res.json({
    success: true,
    message: `Removed tag '${tag}' from ${affectedCount} note(s).`,
    affectedCount,
    notes: notesStore
  });
});

// POST /api/notes/:id/ai-summary (Generate 3-sentence Gemini summary & append metadata tag)
app.post('/api/notes/:id/ai-summary', async (req, res) => {
  const { id } = req.params;
  const noteIndex = notesStore.findIndex(n => n.id === id);

  if (noteIndex === -1) {
    return res.status(404).json({ success: false, error: 'Note not found in SQLite database.' });
  }

  const note = notesStore[noteIndex];
  const noteBody = note.content || note.summary || 'No text content available.';
  const snippetContext = (note.code_snippets || [])
    .map((s, i) => `Code Block #${i + 1} (${s.language}):\n${s.code}`)
    .join('\n\n');

  const fullPrompt = `Analyze the following programming tutorial note and generate a crisp, informative 3-sentence summary of the core concepts, technical syntax, and practical application.

Note Title: ${note.title}
Source Domain: ${note.domain}
Content:
${noteBody}

${snippetContext ? `Code Snippets:\n${snippetContext}` : ''}

CRITICAL REQUIREMENT: Output strictly a 3-sentence summary. Do not add intro/outro chatter or bullet points.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
      config: {
        systemInstruction: 'You are an expert software engineering assistant. Always generate clear, accurate 3-sentence summaries for programming notes.',
        temperature: 0.3
      }
    });

    const generatedText = response.text ? response.text.trim() : '';

    if (!generatedText) {
      return res.status(500).json({ success: false, error: 'Gemini model returned empty summary text.' });
    }

    // Update note summary
    notesStore[noteIndex].summary = generatedText;

    // Append 'ai-summarized' tag to metadata tags
    if (!notesStore[noteIndex].tags) {
      notesStore[noteIndex].tags = [];
    }
    if (!notesStore[noteIndex].tags.includes('ai-summarized')) {
      notesStore[noteIndex].tags.push('ai-summarized');
    }

    notesStore[noteIndex].updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    saveNotesDatabase(notesStore);

    return res.json({
      success: true,
      aiSummary: generatedText,
      note: notesStore[noteIndex]
    });
  } catch (err: any) {
    console.error('Gemini API Error in /api/notes/:id/ai-summary:', err);
    return res.status(500).json({
      success: false,
      error: `Gemini API Error: ${err.message || 'Unable to generate summary'}`
    });
  }
});

// POST /api/notes/:id/chat (Gemini AI Side-Panel Chat)
app.post('/api/notes/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { question, history, noteContext } = req.body;

  let note = notesStore.find(n => n.id === id) || noteContext;
  if (!note) {
    return res.status(404).json({ success: false, error: 'Note context not found.' });
  }

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ success: false, error: 'Question string is required.' });
  }

  const noteBody = note.content || note.summary || 'No content provided.';
  const snippetContext = (note.code_snippets || [])
    .map((s: any, i: number) => `Code Block #${i + 1} (${s.language}):\n${s.code}`)
    .join('\n\n');

  const systemInstruction = `You are an expert computer science tutor helping a student study programming notes.
Your primary role is to explain concepts clearly, break down complex syntax step-by-step, answer technical questions, and suggest practical examples.

Current Note Context:
Title: ${note.title}
Domain: ${note.domain}
Summary: ${note.summary || 'N/A'}
Content:
${noteBody}

${snippetContext ? `Extracted Code Snippets:\n${snippetContext}` : ''}

Format your response using Markdown (e.g. use bolding, bullet points, and code blocks with language identifiers like \`\`\`python ... \`\`\` where appropriate).
Keep your tone encouraging, direct, and focused on clear educational understanding.`;

  try {
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role && msg.text) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: question.trim() }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.4
      }
    });

    const reply = response.text ? response.text.trim() : 'No response received from Gemini.';

    return res.json({
      success: true,
      answer: reply
    });
  } catch (err: any) {
    console.error('Gemini Chat API Error:', err);
    return res.status(500).json({
      success: false,
      error: `Gemini Chat Error: ${err.message || 'Unable to connect to AI server.'}`
    });
  }
});

// JSON Export Utility
app.get('/api/notes/export/backup.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="kaybit_notes_backup.json"');
  res.json({
    app: 'KayBiT_Scraper',
    version: '3.14.4',
    exported_at: new Date().toISOString(),
    total_notes: notesStore.length,
    notes: notesStore
  });
});

// JSON Import Utility
app.post('/api/notes/import', (req, res) => {
  const { notes } = req.body;
  if (!Array.isArray(notes)) {
    return res.status(400).json({ success: false, error: 'Invalid JSON format: expected array of notes' });
  }

  let importedCount = 0;
  for (const item of notes) {
    if (item && item.id && item.title) {
      const idx = notesStore.findIndex(n => n.id === item.id);
      if (idx >= 0) {
        notesStore[idx] = { ...notesStore[idx], ...item };
      } else {
        notesStore.unshift(item);
      }
      importedCount++;
    }
  }

  saveNotesDatabase(notesStore);
  res.json({ success: true, importedCount, total: notesStore.length });
});

// Markdown Export Utility for single note
app.get('/api/notes/:id/markdown', (req, res) => {
  const note = notesStore.find(n => n.id === req.params.id);
  if (!note) {
    return res.status(404).send('Note not found');
  }

  let md = `# ${note.title}\n\n`;
  md += `- **Source URL**: ${note.url}\n`;
  md += `- **Scraped At**: ${note.created_at}\n`;
  md += `- **Tags**: ${note.tags.map(t => '`' + t + '`').join(', ')}\n\n`;
  md += `## Summary\n${note.summary}\n\n`;

  if (note.student_notes) {
    md += `## Student Notes\n${note.student_notes}\n\n`;
  }

  if (note.code_snippets.length > 0) {
    md += `## Code Snippets (${note.code_snippets.length})\n\n`;
    note.code_snippets.forEach((snippet, i) => {
      md += `### Snippet ${i + 1}: ${snippet.title || snippet.language}\n`;
      md += `\`\`\`${snippet.language}\n${snippet.code}\n\`\`\`\n\n`;
    });
  }

  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename="${note.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md"`);
  res.send(md);
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`KayBiT_Scraper Engine running on http://localhost:${PORT}`);
  });
}

startServer();
