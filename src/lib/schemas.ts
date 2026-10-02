import { isRecord, parseEach } from "@maat-apps/core/validation";
import * as v from "valibot";

// The single source of truth for both runtime validation and the note types
// (via v.InferOutput). Anything read back from IndexedDB or a backup file is
// parsed with these, note by note, so one malformed note never takes the
// rest down with it.

const ChecklistItemSchema = v.object({
  id: v.string(),
  text: v.fallback(v.string(), ""),
  checked: v.fallback(v.boolean(), false),
  // One level of nesting: an indented item belongs to the nearest top-level
  // item above it (checklist-utils.ts). Optional, so items saved before
  // nesting existed stay valid.
  indented: v.fallback(v.optional(v.boolean()), false),
});

const NoteFieldsSchema = v.object({
  id: v.string(),
  title: v.fallback(v.string(), ""),
  pinned: v.fallback(v.boolean(), false),
  createdAt: v.string(),
  updatedAt: v.string(),
});

const TextNoteSchema = v.object({
  ...NoteFieldsSchema.entries,
  type: v.literal("text"),
  body: v.fallback(v.string(), ""),
});

// A checklist's own fields, without its items: the items are validated one
// by one (see parseNote), so one malformed item drops only itself.
const ChecklistNoteFieldsSchema = v.object({
  ...NoteFieldsSchema.entries,
  type: v.literal("checklist"),
});

export type ChecklistItem = v.InferOutput<typeof ChecklistItemSchema>;
export type TextNote = v.InferOutput<typeof TextNoteSchema>;
export type ChecklistNote = v.InferOutput<typeof ChecklistNoteFieldsSchema> & {
  items: ChecklistItem[];
};
export type Note = TextNote | ChecklistNote;
export type NoteType = Note["type"];

function parseNote(value: unknown): Note | null {
  if (!isRecord(value)) return null;
  if (value.type === "text") {
    const result = v.safeParse(TextNoteSchema, value);
    return result.success ? result.output : null;
  }
  const fields = v.safeParse(ChecklistNoteFieldsSchema, value);
  if (!fields.success) return null;
  return {
    ...fields.output,
    items: parseEach(ChecklistItemSchema, value.items),
  };
}

/** Every valid note in `value`; anything else (or a non-array) is dropped. */
export function parseNotes(value: unknown): Note[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const note = parseNote(item);
    return note ? [note] : [];
  });
}
