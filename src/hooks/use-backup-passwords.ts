import type { DataSectionPasswords } from "@maat-apps/ui/settings-sections";

import { useTranslation } from "../i18n/use-translation";
import { backups, type Backup } from "../lib/backup";

/**
 * Password-protected backups for Settings → Export/Import and a shared
 * file: notes' backup kit and the password drawer's translated labels.
 */
export function useBackupPasswords(): DataSectionPasswords<Backup> {
  const { t } = useTranslation();
  return {
    exportWithPassword: backups.exportWithPassword,
    isEncrypted: backups.isEncrypted,
    parseWithPassword: backups.parseWithPassword,
    labels: {
      exportTitle: t("backupPasswordExportTitle"),
      exportDescription: t("backupPasswordExportDescription"),
      exportConfirm: t("backupPasswordExportConfirm"),
      importTitle: t("backupPasswordImportTitle"),
      importDescription: t("backupPasswordImportDescription"),
      importConfirm: t("backupPasswordImportConfirm"),
      password: t("backupPassword"),
      repeatPassword: t("backupPasswordRepeat"),
      tooShort: t("backupPasswordTooShort"),
      mismatch: t("backupPasswordMismatch"),
      wrongPassword: t("backupPasswordWrong"),
      cancel: t("cancel"),
    },
  };
}
