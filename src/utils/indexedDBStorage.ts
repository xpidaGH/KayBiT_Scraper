import { Note } from '../types';

const DB_NAME = 'KayBiT_StudyVault_DB';
const DB_VERSION = 1;
const NOTES_STORE = 'cached_notes';
const SYNC_QUEUE_STORE = 'pending_sync_queue';

export interface PendingSyncItem {
  id: string;
  note: Partial<Note> & { id: string };
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  timestamp: string;
}

// Open / Initialize IndexedDB
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Object store for caching full notes list offline
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }

      // Object store for pending offline / unstable changes queue
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Cache all notes locally into IndexedDB
export async function cacheNotesInIndexedDB(notes: Note[]): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(NOTES_STORE, 'readwrite');
    const store = tx.objectStore(NOTES_STORE);

    // Clear existing cache and insert fresh snapshot
    store.clear();
    notes.forEach((note) => {
      store.put(note);
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB auto-save cache warning:', err);
  }
}

// Retrieve cached notes from IndexedDB
export async function getCachedNotesFromIndexedDB(): Promise<Note[]> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const store = tx.objectStore(NOTES_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
    return [];
  }
}

// Record an unsynced change in IndexedDB queue
export async function queuePendingSync(
  note: Partial<Note> & { id: string },
  action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE'
): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction([NOTES_STORE, SYNC_QUEUE_STORE], 'readwrite');

    // Update local cache store immediately
    const notesStore = tx.objectStore(NOTES_STORE);
    if (action === 'DELETE') {
      notesStore.delete(note.id);
    } else {
      const getReq = notesStore.get(note.id);
      getReq.onsuccess = () => {
        const existing = getReq.result || {};
        notesStore.put({ ...existing, ...note });
      };
    }

    // Add to pending sync queue
    const queueStore = tx.objectStore(SYNC_QUEUE_STORE);
    const pendingItem: PendingSyncItem = {
      id: note.id,
      note,
      action,
      timestamp: new Date().toISOString()
    };
    queueStore.put(pendingItem);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error queuing pending sync in IndexedDB:', err);
  }
}

// Get all pending items in sync queue
export async function getPendingSyncQueue(): Promise<PendingSyncItem[]> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error fetching IndexedDB sync queue:', err);
    return [];
  }
}

// Remove a pending sync item after server confirmation
export async function dequeuePendingSync(noteId: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    store.delete(noteId);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error clearing item from IndexedDB queue:', err);
  }
}

// Sync all queued items in IndexedDB with SQLite backend
export async function syncIndexedDBWithSQLiteBackend(): Promise<{ syncedCount: number; errors: number }> {
  const queue = await getPendingSyncQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, errors: 0 };
  }

  let syncedCount = 0;
  let errors = 0;

  for (const item of queue) {
    try {
      if (item.action === 'DELETE') {
        const res = await fetch(`/api/notes/${item.id}`, { method: 'DELETE' });
        if (res.ok || res.status === 404) {
          await dequeuePendingSync(item.id);
          syncedCount++;
        } else {
          errors++;
        }
      } else if (item.action === 'CREATE') {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.note)
        });
        if (res.ok) {
          await dequeuePendingSync(item.id);
          syncedCount++;
        } else {
          errors++;
        }
      } else if (item.action === 'UPDATE') {
        const res = await fetch(`/api/notes/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.note)
        });
        if (res.ok) {
          await dequeuePendingSync(item.id);
          syncedCount++;
        } else {
          errors++;
        }
      }
    } catch (err) {
      console.warn(`Sync failed for item ${item.id}, retaining in IndexedDB for retry:`, err);
      errors++;
    }
  }

  return { syncedCount, errors };
}
