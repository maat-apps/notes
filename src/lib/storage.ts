import { createLocalStore } from "@maat-apps/core/local";
import { isRecord } from "@maat-apps/core/validation";

import {
  getSettingsSnapshot,
  whenLoaded as whenSettingsLoaded,
} from "./app-settings";
import { encryptionKey } from "./encryption-key";
import { keyValueStore } from "./idb-store";
import { isEmptyNote } from "./note-utils";
import { parseNotes, type Note } from "./schemas";
import { DATA_KEY } from "./storage-keys";

// The notes in @maat-apps/core/local's store (maat-core's docs/storage.md):
// in memory once loaded, written through to IndexedDB, encrypted with the
// lock's key. Screens subscribe through src/hooks/use-notes.ts.

/** Whether the enrolled lock encrypts — then the first read waits for its key. */
export async function lockEncrypts(): Promise<boolean> {
  await whenSettingsLoaded();
  return getSettingsSnapshot().lock?.encryptionSupported === true;
}

export const notesStore = createLocalStore<Note[], { notes: Note[] }>({
  storage: keyValueStore,
  key: DATA_KEY,
  empty: [],
  parse: (stored) => (isRecord(stored) ? parseNotes(stored.notes) : []),
  serialize: (notes) => ({ notes }),
  encryption: { keyHolder: encryptionKey, encrypts: lockEncrypts },
});

/** Starts the background read on first use; test-only to await directly. */
export const whenLoaded = notesStore.whenLoaded;
export const subscribe = notesStore.subscribe;
export const getNotesSnapshot = notesStore.getSnapshot;
export const getServerNotesSnapshot = notesStore.getServerSnapshot;

/**
 * Whether the initial read has finished — until then "no such note" can't be
 * told apart from "not loaded yet" (a deep link to a note on a cold start).
 */
export const isNotesReady = notesStore.isReady;
export const isNotesReadyOnServer = notesStore.isReadyOnServer;

function writeNotes(next: Note[]): void {
  void notesStore.replace(next);
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
  deleteNotes([id]);
}

/** Deletes every note in `ids` at once; unknown ids are ignored. */
export function deleteNotes(ids: string[]): void {
  const doomed = new Set(ids);
  const current = getNotesSnapshot();
  if (!current.some((note) => doomed.has(note.id))) return;
  writeNotes(current.filter((note) => !doomed.has(note.id)));
}

export function setPinned(id: string, pinned: boolean): void {
  setPinnedNotes([id], pinned);
}

/** Pinning isn't an edit, so it leaves `updatedAt` (the list order) alone. */
export function setPinnedNotes(ids: string[], pinned: boolean): void {
  const targets = new Set(ids);
  writeNotes(
    getNotesSnapshot().map((note) =>
      targets.has(note.id) ? { ...note, pinned } : note,
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
