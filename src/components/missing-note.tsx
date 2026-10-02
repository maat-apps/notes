import { startTransition } from "react";
import { useNavigate } from "react-router";

import { Button } from "@maat-apps/ui/button";
import { useTranslation } from "../i18n/use-translation";

// Shown by "/:id" when the id no longer matches a stored note (deleted in
// another tab, or a stale link).
export function MissingNote() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="grid min-h-dvh place-items-center gap-4 px-5 text-center">
      <p className="m-0">{t("noteNotFound")}</p>
      <Button
        size="lg"
        onClick={() => startTransition(() => navigate("/", { replace: true }))}
      >
        {t("backToNotes")}
      </Button>
    </div>
  );
}
