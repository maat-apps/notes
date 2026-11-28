import { useState } from "react";

import { Button } from "@maat-apps/ui/button";
import { SettingsRow } from "@maat-apps/ui/settings-primitives";
import { useSetAsideCount } from "../../hooks/use-notes";
import { useTranslation } from "../../i18n/use-translation";
import { keyForSetAsideNotes } from "../../lib/app-lock";
import { recoverSetAsideNotes } from "../../lib/storage";

/**
 * Notes put away when the lock was turned off without its fingerprint:
 * shown only while some wait, and opened again with that fingerprint.
 */
export function SetAsideNotesRow({
  onStatus,
}: {
  onStatus: (status: string | null) => void;
}) {
  const { t } = useTranslation();
  const count = useSetAsideCount();
  const [opening, setOpening] = useState(false);
  if (count === 0) return null;

  async function open() {
    onStatus(null);
    setOpening(true);
    try {
      const recovered = await recoverSetAsideNotes(keyForSetAsideNotes);
      onStatus(
        recovered > 0 ? t("setAsideNotesRecovered") : t("setAsideNotesFailed"),
      );
    } finally {
      setOpening(false);
    }
  }

  return (
    <SettingsRow
      title={t("setAsideNotes")}
      description={t("setAsideNotesDescription", { count })}
      action={
        <Button
          variant="outline"
          className="min-h-10.5 px-4"
          disabled={opening}
          onClick={() => void open()}
        >
          {t("setAsideNotesAction")}
        </Button>
      }
    />
  );
}
