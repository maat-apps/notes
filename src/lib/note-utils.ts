import type { ChecklistNote, Note, NoteType, TextNote } from "./schemas";

/** A fresh, empty note of the given type. */
export function createNote(type: "text", now?: Date): TextNote;
export function createNote(type: "checklist", now?: Date): ChecklistNote;
export function createNote(type: NoteType, now?: Date): Note;
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

/**
 * `current` plus the `incoming` notes it lacks; a note in both keeps the
 * more recently edited version, and ties keep the current one. Notes missing
 * from `incoming` are left alone — a merge never deletes.
 */
export function mergeNotes(current: Note[], incoming: Note[]): Note[] {
  const incomingById = new Map(incoming.map((note) => [note.id, note]));
  const merged = current.map((note) => {
    const other = incomingById.get(note.id);
    return other && other.updatedAt > note.updatedAt ? other : note;
  });
  const currentIds = new Set(current.map((note) => note.id));
  return [...merged, ...incoming.filter((note) => !currentIds.has(note.id))];
}
