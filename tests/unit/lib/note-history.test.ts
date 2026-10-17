import { describe, expect, it } from "vitest";

import {
  canRedo,
  canUndo,
  EMPTY_HISTORY,
  recordChange,
  redo,
  undo,
} from "@/lib/note-history";
import { createNote } from "@/lib/note-utils";
import type { ChecklistNote, Note, TextNote } from "@/lib/schemas";

const NOW = new Date("2026-10-01T10:00:00.000Z");

const text = (overrides: Partial<TextNote> = {}): TextNote => ({
  ...createNote("text", NOW),
  id: "n1",
  ...overrides,
});

const list = (texts: string[]): ChecklistNote => ({
  ...createNote("checklist", NOW),
  id: "n1",
  items: texts.map((value, index) => ({
    id: `i${index}`,
    text: value,
    checked: false,
    indented: false,
  })),
});

describe("recordChange", () => {
  it("starts with nothing to undo or redo", () => {
    expect(canUndo(EMPTY_HISTORY)).toBe(false);
    expect(canRedo(EMPTY_HISTORY)).toBe(false);
  });

  it("records the note a change replaced", () => {
    const before = text({ body: "a" });
    const history = recordChange(
      EMPTY_HISTORY,
      before,
      text({ body: "ab" }),
      0,
    );
    expect(history.past).toEqual([before]);
  });

  it("takes a quick burst of typing in one field as one step", () => {
    let history = recordChange(EMPTY_HISTORY, text(), text({ body: "a" }), 0);
    history = recordChange(
      history,
      text({ body: "a" }),
      text({ body: "ab" }),
      200,
    );
    history = recordChange(
      history,
      text({ body: "ab" }),
      text({ body: "abc" }),
      400,
    );
    expect(history.past).toEqual([text()]);
  });

  it("starts a new step after a pause", () => {
    let history = recordChange(EMPTY_HISTORY, text(), text({ body: "a" }), 0);
    history = recordChange(
      history,
      text({ body: "a" }),
      text({ body: "ab" }),
      5000,
    );
    expect(history.past).toHaveLength(2);
  });

  it("keeps edits of different fields apart", () => {
    let history = recordChange(EMPTY_HISTORY, text(), text({ title: "T" }), 0);
    history = recordChange(
      history,
      text({ title: "T" }),
      text({ title: "T", body: "b" }),
      100,
    );
    expect(history.past).toHaveLength(2);
  });

  it("keeps edits of different checklist items apart", () => {
    let history = recordChange(
      EMPTY_HISTORY,
      list(["a", "b"]),
      list(["ax", "b"]),
      0,
    );
    history = recordChange(history, list(["ax", "b"]), list(["ax", "bx"]), 100);
    expect(history.past).toHaveLength(2);
  });

  it("never absorbs a change that is not a plain text edit", () => {
    let history = recordChange(EMPTY_HISTORY, list(["a"]), list(["a", ""]), 0);
    history = recordChange(history, list(["a", ""]), list(["a", "", ""]), 100);
    expect(history.past).toHaveLength(2);
  });

  it("never absorbs a change that touches two items at once", () => {
    let history = recordChange(
      EMPTY_HISTORY,
      list(["a", "b"]),
      list(["ax", "bx"]),
      0,
    );
    history = recordChange(
      history,
      list(["ax", "bx"]),
      list(["axy", "bxy"]),
      100,
    );
    expect(history.past).toHaveLength(2);
  });

  it("never absorbs an item swapped for another", () => {
    const swapped = list(["a"]);
    swapped.items[0] = { ...swapped.items[0], id: "other", text: "b" };
    let history = recordChange(EMPTY_HISTORY, list(["a"]), swapped, 0);
    history = recordChange(history, swapped, list(["a"]), 100);
    expect(history.past).toHaveLength(2);
  });

  it("never absorbs a title edit that also changes the body", () => {
    let history = recordChange(
      EMPTY_HISTORY,
      text(),
      text({ title: "T", body: "b" }),
      0,
    );
    history = recordChange(
      history,
      text({ title: "T", body: "b" }),
      text({ title: "TT", body: "bb" }),
      100,
    );
    expect(history.past).toHaveLength(2);
  });

  it("never absorbs a change of the note's type", () => {
    let history = recordChange(
      EMPTY_HISTORY,
      text({ body: "a" }),
      list(["a"]),
      0,
    );
    history = recordChange(history, list(["a"]), text({ body: "a" }), 100);
    expect(history.past).toHaveLength(2);
  });

  it("drops what could be redone", () => {
    const first = recordChange(EMPTY_HISTORY, text(), text({ body: "a" }), 0);
    const undone = undo(first, text({ body: "a" }))!;
    const next = recordChange(
      undone.history,
      text(),
      text({ body: "z" }),
      9000,
    );
    expect(canRedo(next)).toBe(false);
  });

  it("keeps the last hundred steps", () => {
    let history = EMPTY_HISTORY;
    for (let step = 0; step < 150; step++) {
      history = recordChange(
        history,
        list([`${step}`]),
        list([`${step}`, ""]),
        step * 5000,
      );
    }
    expect(history.past).toHaveLength(100);
  });
});

describe("undo and redo", () => {
  it("steps back to the replaced note and forward again", () => {
    const original: Note = text();
    const edited: Note = text({ body: "hello" });
    const history = recordChange(EMPTY_HISTORY, original, edited, 0);

    const back = undo(history, edited)!;
    expect(back.note).toEqual(original);
    expect(canUndo(back.history)).toBe(false);

    const forward = redo(back.history, back.note)!;
    expect(forward.note).toEqual(edited);
    expect(canRedo(forward.history)).toBe(false);
  });

  it("does nothing when there is no step", () => {
    expect(undo(EMPTY_HISTORY, text())).toBeNull();
    expect(redo(EMPTY_HISTORY, text())).toBeNull();
  });
});
