import { takeSharedBackup } from "@maat-apps/core/share-target";
import { SharedBackupImport as SharedImport } from "@maat-apps/ui/shared-backup-import";

import { useBackupPasswords } from "../../hooks/use-backup-passwords";
import { useTranslation } from "../../i18n/use-translation";
import { backups, mergeBackup } from "../../lib/backup";
import { SHARED_BACKUP } from "../../lib/shared-backup";

function take() {
  return takeSharedBackup(SHARED_BACKUP);
}

/** A backup shared from another app, imported like Settings → Import. */
export function SharedBackupImport() {
  const { t } = useTranslation();
  const passwords = useBackupPasswords();
  return (
    <SharedImport
      take={take}
      parse={backups.parse}
      passwords={passwords}
      onImport={mergeBackup}
      labels={{
        importTitle: t("importTitle"),
        importDescription: t("importDescription"),
        importConfirm: t("importConfirm"),
        importFailed: t("importFailed"),
        cancel: t("cancel"),
        done: t("done"),
      }}
    />
  );
}
