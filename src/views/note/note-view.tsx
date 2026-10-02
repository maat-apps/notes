import { useState } from "react";
import { useParams } from "react-router";

import { MissingNote } from "../../components/missing-note";
import { useNote, useNotesReady } from "../../hooks/use-notes";
import { createItem } from "../../lib/checklist-utils";
import { createNote } from "../../lib/note-utils";
import type { Note } from "../../lib/schemas";

import { NoteEditor } from "./note-editor";

function freshNote(type: string | undefined): Note | null {
  if (type === "text") return createNote("text");
  // A new checklist starts with one empty item to type into.
  if (type === "checklist") {
    return { ...createNote("checklist"), items: [createItem()] };
  }
  return null;
}

/** "/new/:type": a fresh note, saved once it has any content. */
export function NewNoteView() {
  const { type } = useParams();
  const [note] = useState(() => freshNote(type));
  if (!note) return <MissingNote />;
  return <NoteEditor key={note.id} initial={note} isNew />;
}

/** "/:id": an existing note. */
export function NoteView() {
  const { id = "" } = useParams();
  const ready = useNotesReady();
  const stored = useNote(id);
  // Latched on first sight: emptying the note deletes it from the store,
  // but the editor (and its draft) must stay put while the user types.
  const [opened, setOpened] = useState<Note | null>(null);
  if (!opened && stored) setOpened(stored);

  if (opened)
    return <NoteEditor key={opened.id} initial={opened} isNew={false} />;
  if (!ready) return null;
  return <MissingNote />;
}
