import { useSyncExternalStore } from "react";

import type { Note } from "../lib/schemas";
import {
  getNotesSnapshot,
  getServerNotesSnapshot,
  subscribe,
} from "../lib/storage";

export function useNotes(): Note[] {
  return useSyncExternalStore(
    subscribe,
    getNotesSnapshot,
    getServerNotesSnapshot,
  );
}

/** One note by id, or `undefined` once loaded and it doesn't exist. */
export function useNote(id: string): Note | undefined {
  return useNotes().find((note) => note.id === id);
}
