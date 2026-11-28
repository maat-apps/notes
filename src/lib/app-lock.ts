import { lockData } from "@maat-apps/core/local";
import { createAppLock, parseLockEnrolment } from "@maat-apps/core/lock";

import { relockAfterMs, setLockEnrolment } from "./app-settings";
import { backups } from "./backup";
import { encryptionKey } from "./encryption-key";
import { notesStore } from "./storage";

// NEVER change this once the app has users: it's part of how their data is
// encrypted, so a different value makes every encrypted record unreadable.
export const HKDF_INFO = "notes-data-v1";

// The app lock (@maat-apps/core/lock): a WebAuthn gate that encrypts the
// notes and the update snapshot when the authenticator supports PRF, a UI
// gate otherwise.
export const appLock = createAppLock({
  name: "Notes",
  keyInfo: HKDF_INFO,
  keyHolder: encryptionKey,
  relockAfterMs,
  saveEnrolment: setLockEnrolment,
  data: lockData(notesStore, backups.lockPart),
});

/**
 * The key that opens notes put away under `lock`: prompts for that lock's
 * fingerprint; without a lock (notes set aside as unreadable), the current
 * key.
 */
export function keyForSetAsideNotes(lock: unknown): Promise<CryptoKey | null> {
  const enrolment = parseLockEnrolment(lock);
  if (!enrolment) return Promise.resolve(encryptionKey.get());
  return appLock.deriveKeyWith(enrolment);
}
