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
let ready = false;

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
    ready = true;
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

/**
 * Whether the initial read has finished — until then "no such note" can't be
 * told apart from "not loaded yet" (a deep link to a note on a cold start).
 */
export function isNotesReady(): boolean {
  void whenLoaded();
  return ready;
}

export function isNotesReadyOnServer(): boolean {
  return false;
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
  // Editing sends a note back to the top, as in Keep.
  const saved = { ...note, updatedAt: now.toISOString(), rank: undefined };
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

/**
 * Fixes the list order: each id gets its position as `rank`. Pass every
 * note of the list in its new order, pinned section first.
 */
export function setNoteOrder(ids: string[]): void {
  const ranks = new Map(ids.map((id, index) => [id, index]));
  writeNotes(
    getNotesSnapshot().map((note) =>
      ranks.has(note.id) ? { ...note, rank: ranks.get(note.id) } : note,
    ),
  );
}
