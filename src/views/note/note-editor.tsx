import { PushPin, PushPinSlash } from "@phosphor-icons/react";
import { startTransition, useState } from "react";
import { useNavigate } from "react-router";

import { AppBar } from "@maat-apps/ui/app-bar";
import { Button } from "@maat-apps/ui/button";
import { ConfirmDrawer } from "@maat-apps/ui/confirm-drawer";
import { useSmartBack } from "@maat-apps/ui/smart-back";
import { useNote } from "../../hooks/use-notes";
import { useTranslation } from "../../i18n/use-translation";
import {
  canRedo,
  canUndo,
  EMPTY_HISTORY,
  type History,
  recordChange,
  redo,
  undo,
} from "../../lib/note-history";
import { convertNote, duplicateNote, isEmptyNote } from "../../lib/note-utils";
import type { Note } from "../../lib/schemas";
import {
  deleteNote,
  getNotesSnapshot,
  saveNote,
  setPinned,
} from "../../lib/storage";

import { ChecklistFields } from "./checklist-fields";
import { NoteMenu } from "./note-menu";
import { NoteToolbar } from "./note-toolbar";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
  const savedAt = useNote(note.id)?.updatedAt;

  function change(next: Note) {
    setHistory((current) => recordChange(current, note, next, Date.now()));
    setNote(next);
    saveNote(next);
  }

  // Undo and redo restore what the note said, not whether it was pinned:
  // pinning isn't an edit.
  function step(result: { history: History; note: Note } | null) {
    if (!result) return;
    const restored = { ...result.note, pinned: note.pinned };
    setHistory(result.history);
    setNote(restored);
    saveNote(restored);
  }

  function copy() {
    if (isEmptyNote(note)) return;
    const duplicate = duplicateNote(note);
    saveNote(duplicate);
    navigate(`/${encodeURIComponent(duplicate.id)}`, { replace: true });
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
    <div className="mx-auto grid min-h-dvh w-[min(100%,480px)] content-start gap-4 px-5 pt-27 pb-[calc(88px+env(safe-area-inset-bottom))]">
      <AppBar
        title={note.type === "text" ? t("textNote") : t("checklist")}
        backLabel={t("back")}
        onBack={() => startTransition(back)}
        action={
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
      <NoteToolbar
        updatedAt={savedAt}
        canUndo={canUndo(history)}
        canRedo={canRedo(history)}
        onUndo={() => step(undo(history, note))}
        onRedo={() => step(redo(history, note))}
        onMore={() => setMenuOpen(true)}
      />
      <NoteMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        type={note.type}
        onCopy={copy}
        onConvert={() => change(convertNote(note))}
        onDelete={() => setConfirmDelete(true)}
      />
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
