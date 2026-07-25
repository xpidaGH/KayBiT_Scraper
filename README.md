# Code & Web Study Notes Vault

An intelligent, full-stack web application designed for students, developers, and researchers to scrape web articles, organize programming notes, extract and format code snippets, and interact with a **Gemini AI Tutor** side-panel assistant.

---

## 🌟 Key Features

### 🕷️ Web Content Scraper & Code Extractor
- **Automated Web Scraping**: Enter any web URL to extract titles, main body text, domain metadata, and user-defined tags using Cheerio.
- **Automatic Code Snippet Detection**: Detects code blocks across multiple languages (Python, JavaScript, C++, TypeScript, Go, Java, Rust, HTML, CSS, SQL, Shell) and calculates line metrics.

### 🤖 Gemini AI Study Assistant
- **Interactive Side-Panel Tutor**: Ask questions about any note directly inside the note detail view, powered by Google's `gemini-3.6-flash` model.
- **One-Click Note Insertion**: Easily convert AI-generated explanations, study guides, or code examples into brand-new notes in your vault with a single click.
- **Suggested Prompts**: Preset study questions to quickly break down complex algorithms or generate practice quizzes.

### ⚡ Keyboard Shortcuts & Power Navigation
- `⌘K` / `Ctrl+K`: Jump directly to the instant search bar.
- `⌘N` / `Ctrl+N`: Open the Web Scraper modal.
- `⌘B` / `Ctrl+B`: Instantly return to the main Notes Vault view.

### 🐍 Built-in Python Code Hub & Tester
- **Interactive Playground**: Inspect, edit, and test Python code snippets directly inside the application.
- **Quick Snippet Extraction**: View all extracted Python code blocks across your entire vault in one centralized hub.

### 📊 Reading Analytics & Visualizations
- **Study Metrics**: Track total word count, estimated reading time, code snippet distribution, and note counts.
- **Visual Charts**: Interactive Recharts analytics illustrating language breakdown and content volume.

### 📄 PDF Export & Data Backup
- **PDF Generation**: Download clean, beautifully formatted PDF documents of any note with jsPDF.
- **JSON Backup & Import**: Backup your entire note collection or restore from JSON files.

### 📶 Offline Mode & IndexedDB Sync
- **Local Persistence**: Works offline seamlessly using browser IndexedDB.
- **Queue Synchronization**: Queues pending actions when offline and automatically syncs with the server once connectivity is restored.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, Motion, jsPDF
- **Backend**: Express.js server, Cheerio (web scraper), Node.js
- **AI Integration**: Google Gen AI SDK (`@google/genai`) with model `gemini-3.6-flash`
- **Build Tools**: TypeScript, esbuild, tsx

---

## 📁 Project Structure

```
├── server.ts                   # Express server & API routes (scraping, AI chat, notes storage)
├── src/
│   ├── App.tsx                 # Main application state & route coordinator
│   ├── types.ts                # TypeScript interfaces for Notes, Snippets, and Metrics
│   ├── components/             # UI Components
│   │   ├── Header.tsx          # App header, search bar, and main navigation
│   │   ├── NoteCard.tsx        # Card display with colored tag badges & metrics
│   │   ├── NoteDetailModal.tsx # Detailed view modal with editor and AI chat toggle
│   │   ├── AIChatSidePanel.tsx # Side-panel Gemini AI assistant interface
│   │   ├── ScrapeModal.tsx     # Web scraper dialog
│   │   ├── PythonCodeHubModal.tsx # Python code testing environment
│   │   ├── AnalyticsModal.tsx  # Recharts statistics dashboard
│   │   ├── CodeBlockViewer.tsx # Prism syntax highlighted code block
│   │   └── FocusTimer.tsx      # Integrated Pomodoro study timer
│   └── utils/                  # Helper utilities (IndexedDB, PDF generation, highlight text)
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- A Google Gemini API key set in your environment (`GEMINI_API_KEY`)

### Installation & Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create or edit `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will run on `http://localhost:3000`.

4. **Production Build & Execution**:
   ```bash
   npm run build
   npm start
   ```

---

## 📝 License

MIT License. Built for educational and productivity purposes.
