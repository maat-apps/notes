import {
  BackupError,
  backupFileName as coreBackupFileName,
  downloadBackup as coreDownloadBackup,
  shareBackup as coreShareBackup,
  readBackupEnvelope,
  readBackupJson,
} from "@maat-apps/core/backup";
import { isRecord } from "@maat-apps/core/validation";

import { parseNotes, type Note } from "./schemas";
import { getNotesSnapshot, replaceAllNotes } from "./storage";

// notes' backup format on top of @maat-apps/core/backup, which handles the
// envelope checks, the backup file and the download.

export { BackupError };

export const BACKUP_VERSION = 1;

export type Backup = {
  app: "notes";
  version: number;
  exportedAt: string;
  data: { notes: Note[] };
};

const messages = {
  notJson: "The file is not valid JSON.",
  wrongApp: "The file is not a notes backup.",
};

export function createBackup(): Backup {
  return {
    app: "notes",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { notes: getNotesSnapshot() },
  };
}

/** Validates a backup file's text; unrecognised notes are dropped. */
export function parseBackup(text: string): Backup {
  return parseBackupValue(readBackupJson(text, messages));
}

/** Same validation for an already-parsed value (e.g. the update snapshot). */
export function parseBackupValue(parsed: unknown): Backup {
  const envelope = readBackupEnvelope(parsed, { app: "notes", messages });
  const data = isRecord(envelope.data) ? envelope.data : {};
  return {
    app: "notes",
    version: BACKUP_VERSION,
    exportedAt: envelope.exportedAt,
    data: { notes: parseNotes(data.notes) },
  };
}

/** Overwrites every note with the backup's. */
export function applyBackup(backup: Backup): void {
  replaceAllNotes(backup.data.notes);
}

export function backupFileName(date = new Date()): string {
  return coreBackupFileName("notes", date);
}

export function downloadBackup(backup: Backup = createBackup()): void {
  coreDownloadBackup(backup);
}

/** Offers the backup to the share sheet; "unavailable" means download it. */
export function shareBackup(backup: Backup = createBackup()) {
  return coreShareBackup(backup);
}
