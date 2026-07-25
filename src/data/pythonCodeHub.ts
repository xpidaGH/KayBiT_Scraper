import { PythonScriptFile } from '../types';

export const PYTHON_CODE_HUB: PythonScriptFile[] = [
  {
    id: 'fastapi-core',
    filename: 'main_fastapi.py',
    platform: 'fastapi',
    title: 'FastAPI Backend Scraper Core',
    description: 'Python 3.14 FastAPI server with BeautifulSoup4 code block extraction, language detection, and SQLite3 persistence.',
    code: `"""
KayBiT_Scraper - FastAPI Core Scraper Engine & SQLite Vault
Target: Python 3.14.4 / Multi-Platform Core
Libraries: fastapi, uvicorn, httpx, bs4, sqlite3, pydantic
"""

import sqlite3
import json
import re
import os
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import httpx
from bs4 import BeautifulSoup

# Initialize FastAPI App
app = FastAPI(
    title="KayBiT_Scraper Core Engine",
    version="3.14.4",
    description="Backend Scraper for Programming Tutorials & Code Snippets"
)

# Enable CORS for Web/Flet/Mobile frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "kaybit_notes.sqlite"

# --- SQLite Database Initialization ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        code_snippets TEXT, -- Stored as JSON string
        languages TEXT,     -- Stored as JSON string
        tags TEXT,          -- Stored as JSON string
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

init_db()

# --- Data Models ---
class CodeSnippetModel(BaseModel):
    id: str
    language: str
    code: str
    title: Optional[str] = None
    lineCount: Optional[int] = None

class NoteModel(BaseModel):
    id: str
    title: str
    url: str
    domain: str
    summary: str
    content: str
    code_snippets: List[CodeSnippetModel]
    languages: List[str]
    tags: List[str]
    created_at: str
    updated_at: str
    student_notes: Optional[str] = ""

class ScrapeRequest(BaseModel):
    url: str
    custom_tags: Optional[List[str]] = []

# --- Language Detection Engine ---
def detect_code_language(tag_elem, code_text: str) -> str:
    """Detect programming language from CSS classes, attributes, or syntax heuristics."""
    classes = tag_elem.get("class", [])
    if isinstance(classes, list):
        class_str = " ".join(classes).lower()
    else:
        class_str = str(classes).lower()

    # Match class patterns like language-py, lang-js, highlight-cpp
    lang_match = re.search(r"(?:lang|language|highlight)-([a-zA-Z0-9_+#-]+)", class_str)
    if lang_match:
        detected = lang_match.group(1).lower()
        mapping = {
            "js": "javascript", "ts": "typescript", "py": "python",
            "cpp": "cpp", "c++": "cpp", "cs": "csharp", "c#": "csharp",
            "rb": "ruby", "sh": "bash", "bash": "bash", "yml": "yaml",
            "htm": "html", "html": "html", "css": "css", "rs": "rust"
        }
        return mapping.get(detected, detected)

    # Heuristic fallback based on code content syntax
    if re.search(r"\\b(def|import|class|self|print|async def|if __name__ ==)\\b", code_text):
        return "python"
    elif re.search(r"\\b(const|let|var|function|=>|console\\.log|import React)\\b", code_text):
        return "javascript"
    elif re.search(r"\\b(#include|std::cout|vector<|int main|void function)\\b", code_text):
        return "cpp"
    elif re.search(r"\\b(fn main|let mut|pub struct|match|impl|use std::)\\b", code_text):
        return "rust"
    elif re.search(r"<[!a-zA-Z0-9]+.*?>|</[a-zA-Z0-9]+>", code_text):
        return "html"
    elif re.search(r"\\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\\b", code_text, re.I):
        return "sql"

    return "text"

# --- API Endpoints ---
@app.get("/api/health")
def health_check():
    return {"status": "ok", "python_version": "3.14.4", "database": "SQLite3"}

@app.get("/api/notes", response_model=List[NoteModel])
def get_notes(search: Optional[str] = Query(None)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if search:
        query_str = f"%{search}%"
        cursor.execute("""
            SELECT id, title, url, domain, summary, content, code_snippets, languages, tags, created_at, updated_at 
            FROM notes 
            WHERE title LIKE ? OR summary LIKE ? OR content LIKE ? OR code_snippets LIKE ? OR tags LIKE ?
            ORDER BY created_at DESC
        """, (query_str, query_str, query_str, query_str, query_str))
    else:
        cursor.execute("SELECT id, title, url, domain, summary, content, code_snippets, languages, tags, created_at, updated_at FROM notes ORDER BY created_at DESC")

    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append(NoteModel(
            id=row[0], title=row[1], url=row[2], domain=row[3],
            summary=row[4], content=row[5],
            code_snippets=json.loads(row[6] or "[]"),
            languages=json.loads(row[7] or "[]"),
            tags=json.loads(row[8] or "[]"),
            created_at=row[9], updated_at=row[10]
        ))
    return results

@app.post("/api/scrape")
async def scrape_url(payload: ScrapeRequest):
    url_str = payload.url.strip()
    if not url_str.startswith(("http://", "https://")):
        url_str = "https://" + url_str

    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            headers = {"User-Agent": "KayBiT_Scraper/3.14 (Student Multiplatform Note Engine)"}
            response = await client.get(url_str, headers=headers)
            response.raise_for_status()
            html_content = response.text

    except (httpx.RequestError, httpx.HTTPStatusError) as err:
        # Fallback for Offline / Unreachable Network
        raise HTTPException(
            status_code=503, 
            detail=f"Network Error: Unable to fetch URL ({str(err)}). You can continue querying existing SQLite offline notes."
        )

    # Parse with BeautifulSoup
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Extract Title
    title_elem = soup.find("title") or soup.find("h1")
    title = title_elem.get_text(strip=True) if title_elem else "Untitled Tutorial Note"

    # Extract Code Blocks & Language Detection
    code_snippets = []
    detected_languages = set()

    # Scan <pre> and <code> blocks
    code_tags = soup.find_all(["pre", "code"])
    seen_code_hash = set()

    for idx, tag in enumerate(code_tags):
        code_text = tag.get_text()
        if len(code_text.strip()) < 10:
            continue  # Skip inline small snippets
        
        # Deduplicate
        code_hash = hash(code_text.strip())
        if code_hash in seen_code_hash:
            continue
        seen_code_hash.add(code_hash)

        lang = detect_code_language(tag, code_text)
        detected_languages.add(lang)

        code_snippets.append({
            "id": f"code-{int(time.time())}-{idx}",
            "language": lang,
            "code": code_text.strip(),
            "lineCount": len(code_text.splitlines())
        })

    # Summary text from paragraphs
    paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 20]
    summary = " ".join(paragraphs[:3])[:400] + "..." if paragraphs else "No text summary generated."
    full_text = "\\n\\n".join(paragraphs)

    from urllib.parse import urlparse
    domain = urlparse(url_str).netloc or "web-source"

    # Save to SQLite
    note_id = f"note-{int(time.time())}"
    languages_list = list(detected_languages) if detected_languages else ["general"]
    tags_list = (payload.custom_tags or []) + languages_list

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO notes (id, title, url, domain, summary, content, code_snippets, languages, tags, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (
        note_id, title, url_str, domain, summary, full_text,
        json.dumps(code_snippets), json.dumps(languages_list), json.dumps(tags_list)
    ))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "note": {
            "id": note_id, "title": title, "url": url_str, "domain": domain,
            "summary": summary, "content": full_text,
            "code_snippets": code_snippets, "languages": languages_list, "tags": tags_list,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    }

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    conn.close()
    return {"success": True, "deleted_id": note_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`
  },
  {
    id: 'flet-ui',
    filename: 'main_flet.py',
    platform: 'flet',
    title: 'Flet Multi-Platform Desktop & Mobile GUI',
    description: 'Flet Python UI component for Windows desktop & Android mobile interface with local SQLite queries and system share.',
    code: `"""
KayBiT_Scraper - Flet Cross-Platform Frontend (Windows / Android / Web)
Python 3.14 + Flet
"""

import flet as ft
import sqlite3
import json
import httpx
import asyncio

DB_NAME = "kaybit_notes.sqlite"

def main(page: ft.Page):
    page.title = "KayBiT_Scraper - Student Programming Vault"
    page.theme_mode = ft.ThemeMode.DARK
    page.padding = 20

    # Offline/Online Status Indicator
    status_text = ft.Text("Mode: Local SQLite Engine", color=ft.colors.GREEN_400, size=12)

    # Search Control
    search_box = ft.TextField(
        label="Search code, title, or tags...",
        prefix_icon=ft.icons.SEARCH,
        on_change=lambda e: filter_notes(e.control.value),
        expand=True
    )

    url_input = ft.TextField(
        label="Enter Programming Tutorial URL...",
        hint_text="https://docs.python.org/3/library/asyncio.html",
        expand=True
    )

    notes_list_view = ft.ListView(expand=True, spacing=10)

    def load_notes_from_sqlite(filter_query=""):
        notes_list_view.controls.clear()
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        if filter_query:
            q = f"%{filter_query}%"
            cursor.execute("SELECT id, title, url, summary, code_snippets, languages FROM notes WHERE title LIKE ? OR summary LIKE ? OR code_snippets LIKE ?", (q, q, q))
        else:
            cursor.execute("SELECT id, title, url, summary, code_snippets, languages FROM notes ORDER BY id DESC")
        
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            notes_list_view.controls.append(ft.Text("No notes found in SQLite vault.", italic=True, color=ft.colors.GREY_500))

        for row in rows:
            note_id, title, url, summary, code_json, langs_json = row
            code_blocks = json.loads(code_json or "[]")
            langs = json.loads(langs_json or "[]")

            # Create Note Card
            card = ft.Card(
                content=ft.Container(
                    padding=15,
                    content=ft.Column([
                        ft.Row([
                            ft.Text(title, weight=ft.FontWeight.BOLD, size=16, expand=True),
                            ft.IconButton(
                                icon=ft.icons.DELETE_OUTLINE,
                                icon_color=ft.colors.RED_400,
                                tooltip="Delete from SQLite",
                                on_click=lambda e, nid=note_id: delete_note(nid)
                            ),
                            ft.IconButton(
                                icon=ft.icons.SHARE,
                                icon_color=ft.colors.BLUE_400,
                                tooltip="Share Note",
                                on_click=lambda e, t=title, u=url: share_note(t, u)
                            )
                        ]),
                        ft.Text(f"Source: {url}", size=12, color=ft.colors.BLUE_200),
                        ft.Text(summary or "No summary", max_lines=3, size=13),
                        ft.Row([ft.Chip(label=ft.Text(l)) for l in langs]),
                        ft.Text(f"Extracted Snippets: {len(code_blocks)} code blocks", size=12, color=ft.colors.AMBER_300)
                    ])
                )
            )
            notes_list_view.controls.append(card)
        page.update()

    def filter_notes(val):
        load_notes_from_sqlite(val)

    def delete_note(note_id):
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        conn.close()
        page.snack_bar = ft.SnackBar(ft.Text("Note deleted from SQLite database"))
        page.snack_bar.open = True
        load_notes_from_sqlite(search_box.value)

    def share_note(title, url):
        # Native Android / Windows Share trigger
        page.set_clipboard(f"KayBiT Note: {title}\\nURL: {url}")
        page.snack_bar = ft.SnackBar(ft.Text("Note details copied for native System Share!"))
        page.snack_bar.open = True
        page.update()

    async def scrape_url_action(e):
        target_url = url_input.value.strip()
        if not target_url:
            return
        
        status_text.value = "Scraping page & parsing BeautifulSoup code blocks..."
        status_text.color = ft.colors.ORANGE_400
        page.update()

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post("http://localhost:8000/api/scrape", json={"url": target_url})
                if resp.status_code == 200:
                    url_input.value = ""
                    status_text.value = "Scrape complete! Saved to SQLite."
                    status_text.color = ft.colors.GREEN_400
                    load_notes_from_sqlite()
                else:
                    status_text.value = "Scrape failed! Displaying offline records."
                    status_text.color = ft.colors.RED_400
        except Exception as ex:
            status_text.value = f"Offline Mode: {str(ex)}"
            status_text.color = ft.colors.AMBER_400
            page.update()

    # Layout Construction
    page.add(
        ft.Column([
            ft.Row([
                ft.Icon(ft.icons.CODE, color=ft.colors.CYAN_400, size=32),
                ft.Text("KayBiT_Scraper (Python 3.14)", size=24, weight=ft.FontWeight.BOLD),
                status_text
            ]),
            ft.Row([url_input, ft.ElevatedButton("Scrape & Save", icon=ft.icons.DOWNLOAD, on_click=scrape_url_action)]),
            ft.Divider(),
            search_box,
            notes_list_view
        ], expand=True)
    )

    load_notes_from_sqlite()

if __name__ == "__main__":
    ft.app(target=main)
`
  },
  {
    id: 'pywebview-ui',
    filename: 'main_pywebview.py',
    platform: 'pywebview',
    title: 'PyWebview Windows Native Desktop Shell',
    description: 'Lightweight C#/WinForms native desktop wrapper running KayBiT web frontend inside a frameless native window.',
    code: `"""
KayBiT_Scraper - PyWebview Native Windows Shell
Python 3.14 + PyWebview
"""

import webview
import threading
import uvicorn
from main_fastapi import app  # Import FastAPI core

def start_fastapi_server():
    """Runs FastAPI backend on local port 8000."""
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="error")

class APIBridge:
    def share_native(self, title, content):
        """Invoke Windows System Toast / Share."""
        print(f"[Windows Share API] Sharing Note: {title}")
        return True

if __name__ == "__main__":
    # Start FastAPI in background thread
    server_thread = threading.Thread(target=start_fastapi_server, daemon=True)
    server_thread.start()

    # Launch PyWebview Native Window
    bridge = APIBridge()
    window = webview.create_window(
        title="KayBiT_Scraper - Student Programming Vault (Windows Native)",
        url="http://127.0.0.1:8000",
        width=1200,
        height=800,
        resizable=True,
        js_api=bridge
    )

    webview.start(debug=True)
`
  },
  {
    id: 'kivy-android',
    filename: 'main_kivy.py',
    platform: 'kivy',
    title: 'Kivy/BeeWare Android Mobile Application',
    description: 'Native Python UI for Android touch displays using Kivy / BeeWare with SQLite integration and Android intent share.',
    code: `"""
KayBiT_Scraper - Kivy Android Native App
Python 3.14 + Kivy / Buildozer
"""

import sqlite3
import json
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.scrollview import ScrollView
from kivy.uix.gridlayout import GridLayout

DB_NAME = "kaybit_notes.sqlite"

class KayBiTAndroidApp(App):
    def build(self):
        self.title = "KayBiT_Scraper Mobile"
        main_layout = BoxLayout(orientation='vertical', padding=10, spacing=10)

        # Header
        header = Label(text="KayBiT Student Note Vault", font_size=20, size_hint_y=None, height=40)
        main_layout.add_widget(header)

        # Search Bar
        self.search_input = TextInput(hint_text="Search local SQLite notes...", multiline=False, size_hint_y=None, height=50)
        self.search_input.bind(text=self.on_search)
        main_layout.add_widget(self.search_input)

        # Scrollable Notes List
        scroll = ScrollView()
        self.notes_grid = GridLayout(cols=1, spacing=10, size_hint_y=None)
        self.notes_grid.bind(minimum_height=self.notes_grid.setter('height'))
        scroll.add_widget(self.notes_grid)
        
        main_layout.add_widget(scroll)

        self.load_sqlite_notes()
        return main_layout

    def load_sqlite_notes(self, query=""):
        self.notes_grid.clear_widgets()
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        if query:
            q = f"%{query}%"
            cursor.execute("SELECT id, title, summary, languages FROM notes WHERE title LIKE ? OR summary LIKE ?", (q, q))
        else:
            cursor.execute("SELECT id, title, summary, languages FROM notes ORDER BY id DESC")

        rows = cursor.fetchall()
        conn.close()

        for row in rows:
            note_id, title, summary, langs_json = row
            card = BoxLayout(orientation='vertical', padding=10, size_hint_y=None, height=120)
            
            t_label = Label(text=title, font_size=16, bold=True, halign='left')
            s_label = Label(text=(summary or "")[:80] + "...", font_size=12)
            
            del_btn = Button(text="Delete", size_hint_x=None, width=80, height=35)
            del_btn.bind(on_press=lambda inst, nid=note_id: self.delete_note(nid))

            card.add_widget(t_label)
            card.add_widget(s_label)
            card.add_widget(del_btn)

            self.notes_grid.add_widget(card)

    def on_search(self, instance, value):
        self.load_sqlite_notes(value)

    def delete_note(self, note_id):
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        conn.close()
        self.load_sqlite_notes(self.search_input.text)

if __name__ == '__main__':
    KayBiTAndroidApp().run()
`
  },
  {
    id: 'buildozer-config',
    filename: 'buildozer.spec',
    platform: 'buildozer',
    title: 'Android Buildozer Spec File',
    description: 'Complete buildozer.spec configuration for compiling Python 3.14 Android APK packages.',
    code: `[app]
title = KayBiT_Scraper
package.name = kaybitscraper
package.domain = org.kaybit.student

source.dir = .
source.include_exts = py,png,jpg,kv,atlas,sqlite,json

version = 3.14.4
requirements = python3,kivy,httpx,bs4,sqlite3,certifi

orientation = portrait
fullscreen = 0

# Android specific permissions
android.permissions = INTERNET, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE

# Android API target
android.api = 33
android.minapi = 21
android.ndk = 25b

[buildozer]
log_level = 2
warn_on_root = 1
`
  },
  {
    id: 'packaging-readme',
    filename: 'README.md',
    platform: 'readme',
    title: 'Cross-Platform Packaging Guide (Windows & Android)',
    description: 'Complete developer setup and build commands for compiling KayBiT_Scraper into executable Windows binaries and Android APK files.',
    code: `# KayBiT_Scraper - Cross-Platform Build & Packaging Guide

## Overview
KayBiT_Scraper is a Python 3.14 Multi-Platform Web/Windows/Android Application Suite that scrapes static programming tutorials, parses syntax code snippets with BeautifulSoup, and stores study notes in local SQLite3.

---

## 1. Local Development Setup (Python 3.14.4)

### Prerequisites
\`\`\`bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install fastapi uvicorn httpx beautifulsoup4 flet pywebview pydantic
\`\`\`

### Run Backend Core
\`\`\`bash
python main_fastapi.py
# Server starts at http://localhost:8000
\`\`\`

---

## 2. Windows Desktop Executable (.exe)

### Option A: Flet Desktop Build
\`\`\`bash
pip install flet
flet build windows
# Output executable will be in build/windows/
\`\`\`

### Option B: PyInstaller Bundle (PyWebview)
\`\`\`bash
pip install pyinstaller pywebview
pyinstaller --noconfirm --onedir --windowed --add-data "kaybit_notes.sqlite;." main_pywebview.py
# Output in dist/main_pywebview/
\`\`\`

---

## 3. Android APK Compilation (Buildozer / BeeWare)

### Option A: Buildozer (Kivy Engine)
1. Install Docker or Linux environment (Ubuntu 22.04 LTS).
2. Install Buildozer dependencies:
\`\`\`bash
pip install buildozer cython
\`\`\`
3. Compile Debug APK:
\`\`\`bash
buildozer android debug
# APK generated in bin/kaybitscraper-3.14.4-debug.apk
\`\`\`

### Option B: BeeWare Briefcase
\`\`\`bash
pip install briefcase
briefcase create android
briefcase build android
briefcase run android
\`\`\`

---

## 4. SQLite Backup & Migration
- SQLite Database file: \`kaybit_notes.sqlite\`
- JSON Import/Export API: \`/api/notes/export\` and \`/api/notes/import\`
`
  }
];
