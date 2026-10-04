import { CheckSquare, Copy, TextAlignLeft, Trash } from "@phosphor-icons/react";
import { type ReactNode, useRef } from "react";

import { Button } from "@maat-apps/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@maat-apps/ui/drawer";
import { useTranslation } from "../../i18n/use-translation";
import type { NoteType } from "../../lib/schemas";

function MenuAction({
  icon,
  children,
  onClick,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="lg"
      className="justify-start"
      onClick={onClick}
    >
      {icon} {children}
    </Button>
  );
}

/** What can be done to the open note: copy it, switch its type, delete it. */
export function NoteMenu({
  open,
  onOpenChange,
  type,
  onCopy,
  onConvert,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: NoteType;
  onCopy: () => void;
  onConvert: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const chosen = useRef<(() => void) | null>(null);

  // The drawer steps through the browser history while it is open, so an
  // action that navigates or opens another drawer waits until this one has
  // finished closing.
  function choose(action: () => void) {
    chosen.current = action;
    onOpenChange(false);
  }

  function runChosen(isOpen: boolean) {
    if (isOpen || !chosen.current) return;
    const action = chosen.current;
    chosen.current = null;
    action();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={runChosen}
      showSwipeHandle
    >
      <DrawerContent>
        <DrawerHeader className="group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle>{t("moreActions")}</DrawerTitle>
        </DrawerHeader>
        <div className="grid gap-2.5 px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <MenuAction
            icon={<Copy aria-hidden="true" />}
            onClick={() => choose(onCopy)}
          >
            {t("makeCopy")}
          </MenuAction>
          <MenuAction
            icon={
              type === "text" ? (
                <CheckSquare aria-hidden="true" />
              ) : (
                <TextAlignLeft aria-hidden="true" />
              )
            }
            onClick={() => choose(onConvert)}
          >
            {type === "text" ? t("showCheckboxes") : t("hideCheckboxes")}
          </MenuAction>
          <MenuAction
            icon={<Trash aria-hidden="true" />}
            onClick={() => choose(onDelete)}
          >
            {t("deleteNote")}
          </MenuAction>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
