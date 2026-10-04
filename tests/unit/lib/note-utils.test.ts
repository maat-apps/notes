import { describe, expect, it } from "vitest";

import {
  convertNote,
  createNote,
  duplicateNote,
  groupNotes,
  isEmptyNote,
} from "@/lib/note-utils";
import type { Note } from "@/lib/schemas";

const NOW = new Date("2026-10-01T10:00:00.000Z");

function textNote(overrides: Partial<Note> = {}): Note {
  return { ...createNote("text", NOW), ...overrides } as Note;
}

describe("createNote", () => {
  it("creates an empty text note", () => {
    expect(createNote("text", NOW)).toMatchObject({
      type: "text",
      title: "",
      body: "",
      pinned: false,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("creates an empty checklist with a unique id", () => {
    const first = createNote("checklist", NOW);
    expect(first).toMatchObject({ type: "checklist", items: [] });
    expect(createNote("checklist", NOW).id).not.toBe(first.id);
  });
});

describe("isEmptyNote", () => {
  it("is true for a blank text note", () => {
    expect(isEmptyNote(textNote({ title: "  ", body: "\n" } as Note))).toBe(
      true,
    );
  });

  it("is false with only a title", () => {
    expect(isEmptyNote(textNote({ title: "Ideas" }))).toBe(false);
  });

  it("is false with only a body", () => {
    expect(isEmptyNote(textNote({ body: "x" } as Note))).toBe(false);
  });

  it("is true for a checklist of blank items", () => {
    const note = {
      ...createNote("checklist", NOW),
      items: [{ id: "i1", text: " ", checked: true }],
    };
    expect(isEmptyNote(note)).toBe(true);
  });

  it("is false for a checklist with one real item", () => {
    const note = {
      ...createNote("checklist", NOW),
      items: [{ id: "i1", text: "Milk", checked: false }],
    };
    expect(isEmptyNote(note)).toBe(false);
  });
});

describe("groupNotes", () => {
  it("splits pinned from others, most recently edited first", () => {
    const old = textNote({ id: "old", updatedAt: "2026-01-01T00:00:00Z" });
    const recent = textNote({ id: "new", updatedAt: "2026-09-01T00:00:00Z" });
    const pinned = textNote({
      id: "pin",
      pinned: true,
      updatedAt: "2025-01-01T00:00:00Z",
    });

    const { pinned: pinnedNotes, others } = groupNotes([old, pinned, recent]);

    expect(pinnedNotes.map((note) => note.id)).toEqual(["pin"]);
    expect(others.map((note) => note.id)).toEqual(["new", "old"]);
  });
});

describe("groupNotes order", () => {
  const at = (id: string, updatedAt: string, rank?: number) =>
    textNote({ id, updatedAt, rank });
  const ids = (notes: Note[]) => notes.map((note) => note.id);

  it("lists never-dragged notes most recently edited first", () => {
    const { others } = groupNotes([
      at("old", "2026-10-01T08:00:00.000Z"),
      at("new", "2026-10-01T09:00:00.000Z"),
    ]);
    expect(ids(others)).toEqual(["new", "old"]);
  });

  it("lists dragged notes by rank, whatever their age", () => {
    const { others } = groupNotes([
      at("a", "2026-10-01T09:00:00.000Z", 1),
      at("b", "2026-10-01T08:00:00.000Z", 0),
    ]);
    expect(ids(others)).toEqual(["b", "a"]);
  });

  it("puts notes without a rank above the dragged ones", () => {
    const { others } = groupNotes([
      at("ranked", "2026-10-01T09:00:00.000Z", 0),
      at("fresh", "2026-10-01T07:00:00.000Z"),
    ]);
    expect(ids(others)).toEqual(["fresh", "ranked"]);
  });
});

describe("duplicateNote", () => {
  it("copies the content into a new, unpinned note", () => {
    const original = textNote({
      title: "Ideas",
      body: "x",
      pinned: true,
      rank: 3,
    } as Partial<Note>);
    const later = new Date("2026-10-02T10:00:00.000Z");

    const copy = duplicateNote(original, later);

    expect(copy).toMatchObject({
      type: "text",
      title: "Ideas",
      body: "x",
      pinned: false,
      rank: undefined,
    });
    expect(copy.id).not.toBe(original.id);
    expect(copy.updatedAt).toBe(later.toISOString());
  });
});

describe("convertNote", () => {
  const checklist = (items: [string, boolean?, boolean?][]): Note => ({
    ...createNote("checklist", NOW),
    title: "T",
    pinned: true,
    items: items.map(([text, checked = false, indented = false], index) => ({
      id: `i${index}`,
      text,
      checked,
      indented,
    })),
  });

  it("turns checklist items into lines, nested ones indented", () => {
    const converted = convertNote(
      checklist([["Milk"], ["Whole", true, true], ["Bread"]]),
    );
    expect(converted).toMatchObject({
      type: "text",
      title: "T",
      pinned: true,
      body: "Milk\n  Whole\nBread",
    });
  });

  it("skips empty items going to text", () => {
    const converted = convertNote(checklist([["Milk"], [""], ["  "]]));
    expect(converted).toMatchObject({ body: "Milk" });
  });

  it("turns lines into checklist items, indented lines nested", () => {
    const converted = convertNote(
      textNote({ body: "Milk\n  Whole\n\nBread" } as Partial<Note>),
    );
    expect(converted.type).toBe("checklist");
    const items = (converted as Extract<Note, { type: "checklist" }>).items;
    expect(items.map((item) => [item.text, item.indented])).toEqual([
      ["Milk", false],
      ["Whole", true],
      ["Bread", false],
    ]);
  });

  it("never nests the first item", () => {
    const converted = convertNote(
      textNote({ body: "  Indented first" } as Partial<Note>),
    );
    const items = (converted as Extract<Note, { type: "checklist" }>).items;
    expect(items[0].indented).toBe(false);
  });

  it("gives an empty text note one empty item to type into", () => {
    const converted = convertNote(textNote());
    expect(
      (converted as Extract<Note, { type: "checklist" }>).items,
    ).toHaveLength(1);
  });

  it("keeps the id, so the stored note is replaced", () => {
    const original = textNote({ body: "a" } as Partial<Note>);
    expect(convertNote(original).id).toBe(original.id);
  });
});
