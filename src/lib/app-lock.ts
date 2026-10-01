import { createAppLock } from "@maat-apps/core/lock";

import { setLockEnrolment } from "./app-settings";
import { discardUpdateSnapshot } from "./app-update";
import { encryptionKey } from "./encryption-key";
import { getNotesSnapshot, replaceAllNotes } from "./storage";

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
  saveEnrolment: setLockEnrolment,
  data: {
    rewrite: () => replaceAllNotes(getNotesSnapshot()),
    erase: async () => {
      replaceAllNotes([]);
      await discardUpdateSnapshot();
    },
  },
});
