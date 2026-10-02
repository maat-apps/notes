import { Gear, Plus } from "@phosphor-icons/react";
import { startTransition, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@maat-apps/ui/button";
import { EmptyState } from "@maat-apps/ui/empty-state";
import { FabButton } from "@maat-apps/ui/fab-button";
import { PageHeader } from "@maat-apps/ui/page-header";
import { useNotes } from "../../hooks/use-notes";
import { useTranslation } from "../../i18n/use-translation";
import { groupNotes } from "../../lib/note-utils";
import type { Note, NoteType } from "../../lib/schemas";
import { SettingsDrawer } from "../settings/settings-drawer";

import { NewNoteDrawer } from "./new-note-drawer";
import { NoteCard } from "./note-card";

function NoteSection({
  title,
  notes,
  onOpen,
}: {
  title?: string;
  notes: Note[];
  onOpen: (id: string) => void;
}) {
  if (notes.length === 0) return null;
  return (
    <section className="grid gap-2.5" aria-label={title}>
      {title && (
        <h2 className="text-muted-foreground m-0 px-1 text-xs font-semibold tracking-wide uppercase">
          {title}
        </h2>
      )}
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} onOpen={() => onOpen(note.id)} />
      ))}
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
            onOpen={open}
          />
          <NoteSection
            title={pinned.length > 0 ? t("others") : undefined}
            notes={others}
            onOpen={open}
          />
        </>
      )}
      <FabButton
        className="fixed right-[max(20px,calc((100vw-480px)/2+20px))] bottom-[calc(20px+env(safe-area-inset-bottom))] z-20"
        ariaLabel={t("newNote")}
        onClick={() => setNewNoteOpen(true)}
      >
        <Plus className="size-6" />
      </FabButton>
      <NewNoteDrawer
        open={newNoteOpen}
        onOpenChange={setNewNoteOpen}
        onCreate={create}
      />
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
