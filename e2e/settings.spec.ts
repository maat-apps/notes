import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { createTextNote, goHome, openSettings } from "./utils";

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

test("a backup exports and imports back", async ({ page }) => {
  await goHome(page);
  await createTextNote(page, { title: "Keep me" });
  await openSettings(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
  const backup = await readFile(await download.path());

  // Wipe by deleting the note, then bring it back from the file.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Keep me/ }).click();
  await page.getByRole("button", { name: "Delete note" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();

  await openSettings(page);
  await page.getByLabel("Import notes").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "text/plain",
    buffer: backup,
  });
  await page.getByRole("button", { name: "Replace" }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: /Keep me/ })).toBeVisible();
});
