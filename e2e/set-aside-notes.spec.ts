import { readStored } from "@maat-apps/config/playwright";
import { expect, test } from "@playwright/test";

import {
  createTextNote,
  goHome,
  installControllableFingerprint,
  openSettings,
  waitForStoredLock,
} from "./utils";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The virtual authenticator with PRF is Chromium-only (CDP).",
);

test("turning the lock off without the fingerprint puts notes away, and the fingerprint brings them back", async ({
  page,
}) => {
  const fingerprint = await installControllableFingerprint(page);
  await goHome(page);
  await openSettings(page);
  await page.getByRole("switch", { name: "App lock" }).click();
  await expect(page.getByText(/Your notes are encrypted/)).toBeVisible();
  await waitForStoredLock(page);
  await page.keyboard.press("Escape");
  await createTextNote(page, { title: "Secret plans" });
  await expect
    .poll(() => readStored(page, "notes", "notes-data"))
    .toHaveProperty("ciphertext");

  // The fingerprint stops working: unlocking fails, and the lock is turned off.
  await fingerprint.setRecognised(false);
  await page.reload();
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.getByRole("button", { name: "Turn off the lock" }).click();
  await expect(
    page.getByRole("heading", { name: "Your notes will be put away" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Put away and continue" }).click();

  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const away = (await readStored(
        page,
        "notes",
        "notes-data-unreadable",
      )) as { setAside?: unknown[] } | undefined;
      return away?.setAside?.length;
    })
    .toBe(1);

  // It works again: the notes come back from Settings.
  await fingerprint.setRecognised(true);
  await openSettings(page);
  await expect(
    page.getByText(/put away when the lock was turned off \(1\)/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await expect(page.getByText("Notes brought back.")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("button", { name: /Secret plans/ }),
  ).toBeVisible();
});
