import {
  decryptJson,
  encryptJson,
  isEncryptedBlob,
} from "@maat-apps/core/crypto";
import { isRecord } from "@maat-apps/core/validation";

import {
  getSettingsSnapshot,
  whenLoaded as whenSettingsLoaded,
} from "./app-settings";
import { encryptionKey } from "./encryption-key";
import { kvGet, kvSet } from "./idb-store";
import { isEmptyNote } from "./note-utils";
import { parseNotes, type Note } from "./schemas";
import { DATA_KEY } from "./storage-keys";

// An in-memory copy of the notes is the source of truth once loaded;
// IndexedDB is the write-through backing store — read once in the background
// at startup, written in the background on every change (maat-core's
// docs/storage.md). Reads stay synchronous for callers, and screens
// subscribe to changes through useSyncExternalStore (src/hooks/use-notes.ts).

const EMPTY: Note[] = [];

const listeners = new Set<() => void>();
let notes: Note[] = EMPTY;
let loaded: Promise<void> | null = null;

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

async function loadNotes(): Promise<void> {
  await whenSettingsLoaded();
  if (getSettingsSnapshot().lock?.encryptionSupported) {
    // The app sits behind the lock screen until unlock succeeds, so the
    // notes are never needed — and never readable — before the key is.
    await encryptionKey.whenSet();
  }
  try {
    const stored = await kvGet<unknown>(DATA_KEY);
    const key = encryptionKey.get();
    const data =
      key && isEncryptedBlob(stored)
        ? await decryptJson<unknown>(key, stored)
        : stored;
    if (isRecord(data)) notes = parseNotes(data.notes);
  } catch {
    // Keep what's in memory — same fallback as a corrupt or missing value.
  } finally {
    emitChange();
  }
}

/** Starts the background read on first use; test-only to await directly. */
export function whenLoaded(): Promise<void> {
  loaded ??= loadNotes();
  return loaded;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotesSnapshot(): Note[] {
  void whenLoaded();
  return notes;
}

export function getServerNotesSnapshot(): Note[] {
  return EMPTY;
}

async function persist(data: { notes: Note[] }): Promise<void> {
  try {
    const key = encryptionKey.get();
    await kvSet(DATA_KEY, key ? await encryptJson(key, data) : data);
  } catch {
    // Best-effort — the in-memory copy (and this tab) already reflects it.
  }
}

function writeNotes(next: Note[]): void {
  notes = next;
  void persist({ notes: next });
  emitChange();
}

/** Replaces every note — backup import and the app lock's rewrite/erase. */
export function replaceAllNotes(next: Note[]): void {
  writeNotes(next);
}

/**
 * Saves a new or changed note, stamping `updatedAt`. A note with neither a
 * title nor content is deleted instead — empty notes are never kept.
 */
export function saveNote(note: Note, now = new Date()): void {
  if (isEmptyNote(note)) {
    deleteNote(note.id);
    return;
  }
  const saved = { ...note, updatedAt: now.toISOString() };
  const current = getNotesSnapshot();
  const exists = current.some((item) => item.id === note.id);
  writeNotes(
    exists
      ? current.map((item) => (item.id === note.id ? saved : item))
      : [...current, saved],
  );
}

export function deleteNote(id: string): void {
  const current = getNotesSnapshot();
  if (!current.some((note) => note.id === id)) return;
  writeNotes(current.filter((note) => note.id !== id));
}

/** Pinning isn't an edit, so it leaves `updatedAt` (the list order) alone. */
export function setPinned(id: string, pinned: boolean): void {
  writeNotes(
    getNotesSnapshot().map((note) =>
      note.id === id ? { ...note, pinned } : note,
    ),
  );
}
