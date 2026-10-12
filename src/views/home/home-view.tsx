import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Gear } from "@phosphor-icons/react";
import { startTransition, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@maat-apps/ui/button";
import { ConfirmDrawer } from "@maat-apps/ui/confirm-drawer";
import { EmptyState } from "@maat-apps/ui/empty-state";
import { PageHeader, PageTitle, SectionTitle } from "@maat-apps/ui/page-header";
import { reorderIds } from "@maat-apps/ui/sortable-list";
import { useNotes } from "../../hooks/use-notes";
import { useTranslation } from "../../i18n/use-translation";
import { groupNotes } from "../../lib/note-utils";
import type { Note, NoteType } from "../../lib/schemas";
import { deleteNotes, setNoteOrder, setPinnedNotes } from "../../lib/storage";
import { SettingsDrawer } from "../settings/settings-drawer";

import { NewNoteMenu } from "./new-note-menu";
import { NoteCard } from "./note-card";
import { SelectionBar } from "./selection-bar";

// A long press lifts a card: dragged, it moves the card; let go where it was
// picked up, it selects (or deselects) the card instead.
const LONG_PRESS = { delay: 250, tolerance: 8 };

/**
 * A card that a long press picks up — only the card's drag, not its tap.
 * It follows the finger with a plain translate: the sortable's own
 * transform also scales the card to the size of the one it passes, which
 * stretches a short card (and its text) over a tall one.
 */
function SortableNoteCard({
  note,
  selected,
  onClick,
}: {
  note: Note;
  selected: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, transform, transition, listeners, isDragging } =
    useSortable({ id: note.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`select-none [-webkit-touch-callout:none] ${isDragging ? "relative z-10 shadow-lg" : ""}`}
      {...listeners}
    >
      <NoteCard note={note} selected={selected} onClick={onClick} />
    </div>
  );
}

function NoteSection({
  title,
  notes,
  selectedIds,
  onTap,
  onLongPress,
  onReorder,
}: {
  title?: string;
  notes: Note[];
  selectedIds: Set<string>;
  onTap: (id: string) => void;
  onLongPress: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: LONG_PRESS }),
    useSensor(TouchSensor, { activationConstraint: LONG_PRESS }),
  );
  if (notes.length === 0) return null;
  const ids = notes.map((note) => note.id);

  function handleDragEnd({ active, over, delta }: DragEndEvent) {
    if (Math.hypot(delta.x, delta.y) < LONG_PRESS.tolerance) {
      onLongPress(String(active.id));
      return;
    }
    if (!over) return;
    const next = reorderIds(ids, String(active.id), String(over.id));
    if (next) onReorder(next);
  }

  return (
    <section className="grid gap-3" aria-label={title}>
      {title && <SectionTitle>{title}</SectionTitle>}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {notes.map((note) => (
            <SortableNoteCard
              key={note.id}
              note={note}
              selected={selectedIds.has(note.id)}
              onClick={() => onTap(note.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </section>
  );
}

export function HomeView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notes = useNotes();
  const { pinned, others } = groupNotes(notes);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Latched when the confirmation opens, so its title doesn't change while
  // it closes over the emptied selection.
  const [deleteCount, setDeleteCount] = useState(0);

  const pinnedIds = pinned.map((note) => note.id);
  const otherIds = others.map((note) => note.id);
  // A selected note can vanish under the selection (deleted elsewhere).
  const selectedNotes = notes.filter((note) => selection.has(note.id));
  const selectedIds = new Set(selectedNotes.map((note) => note.id));
  const selecting = selectedNotes.length > 0;
  const allPinned = selectedNotes.every((note) => note.pinned);

  function open(id: string) {
    startTransition(() => navigate(`/${encodeURIComponent(id)}`));
  }

  function toggleSelected(id: string) {
    const next = new Set(selectedIds);
    if (!next.delete(id)) next.add(id);
    setSelection(next);
  }

  function clearSelection() {
    setSelection(new Set());
  }

  /** While anything is selected, a tap selects or deselects instead. */
  function tap(id: string) {
    if (selecting) toggleSelected(id);
    else open(id);
  }

  function togglePinSelected() {
    setPinnedNotes([...selectedIds], !allPinned);
    clearSelection();
  }

  function askToDeleteSelected() {
    setDeleteCount(selectedNotes.length);
    setConfirmDelete(true);
  }

  function deleteSelected() {
    deleteNotes([...selectedIds]);
    clearSelection();
    setConfirmDelete(false);
  }

  function create(type: NoteType) {
    setNewNoteOpen(false);
    startTransition(() => navigate(`/new/${type}`));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-[min(100%,480px)] flex-col gap-4 px-5 pt-27 pb-[calc(128px+env(safe-area-inset-bottom))]">
      <PageHeader>
        <PageTitle>{t("appName")}</PageTitle>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("settings")}
          onClick={() => setSettingsOpen(true)}
        >
          <Gear className="size-6" />
        </Button>
      </PageHeader>
      {notes.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <>
          <NoteSection
            title={pinned.length > 0 ? t("pinned") : undefined}
            notes={pinned}
            selectedIds={selectedIds}
            onTap={tap}
            onLongPress={toggleSelected}
            onReorder={(ids) => setNoteOrder([...ids, ...otherIds])}
          />
          <NoteSection
            title={pinned.length > 0 ? t("others") : undefined}
            notes={others}
            selectedIds={selectedIds}
            onTap={tap}
            onLongPress={toggleSelected}
            onReorder={(ids) => setNoteOrder([...pinnedIds, ...ids])}
          />
        </>
      )}
      {selecting ? (
        <SelectionBar
          count={selectedNotes.length}
          allPinned={allPinned}
          onClear={clearSelection}
          onTogglePin={togglePinSelected}
          onDelete={askToDeleteSelected}
        />
      ) : (
        <NewNoteMenu
          open={newNoteOpen}
          onOpenChange={setNewNoteOpen}
          onCreate={create}
        />
      )}
      <ConfirmDrawer
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={
          deleteCount === 1
            ? t("deleteNoteTitle")
            : t("deleteNotesTitle", { count: deleteCount })
        }
        description={
          deleteCount === 1
            ? t("deleteNoteDescription")
            : t("deleteNotesDescription")
        }
        cancelLabel={t("cancel")}
        confirmLabel={t("delete")}
        onConfirm={deleteSelected}
      />
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
