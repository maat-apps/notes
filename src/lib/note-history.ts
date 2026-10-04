import type { Note } from "./schemas";

// Undo/redo for one editing session of a note. Every change records the note
// it replaced; typing into the same field in a quick burst records only the
// first, so one undo takes back the burst rather than a single character.

const COALESCE_MS = 1000;
const MAX_STEPS = 100;

export type History = {
  past: Note[];
  future: Note[];
  /** What the last change edited, while it can still absorb the next one. */
  lastKey: string | null;
  lastAt: number;
};

export const EMPTY_HISTORY: History = {
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
};

function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The single text field `next` edits in `prev`, or `null` for anything else. */
function editedField(prev: Note, next: Note): string | null {
  if (prev.title !== next.title) {
    return sameContent({ ...prev, title: next.title }, next) ? "title" : null;
  }
  if (prev.type === "text" && next.type === "text") {
    return sameContent(prev, { ...next, body: prev.body }) ? "body" : null;
  }
  if (prev.type === "checklist" && next.type === "checklist") {
    if (prev.items.length !== next.items.length) return null;
    const changed = next.items.filter(
      (item, index) => !sameContent(item, prev.items[index]),
    );
    if (changed.length !== 1) return null;
    const [item] = changed;
    const before = prev.items.find((entry) => entry.id === item.id);
    return before && sameContent({ ...before, text: item.text }, item)
      ? `item:${item.id}`
      : null;
  }
  return null;
}

/** The history after `prev` was replaced by `next`; a new edit drops redo. */
export function recordChange(
  history: History,
  prev: Note,
  next: Note,
  now: number,
): History {
  const key = editedField(prev, next);
  const absorbed =
    key !== null &&
    key === history.lastKey &&
    now - history.lastAt < COALESCE_MS &&
    history.past.length > 0;
  return {
    past: absorbed ? history.past : [...history.past, prev].slice(-MAX_STEPS),
    future: [],
    lastKey: key,
    lastAt: now,
  };
}

export function canUndo(history: History): boolean {
  return history.past.length > 0;
}

export function canRedo(history: History): boolean {
  return history.future.length > 0;
}

/** Steps back from `current`; `null` when there is nothing to undo. */
export function undo(
  history: History,
  current: Note,
): { history: History; note: Note } | null {
  const note = history.past.at(-1);
  if (!note) return null;
  return {
    note,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
      lastKey: null,
      lastAt: 0,
    },
  };
}

/** Steps forward from `current`; `null` when there is nothing to redo. */
export function redo(
  history: History,
  current: Note,
): { history: History; note: Note } | null {
  const [note, ...future] = history.future;
  if (!note) return null;
  return {
    note,
    history: {
      past: [...history.past, current],
      future,
      lastKey: null,
      lastAt: 0,
    },
  };
}
