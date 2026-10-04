import {
  ArrowUUpLeft,
  ArrowUUpRight,
  DotsThreeVertical,
} from "@phosphor-icons/react";

import { Button } from "@maat-apps/ui/button";
import { useTranslation } from "../../i18n/use-translation";
import { formatEdited } from "../../lib/format-edited";

/** The bar along the bottom of a note: undo, redo, when it was edited, more. */
export function NoteToolbar({
  updatedAt,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onMore,
}: {
  /** Absent until the note has been saved. */
  updatedAt: string | undefined;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onMore: () => void;
}) {
  const { t, locale } = useTranslation();
  // Keeps the note's input focused when a button is tapped, so the keyboard
  // stays up while undoing.
  const keepFocus = (event: { preventDefault: () => void }) =>
    event.preventDefault();

  return (
    <div className="bg-background fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto flex w-[min(100%,480px)] items-center gap-1 px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("undo")}
          disabled={!canUndo}
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={onUndo}
        >
          <ArrowUUpLeft className="size-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("redo")}
          disabled={!canRedo}
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={onRedo}
        >
          <ArrowUUpRight className="size-6" />
        </Button>
        <p className="text-muted-foreground m-0 min-w-0 flex-1 truncate text-center text-xs">
          {updatedAt &&
            t("editedAt", { when: formatEdited(updatedAt, locale) })}
        </p>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("moreActions")}
          onClick={onMore}
        >
          <DotsThreeVertical weight="bold" className="size-6" />
        </Button>
      </div>
    </div>
  );
}
