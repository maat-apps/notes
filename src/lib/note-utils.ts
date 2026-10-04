import { createItem } from "./checklist-utils";
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

/** A copy of `note` as a new, unpinned note at the top of the list. */
export function duplicateNote(note: Note, now = new Date()): Note {
  return {
    ...note,
    id: crypto.randomUUID(),
    pinned: false,
    rank: undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function sharedFields(note: Note) {
  const { id, title, pinned, createdAt, updatedAt, rank } = note;
  return { id, title, pinned, createdAt, updatedAt, rank };
}

const NESTED_LINE = /^\s{2,}/;

/**
 * The note as the other type: a text note's lines become checklist items
 * (indented lines nest) and a checklist's items become lines (nested ones
 * indented). Checked state is dropped going to text; empty lines are dropped
 * going to a checklist. Title, id and pin stay.
 */
export function convertNote(note: Note): Note {
  if (note.type === "checklist") {
    const body = note.items
      .filter((item) => item.text.trim())
      .map((item) => `${item.indented ? "  " : ""}${item.text}`)
      .join("\n");
    return { ...sharedFields(note), type: "text", body };
  }
  const items = note.body
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) =>
      createItem(line.trim(), index > 0 && NESTED_LINE.test(line)),
    );
  return {
    ...sharedFields(note),
    type: "checklist",
    items: items.length > 0 ? items : [createItem()],
  };
}
