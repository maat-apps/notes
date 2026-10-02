import { describe, expect, it } from "vitest";

import { parseNotes } from "@/lib/schemas";

const fields = {
  id: "n1",
  title: "Groceries",
  pinned: true,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-01T11:00:00.000Z",
};

describe("parseNotes", () => {
  it("keeps a valid text note", () => {
    const note = { ...fields, type: "text", body: "Milk" };
    expect(parseNotes([note])).toEqual([note]);
  });

  it("keeps a valid checklist note", () => {
    const note = {
      ...fields,
      type: "checklist",
      items: [{ id: "i1", text: "Milk", checked: true, indented: true }],
    };
    expect(parseNotes([note])).toEqual([note]);
  });

  it("reads an item saved before nesting, or a bad indent, as top-level", () => {
    const [note] = parseNotes([
      {
        ...fields,
        type: "checklist",
        items: [
          { id: "i1", text: "Old", checked: false },
          { id: "i2", text: "Bad", checked: false, indented: "yes" },
        ],
      },
    ]);
    expect(note).toMatchObject({
      items: [{ indented: false }, { indented: false }],
    });
  });

  it("drops only the malformed checklist items", () => {
    const [note] = parseNotes([
      {
        ...fields,
        type: "checklist",
        items: [{ id: "i1", text: "Milk" }, { text: "no id" }],
      },
    ]);
    expect(note).toMatchObject({
      items: [{ id: "i1", text: "Milk", checked: false }],
    });
  });

  it("defaults a missing title, pin and body", () => {
    const bare = {
      id: "n1",
      type: "text",
      createdAt: fields.createdAt,
      updatedAt: fields.updatedAt,
    };
    expect(parseNotes([bare])).toEqual([
      { ...bare, title: "", pinned: false, body: "" },
    ]);
  });

  it("drops notes with an unknown type or missing id", () => {
    expect(
      parseNotes([
        { ...fields, type: "drawing" },
        { ...fields, id: undefined, type: "text" },
        "not a note",
      ]),
    ).toEqual([]);
  });

  it("is empty for anything that isn't an array", () => {
    expect(parseNotes({ notes: [] })).toEqual([]);
  });
});
