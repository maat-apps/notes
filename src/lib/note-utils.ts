import type { Note, NoteType } from "./schemas";

/** A fresh, empty note of the given type. */
export function createNote(type: NoteType, now = new Date()): Note {
  const fields = {
    id: crypto.randomUUID(),
    title: "",
    pinned: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  return type === "text"
    ? { ...fields, type, body: "" }
    : { ...fields, type, items: [] };
}

/**
 * A note with neither a title nor any content — never saved (see
 * PRODUCT.md). Whitespace doesn't count as content.
 */
export function isEmptyNote(note: Note): boolean {
  if (note.title.trim()) return false;
  return note.type === "text"
    ? !note.body.trim()
    : note.items.every((item) => !item.text.trim());
}

function byMostRecentlyEdited(a: Note, b: Note): number {
  return b.updatedAt.localeCompare(a.updatedAt);
}

/** The list's two sections, each most recently edited first. */
export function groupNotes(notes: Note[]): { pinned: Note[]; others: Note[] } {
  const sorted = [...notes].sort(byMostRecentlyEdited);
  return {
    pinned: sorted.filter((note) => note.pinned),
    others: sorted.filter((note) => !note.pinned),
  };
}
