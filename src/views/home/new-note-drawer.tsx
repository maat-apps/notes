import { CheckSquare, TextAlignLeft } from "@phosphor-icons/react";

import { Button } from "@maat-apps/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@maat-apps/ui/drawer";
import { useTranslation } from "../../i18n/use-translation";
import type { NoteType } from "../../lib/schemas";

/** The FAB's choice: a text note or a checklist. */
export function NewNoteDrawer({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (type: NoteType) => void;
}) {
  const { t } = useTranslation();
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader className="group-data-[swipe-axis=y]/drawer-popup:text-left">
          <DrawerTitle>{t("newNote")}</DrawerTitle>
        </DrawerHeader>
        <div className="grid gap-2.5 px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            size="lg"
            className="justify-start"
            onClick={() => onCreate("text")}
          >
            <TextAlignLeft aria-hidden="true" /> {t("textNote")}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="justify-start"
            onClick={() => onCreate("checklist")}
          >
            <CheckSquare aria-hidden="true" /> {t("checklist")}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
