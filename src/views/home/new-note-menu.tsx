import { CheckSquare, Plus, TextAlignLeft, X } from "@phosphor-icons/react";
import { useEffect, type ReactNode } from "react";

import { FabButton } from "@maat-apps/ui/fab-button";
import { useTranslation } from "../../i18n/use-translation";
import type { NoteType } from "../../lib/schemas";

const FAB_POSITION = "fixed right-[max(20px,calc((100vw-480px)/2+20px))] z-20";

function MenuItem({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="bg-secondary text-secondary-foreground border-border flex h-14 items-center gap-3 rounded-full border px-6 text-lg font-medium shadow-lg active:opacity-80"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** The FAB; opening it fans out a text note and a checklist, as in Keep. */
export function NewNoteMenu({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (type: NoteType) => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          className="bg-background/80 fixed inset-0 z-10"
          onClick={() => onOpenChange(false)}
        />
      )}
      {open && (
        <div
          role="menu"
          aria-label={t("newNote")}
          className={`${FAB_POSITION} bottom-[calc(96px+env(safe-area-inset-bottom))] flex flex-col items-end gap-3`}
        >
          <MenuItem onClick={() => onCreate("checklist")}>
            <CheckSquare aria-hidden="true" className="size-6" />
            {t("checklist")}
          </MenuItem>
          <MenuItem onClick={() => onCreate("text")}>
            <TextAlignLeft aria-hidden="true" className="size-6" />
            {t("textNote")}
          </MenuItem>
        </div>
      )}
      <FabButton
        className={`${FAB_POSITION} bottom-[calc(20px+env(safe-area-inset-bottom))]`}
        ariaLabel={open ? t("close") : t("newNote")}
        onClick={() => onOpenChange(!open)}
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </FabButton>
    </>
  );
}
