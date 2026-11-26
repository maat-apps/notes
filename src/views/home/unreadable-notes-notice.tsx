import { WarningCircle } from "@phosphor-icons/react";

import { useUnreadableNotes } from "../../hooks/use-notes";
import { useTranslation } from "../../i18n/use-translation";

/** Says so when the stored notes couldn't be read, and what was done instead. */
export function UnreadableNotesNotice() {
  const unreadable = useUnreadableNotes();
  const { t } = useTranslation();
  if (!unreadable) return null;
  return (
    <div
      role="alert"
      className="border-border grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border p-4"
    >
      <WarningCircle aria-hidden="true" className="row-span-2 size-6" />
      <p className="m-0 font-semibold">{t("unreadableNotesTitle")}</p>
      <p className="text-muted-foreground m-0 text-sm leading-normal">
        {unreadable.movedTo
          ? t("unreadableNotesMoved")
          : t("unreadableNotesKept")}
      </p>
    </div>
  );
}
