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
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Gear, MagnifyingGlass } from "@phosphor-icons/react";
import { startTransition, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@maat-apps/ui/button";
import { EmptyState } from "@maat-apps/ui/empty-state";
import { Input } from "@maat-apps/ui/input";
import { PageHeader } from "@maat-apps/ui/page-header";
import { reorderIds } from "@maat-apps/ui/sortable-list";
import { useNotes } from "../../hooks/use-notes";
import { useTranslation } from "../../i18n/use-translation";
import { searchNotes } from "../../lib/note-search";
import { groupNotes } from "../../lib/note-utils";
import type { Note, NoteType } from "../../lib/schemas";
import { setNoteOrder } from "../../lib/storage";
import { SettingsDrawer } from "../settings/settings-drawer";

import { NewNoteMenu } from "./new-note-menu";
import { NoteCard } from "./note-card";

/**
 * A card that a long press picks up — only the card's drag, not its tap.
 * It follows the finger with a plain translate: the sortable's own
 * transform also scales the card to the size of the one it passes, which
 * stretches a short card (and its text) over a tall one.
 */
function SortableNoteCard({
  note,
  onOpen,
}: {
  note: Note;
  onOpen: () => void;
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
      <NoteCard note={note} onOpen={onOpen} />
    </div>
  );
}

function NoteSection({
  title,
  notes,
  onOpen,
  onReorder,
}: {
  title?: string;
  notes: Note[];
  onOpen: (id: string) => void;
  /** Cards can be dragged into a new order when this is given. */
  onReorder?: (orderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
  );
  if (notes.length === 0) return null;
  const ids = notes.map((note) => note.id);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const next = reorderIds(ids, String(active.id), String(over.id));
    if (next) onReorder?.(next);
  }

  const cards = notes.map((note) =>
    onReorder ? (
      <SortableNoteCard
        key={note.id}
        note={note}
        onOpen={() => onOpen(note.id)}
      />
    ) : (
      <NoteCard key={note.id} note={note} onOpen={() => onOpen(note.id)} />
    ),
  );

  return (
    <section className="grid gap-4" aria-label={title}>
      {title && (
        <h2 className="text-muted-foreground m-0 px-4 text-base font-medium">
          {title}
        </h2>
      )}
      {onReorder ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {cards}
          </SortableContext>
        </DndContext>
      ) : (
        cards
      )}
    </section>
  );
}

export function HomeView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notes = useNotes();
  const [query, setQuery] = useState("");
  const results = searchNotes(notes, query);
  const { pinned, others } = groupNotes(results);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Dragging reorders the whole list, so it waits until a search is cleared.
  const canReorder = query.trim() === "";
  const pinnedIds = pinned.map((note) => note.id);
  const otherIds = others.map((note) => note.id);

  function open(id: string) {
    startTransition(() => navigate(`/${encodeURIComponent(id)}`));
  }

  function create(type: NoteType) {
    setNewNoteOpen(false);
    startTransition(() => navigate(`/new/${type}`));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-[min(100%,480px)] flex-col gap-5 px-5 pt-27 pb-[calc(96px+env(safe-area-inset-bottom))]">
      <PageHeader>
        <h1 className="font-heading m-0 text-3xl leading-[1.05] font-bold tracking-tight">
          {t("appName")}
        </h1>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("settings")}
          onClick={() => setSettingsOpen(true)}
        >
          <Gear className="size-6" />
        </Button>
      </PageHeader>
      {notes.length > 0 && (
        <div className="relative">
          <MagnifyingGlass
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
          />
          <Input
            type="search"
            value={query}
            aria-label={t("searchNotes")}
            placeholder={t("searchNotes")}
            className="pl-10"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
      {notes.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : results.length === 0 ? (
        <EmptyState
          title={t("noMatchesTitle")}
          description={t("noMatchesDescription")}
        />
      ) : (
        <>
          <NoteSection
            title={pinned.length > 0 ? t("pinned") : undefined}
            notes={pinned}
            onOpen={open}
            onReorder={
              canReorder
                ? (ids) => setNoteOrder([...ids, ...otherIds])
                : undefined
            }
          />
          <NoteSection
            title={pinned.length > 0 ? t("others") : undefined}
            notes={others}
            onOpen={open}
            onReorder={
              canReorder
                ? (ids) => setNoteOrder([...pinnedIds, ...ids])
                : undefined
            }
          />
        </>
      )}
      <NewNoteMenu
        open={newNoteOpen}
        onOpenChange={setNewNoteOpen}
        onCreate={create}
      />
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
