import { readStored } from "@maat-apps/config/playwright";
import { expect, test } from "@playwright/test";

import { createTextNote, goHome } from "./utils";

// Encrypted-looking notes with no lock enrolled to open them: what's left
// after the lock's settings are lost.
const ENCRYPTED_NOTES = { iv: "AAAAAAAAAAAAAAAA", ciphertext: "AAAA" };

test("sets unreadable notes aside, says so, and keeps them through new edits", async ({
  page,
}) => {
  await goHome(page);
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("notes");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const transaction = open.result.transaction("kv", "readwrite");
          transaction.objectStore("kv").put(value, "notes-data");
          transaction.oncomplete = () => {
            open.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    ENCRYPTED_NOTES,
  );

  await page.reload();

  await expect(page.getByRole("alert")).toContainText(
    "Your saved notes couldn't be read",
  );
  await expect(page.getByRole("alert")).toContainText("set aside untouched");

  await createTextNote(page, { title: "After" });
  await expect(page.getByText("After")).toBeVisible();
  await expect
    .poll(() => readStored(page, "notes", "notes-data"))
    .toMatchObject({ notes: [expect.objectContaining({ title: "After" })] });
  expect(await readStored(page, "notes", "notes-data-unreadable")).toEqual(
    ENCRYPTED_NOTES,
  );
});
