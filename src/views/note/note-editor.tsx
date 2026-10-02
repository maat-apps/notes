import { PushPin, PushPinSlash, Trash } from "@phosphor-icons/react";
import { startTransition, useState } from "react";
import { useNavigate } from "react-router";

import { AppBar } from "@maat-apps/ui/app-bar";
import { Button } from "@maat-apps/ui/button";
import { ConfirmDrawer } from "@maat-apps/ui/confirm-drawer";
import { useSmartBack } from "../../hooks/use-smart-back";
import { useTranslation } from "../../i18n/use-translation";
import type { Note } from "../../lib/schemas";
import {
  deleteNote,
  getNotesSnapshot,
  saveNote,
  setPinned,
} from "../../lib/storage";

import { ChecklistFields } from "./checklist-fields";
import { TextNoteFields } from "./text-note-fields";

function isStored(id: string): boolean {
  return getNotesSnapshot().some((note) => note.id === id);
}

/**
 * Edits one note in place. It holds its own draft (seeded once from
 * `initial`), and every change saves straight away — there's no Save
 * button (PRODUCT.md). A note emptied of all content is deleted by
 * saveNote, so the draft, not the store, drives what's on screen.
 */
export function NoteEditor({
  initial,
  isNew,
}: {
  initial: Note;
  isNew: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = useSmartBack("/");
  const [note, setNote] = useState(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function change(next: Note) {
    setNote(next);
    saveNote(next);
  }

  function togglePin() {
    const next = { ...note, pinned: !note.pinned };
    setNote(next);
    // Pinning alone isn't an edit (it keeps the note's place in the list);
    // an unsaved note keeps the pin in its draft until it has content.
    if (isStored(next.id)) setPinned(next.id, next.pinned);
  }

  function remove() {
    deleteNote(note.id);
    navigate("/", { replace: true });
  }

  return (
    <div className="mx-auto grid min-h-dvh w-[min(100%,480px)] content-start gap-4 px-5 pt-27 pb-[calc(32px+env(safe-area-inset-bottom))]">
      <AppBar
        title={note.type === "text" ? t("textNote") : t("checklist")}
        backLabel={t("back")}
        onBack={() => startTransition(back)}
        action={
          <div className="flex">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={note.pinned ? t("unpin") : t("pin")}
              aria-pressed={note.pinned}
              onClick={togglePin}
            >
              {note.pinned ? (
                <PushPinSlash className="size-6" />
              ) : (
                <PushPin className="size-6" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label={t("deleteNote")}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash className="size-6" />
            </Button>
          </div>
        }
      />
      <input
        value={note.title}
        aria-label={t("title")}
        placeholder={t("titlePlaceholder")}
        className="placeholder:text-muted-foreground w-full bg-transparent text-xl font-semibold outline-none"
        onChange={(event) => change({ ...note, title: event.target.value })}
      />
      {note.type === "text" ? (
        <TextNoteFields note={note} autoFocus={isNew} onChange={change} />
      ) : (
        <ChecklistFields note={note} autoFocus={isNew} onChange={change} />
      )}
      <ConfirmDrawer
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteNoteTitle")}
        description={t("deleteNoteDescription")}
        cancelLabel={t("cancel")}
        confirmLabel={t("delete")}
        onConfirm={remove}
      />
    </div>
  );
}
