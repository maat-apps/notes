import { PushPinSimple, Trash, X } from "@phosphor-icons/react";

import { BottomBar, BottomBarButton } from "@maat-apps/ui/bottom-bar";
import { useTranslation } from "../../i18n/use-translation";

/**
 * The bottom bar while notes are selected, in place of the usual one: clear
 * the selection, how many are selected, pin (or unpin, when every one
 * already is) and delete.
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
    <BottomBar
      settings={
        <BottomBarButton label={t("clearSelection")} onClick={onClear}>
          <X />
        </BottomBarButton>
      }
      action={
        <>
          <BottomBarButton
            label={allPinned ? t("unpin") : t("pin")}
            onClick={onTogglePin}
          >
            <PushPinSimple weight={allPinned ? "fill" : "regular"} />
          </BottomBarButton>
          <BottomBarButton label={t("deleteSelected")} onClick={onDelete}>
            <Trash />
          </BottomBarButton>
        </>
      }
    >
      <p className="m-0 min-w-0 flex-1 truncate px-1 text-left text-base font-medium">
        {t("selectedCount", { count })}
      </p>
    </BottomBar>
  );
}
