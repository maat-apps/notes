import { createAppSettings } from "@maat-apps/core/app-settings";

import { keyValueStore } from "./idb-store";
import { SETTINGS_KEY } from "./storage-keys";

// Settings that aren't part of the app's data (or a backup):
// @maat-apps/core/app-settings' lock enrolment, relock choice and installed
// flag, in memory and backed by IndexedDB.
export const appSettings = createAppSettings({
  storage: keyValueStore,
  key: SETTINGS_KEY,
  extra: {
    defaults: { lastBackupAt: null as string | null },
    parse: (stored) => ({ lastBackupAt: parseBackupTime(stored.lastBackupAt) }),
  },
});

function parseBackupTime(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

export type AppSettings = ReturnType<typeof appSettings.getSnapshot>;

/** Test-only: resolves once the initial background read has finished. */
export const whenLoaded = appSettings.whenLoaded;
export const subscribeToSettings = appSettings.subscribe;
export const getSettingsSnapshot = appSettings.getSnapshot;
export const getServerSettingsSnapshot = appSettings.getServerSnapshot;
// The lock gate must not treat "not loaded yet" as "no lock enrolled", or a
// locked device would flash its data on every cold start.
export const subscribeToSettingsReady = appSettings.subscribeReady;
export const isSettingsReady = appSettings.isReady;
export const isSettingsReadyOnServer = appSettings.isReadyOnServer;
export const setLockEnrolment = appSettings.setLockEnrolment;
export const setRelockAfter = appSettings.setRelockAfter;
export const relockAfterMs = appSettings.relockAfterMs;
export const markInstalled = appSettings.markInstalled;

/** Remembers that a backup was just shared or downloaded. */
export function markBackedUp(now = new Date()): void {
  appSettings.set({ lastBackupAt: now.toISOString() });
}
