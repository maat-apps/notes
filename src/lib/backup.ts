import {
  BackupError,
  createLocalBackup,
  type LocalBackup,
} from "@maat-apps/core/local";

import { encryptionKey } from "./encryption-key";
import { keyValueStore } from "./idb-store";
import type { Note } from "./schemas";
import { mergeIntoNotes, notesStore } from "./storage";
import { SNAPSHOT_KEY } from "./storage-keys";

// notes' backup and pre-update snapshot (@maat-apps/core/local): the notes
// as `data`, validated through the same schema as storage read-back.

export { BackupError };

export const BACKUP_VERSION = 1;

export type Backup = LocalBackup<{ notes: Note[] }>;

export const backups = createLocalBackup({
  app: "notes",
  version: BACKUP_VERSION,
  store: notesStore,
  messages: {
    notJson: "The file is not valid JSON.",
    wrongApp: "The file is not a notes backup.",
  },
  snapshot: {
    storage: keyValueStore,
    key: SNAPSHOT_KEY,
    keyHolder: encryptionKey,
  },
});

export const createBackup = backups.create;

/** Validates a backup file's text; unrecognised notes are dropped. */
export const parseBackup = backups.parse;

/** Same validation for an already-parsed value (e.g. the update snapshot). */
export const parseBackupValue = backups.parseValue;

/** Overwrites every note with the backup's — restoring the update snapshot. */
export const applyBackup = backups.apply;

/** Import from Settings: keeps the notes on the device and adds the backup's. */
export function mergeBackup(backup: Backup): void {
  mergeIntoNotes(backup.data.notes);
}

export const backupFileName = backups.fileName;
export const downloadBackup = backups.download;

/** Offers the backup to the share sheet; "unavailable" means download it. */
export const shareBackup = backups.share;
