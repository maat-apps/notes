import { describe, expect, it } from "vitest";

import { createNote, groupNotes, isEmptyNote } from "@/lib/note-utils";
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
