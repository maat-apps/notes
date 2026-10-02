import type { Note } from "./schemas";

/** Lower-cased, without diacritics, so "zolw" matches "Żółw". */
export function normalizeForSearch(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      // Letters NFD doesn't split into a base letter plus a diacritic.
      .replace(/ł/g, "l")
      .replace(/ø/g, "o")
      .replace(/đ/g, "d")
      .replace(/ß/g, "ss")
  );
}

function searchableText(note: Note): string {
  const content =
    note.type === "text"
      ? note.body
      : note.items.map((item) => item.text).join("\n");
  return normalizeForSearch(`${note.title}\n${content}`);
}

/**
 * The notes matching every word of `query` in their title, text or
 * checklist items. A blank query matches everything.
 */
export function searchNotes(notes: Note[], query: string): Note[] {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return notes;
  return notes.filter((note) => {
    const text = searchableText(note);
    return words.every((word) => text.includes(word));
  });
}
