import { describe, expect, it } from "vitest";

import { normalizeForSearch, searchNotes } from "@/lib/note-search";
import type { Note } from "@/lib/schemas";

const fields = {
  pinned: false,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
};

const notes: Note[] = [
  { ...fields, id: "a", type: "text", title: "Żółw", body: "Zielony" },
  { ...fields, id: "b", type: "text", title: "", body: "Kupić chleb" },
  {
    ...fields,
    id: "c",
    type: "checklist",
    title: "Zakupy",
    items: [{ id: "i", text: "Masło", checked: true }],
  },
];

const ids = (list: Note[]) => list.map((note) => note.id);

describe("normalizeForSearch", () => {
  it("drops case and diacritics, including ł", () => {
    expect(normalizeForSearch("Żółw ŁÓDŹ")).toBe("zolw lodz");
  });
});

describe("searchNotes", () => {
  it("returns every note for a blank query", () => {
    expect(searchNotes(notes, "  ")).toBe(notes);
  });

  it("matches titles without diacritics", () => {
    expect(ids(searchNotes(notes, "zolw"))).toEqual(["a"]);
  });

  it("matches text bodies", () => {
    expect(ids(searchNotes(notes, "CHLEB"))).toEqual(["b"]);
  });

  it("matches checklist items, checked or not", () => {
    expect(ids(searchNotes(notes, "maslo"))).toEqual(["c"]);
  });

  it("requires every word to match", () => {
    expect(ids(searchNotes(notes, "zolw zielony"))).toEqual(["a"]);
    expect(ids(searchNotes(notes, "zolw chleb"))).toEqual([]);
  });
});
