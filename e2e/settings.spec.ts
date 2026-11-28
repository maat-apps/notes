import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { createTextNote, deleteOpenNote, goHome, openSettings } from "./utils";

// Made up for the test, like every other piece of data here.
const BACKUP_PASSWORD = "correct horse battery";

test("switching to Polish translates the app", async ({ page }) => {
  await goHome(page);
  await openSettings(page);

  await page.getByRole("combobox", { name: "Language" }).click();
  await page.getByRole("option", { name: "Polski" }).click();

  await expect(page.getByRole("heading", { name: "Ustawienia" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Notatki", exact: true }),
  ).toBeVisible();
});

test("a backup is saved with a password and only opens with it", async ({
  page,
}) => {
  await goHome(page);
  await createTextNote(page, { title: "Keep me" });
  await openSettings(page);

  await page.getByRole("button", { name: "Export" }).click();
  const protect = page.getByRole("dialog", {
    name: "Protect the backup with a password",
  });
  await protect.getByLabel("Password", { exact: true }).fill("short");
  await protect.getByLabel("Repeat password").fill("short");
  await protect.getByRole("button", { name: "Save backup" }).click();
  await expect(protect.getByRole("alert")).toHaveText(
    "Use at least 8 characters.",
  );
  await protect.getByLabel("Password", { exact: true }).fill(BACKUP_PASSWORD);
  await protect.getByLabel("Repeat password").fill(BACKUP_PASSWORD);
  const downloadPromise = page.waitForEvent("download");
  await protect.getByRole("button", { name: "Save backup" }).click();
  const download = await downloadPromise;
  const backup = await readFile(await download.path());
  expect(backup.toString()).not.toContain("Keep me");

  // Wipe by deleting the note, then bring it back from the file.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Keep me/ }).click();
  await deleteOpenNote(page);
  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();

  await openSettings(page);
  await page.getByLabel("Import notes").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "text/plain",
    buffer: backup,
  });
  const unlock = page.getByRole("dialog", {
    name: "This backup has a password",
  });
  await unlock.getByLabel("Password").fill("not the password");
  await unlock.getByRole("button", { name: "Open" }).click();
  await expect(unlock.getByRole("alert")).toHaveText(
    "Wrong password, or the file is damaged.",
  );
  await unlock.getByLabel("Password").fill(BACKUP_PASSWORD);
  await unlock.getByRole("button", { name: "Open" }).click();
  await page
    .getByRole("dialog", { name: "Add notes from the backup?" })
    .getByRole("button", { name: "Import" })
    .click();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: /Keep me/ })).toBeVisible();
});

test("an older backup without a password still imports", async ({ page }) => {
  await goHome(page);
  await openSettings(page);
  const plain = {
    app: "notes",
    version: 1,
    exportedAt: "2026-10-01T10:00:00.000Z",
    data: {
      notes: [
        {
          id: "old-1",
          type: "text",
          title: "From the old backup",
          body: "",
          pinned: false,
          createdAt: "2026-10-01T10:00:00.000Z",
          updatedAt: "2026-10-01T10:00:00.000Z",
        },
      ],
    },
  };

  await page.getByLabel("Import notes").setInputFiles({
    name: "notes-backup-2026-10-01.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(JSON.stringify(plain)),
  });
  await page
    .getByRole("dialog", { name: "Add notes from the backup?" })
    .getByRole("button", { name: "Import" })
    .click();
  await page.keyboard.press("Escape");

  await expect(
    page.getByRole("button", { name: /From the old backup/ }),
  ).toBeVisible();
});
