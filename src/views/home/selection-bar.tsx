import { PushPinSimple, Trash, X } from "@phosphor-icons/react";

import { Button } from "@maat-apps/ui/button";
import { useTranslation } from "../../i18n/use-translation";

/**
 * The bar along the bottom of the list while notes are selected, in place
 * of the FAB: how many are selected, pin (or unpin, when every one already
 * is) and delete.
 */
export function SelectionBar({
  count,
  allPinned,
  onClear,
  onTogglePin,
  onDelete,
}: {
  count: number;
  allPinned: boolean;
  onClear: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="bg-background fixed inset-x-0 bottom-0 z-20">
      <div className="mx-auto flex w-[min(100%,480px)] items-center gap-1 px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("clearSelection")}
          onClick={onClear}
        >
          <X className="size-6" />
        </Button>
        <p className="m-0 min-w-0 flex-1 truncate text-left text-base font-medium">
          {t("selectedCount", { count })}
        </p>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={allPinned ? t("unpin") : t("pin")}
          onClick={onTogglePin}
        >
          <PushPinSimple
            weight={allPinned ? "fill" : "regular"}
            className="size-6"
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label={t("deleteSelected")}
          onClick={onDelete}
        >
          <Trash className="size-6" />
        </Button>
      </div>
    </div>
  );
}
