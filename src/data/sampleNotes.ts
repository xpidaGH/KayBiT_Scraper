import { Note } from '../types';

export const INITIAL_SAMPLE_NOTES: Note[] = [
  {
    id: 'note-sample-01',
    title: 'Python 3.14 AsyncIO & Structured Concurrency Guide',
    url: 'https://docs.python.org/3.14/library/asyncio-task.html',
    domain: 'docs.python.org',
    summary: 'AsyncIO is a Python 3.14 standard library module to write concurrent code using the async/await syntax. It provides high-level APIs to run Python coroutines concurrently, perform network I/O, and manage TaskGroups.',
    content: `AsyncIO provides high-performance asynchronous event loops for networking, database querying, and scraping. 

TaskGroups in Python 3.14 provide a robust mechanism for structured concurrency. When an exception occurs inside a TaskGroup, all remaining active child tasks are automatically cancelled and gathered safely.

### Key Concepts
1. **Coroutines**: Functions defined with \`async def\`.
2. **Tasks**: Scheduled coroutines running on the event loop.
3. **TaskGroups**: Modern context managers for managing task lifecycles without leaked background processes.`,
    code_snippets: [
      {
        id: 'code-p314-1',
        language: 'python',
        title: 'Structured Concurrency with TaskGroup in Python 3.14',
        lineCount: 15,
        code: `import asyncio
import httpx

async def fetch_tutorial(url: str, delay: int) -> str:
    print(f"Fetching {url}...")
    await asyncio.sleep(delay)
    return f"Scraped content from {url}"

async def main():
    urls = [
        ("https://docs.python.org/3/library/sqlite3.html", 1),
        ("https://fastapi.tiangolo.com/tutorial/", 2),
    ]
    
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(fetch_tutorial(u, d)) for u, d in urls]
        
    results = [t.result() for t in tasks]
    for res in results:
        print("Result:", res)

if __name__ == "__main__":
    asyncio.run(main())`
      },
      {
        id: 'code-p314-2',
        language: 'python',
        title: 'SQLite3 Local Storage Transaction Helper',
        lineCount: 12,
        code: `import sqlite3

def save_scraped_note(note_id: str, title: str, code_json: str):
    with sqlite3.connect("kaybit_notes.sqlite") as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO notes (id, title, code_snippets, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (note_id, title, code_json))
        conn.commit()
        print(f"Saved note {note_id} to SQLite database successfully!")`
      }
    ],
    languages: ['python', 'sql'],
    tags: ['python', 'asyncio', 'sqlite3', 'scraping', 'concurrency'],
    created_at: '2026-07-25 10:15:00',
    updated_at: '2026-07-25 10:15:00',
    is_favorite: true,
    student_notes: 'Essential for building non-blocking scraper cores in KayBiT_Scraper.'
  },
  {
    id: 'note-sample-02',
    title: 'Modern JavaScript DOM Code Block Parser & Class Tag Extractor',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll',
    domain: 'developer.mozilla.org',
    summary: 'Using querySelectorAll and RegExp to extract `<pre>` code blocks, parse language flags like `language-js` or `lang-cpp`, and handle fallback network timeout states gracefully.',
    content: `When scraping online documentation or programming blogs, syntax highlighter tags vary across sites (Prism.js, Highlight.js, Pygments).

A flexible DOM parsing routine checks:
1. CSS class list for \`language-*\` or \`lang-*\` prefixes.
2. Tag attributes such as \`data-language\` or \`data-lang\`.
3. Regex keyword matching as a fallback for unformatted plain code fences.`,
    code_snippets: [
      {
        id: 'code-js-1',
        language: 'javascript',
        title: 'DOM QuerySelector & Language Flag Matcher',
        lineCount: 18,
        code: `function extractCodeSnippetsFromDOM(rootDocument) {
  const codeNodes = rootDocument.querySelectorAll('pre code, div.highlight pre');
  const snippets = [];

  codeNodes.forEach((node, index) => {
    const classAttr = node.className || node.parentElement.className || '';
    const match = classAttr.match(/(?:lang|language)-([a-zA-Z0-9_-]+)/i);
    const detectedLang = match ? match[1].toLowerCase() : 'text';

    snippets.push({
      id: \`snippet-\${Date.now()}-\${index}\`,
      language: detectedLang,
      code: node.textContent.trim(),
      lineCount: node.textContent.trim().split('\\n').length
    });
  });

  return snippets;
}`
      }
    ],
    languages: ['javascript', 'html'],
    tags: ['javascript', 'dom', 'scraping', 'regex', 'frontend'],
    created_at: '2026-07-24 18:30:00',
    updated_at: '2026-07-24 18:30:00',
    student_notes: 'This regex extraction logic works cleanly across PrismJS and HighlightJS rendered sites.'
  },
  {
    id: 'note-sample-03',
    title: 'C++23 Memory Management & RAII Smart Pointers Cheatsheet',
    url: 'https://en.cppreference.com/w/cpp/memory/unique_ptr',
    domain: 'en.cppreference.com',
    summary: 'Standard C++ smart pointers std::unique_ptr and std::shared_ptr manage dynamically allocated object lifecycles safely without explicit delete calls, preventing memory leaks in high-performance native engines.',
    content: `Resource Acquisition Is Initialization (RAII) ensures that resources are bound to object lifetime. When a smart pointer goes out of scope, its destructor automatically frees heap-allocated memory.`,
    code_snippets: [
      {
        id: 'code-cpp-1',
        language: 'cpp',
        title: 'C++23 std::make_unique & RAII Vault Manager',
        lineCount: 20,
        code: `#include <iostream>
#include <memory>
#include <string>
#include <vector>

struct ScrapedBlock {
    std::string language;
    std::string code;
};

class StudentVault {
private:
    std::vector<ScrapedBlock> blocks;
public:
    void addBlock(const std::string& lang, const std::string& code) {
        blocks.push_back({lang, code});
        std::cout << "[C++ Vault] Recorded " << lang << " block.\\n";
    }
};

int main() {
    auto vault = std::make_unique<StudentVault>();
    vault->addBlock("cpp", "int main() { std::cout << \\"Hello C++23\\"; }");
    return 0;
}`
      }
    ],
    languages: ['cpp'],
    tags: ['cpp', 'memory', 'raii', 'pointers', 'cpp23'],
    created_at: '2026-07-23 14:10:00',
    updated_at: '2026-07-23 14:10:00',
    student_notes: 'Always prefer std::make_unique over raw new pointers in modern C++.'
  },
  {
    id: 'note-sample-04',
    title: 'Rust Ownership, Borrowing & Thread-Safe Scraper Pipeline',
    url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html',
    domain: 'doc.rust-lang.org',
    summary: 'Rust guarantees memory safety and thread safety without a garbage collector through its ownership system, references, and lifetime checks compiled at build time.',
    content: `Ownership rules in Rust:
1. Each value in Rust has an owner.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value is dropped.`,
    code_snippets: [
      {
        id: 'code-rust-1',
        language: 'rust',
        title: 'Rust Safe Concurrency & String Borrowing',
        lineCount: 16,
        code: `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let notes_counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..5 {
        let counter_clone = Arc::clone(&notes_counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Total Scraped Notes Processed: {}", *notes_counter.lock().unwrap());
}`
      }
    ],
    languages: ['rust'],
    tags: ['rust', 'concurrency', 'ownership', 'threads'],
    created_at: '2026-07-22 09:45:00',
    updated_at: '2026-07-22 09:45:00',
    student_notes: 'Arc<Mutex<T>> is Rust standard pattern for thread-safe shared state.'
  }
];
