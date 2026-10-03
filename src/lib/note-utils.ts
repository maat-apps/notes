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

/**
 * The list's order: notes without a `rank` (new, edited or never dragged)
 * first, most recently edited first, then the dragged-into-place notes by
 * their rank.
 */
function byListOrder(a: Note, b: Note): number {
  if (a.rank === undefined && b.rank === undefined) {
    return b.updatedAt.localeCompare(a.updatedAt);
  }
  if (a.rank === undefined) return -1;
  if (b.rank === undefined) return 1;
  return a.rank - b.rank;
}

/** The list's two sections, each in list order. */
export function groupNotes(notes: Note[]): { pinned: Note[]; others: Note[] } {
  const sorted = [...notes].sort(byListOrder);
  return {
    pinned: sorted.filter((note) => note.pinned),
    others: sorted.filter((note) => !note.pinned),
  };
}
