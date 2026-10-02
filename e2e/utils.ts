// Reusable Playwright test helpers — plain functions specs call directly,
// not test.extend() fixtures (hence "utils.ts", not "fixtures.ts" — see
// maat-core/STRUCTURE.md's Testing section for why that naming matters).
import { expect, type Page } from "@playwright/test";

export async function goHome(page: Page) {
  await page.goto("");
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
}

export async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click();
}

/** Creates a text note from the list and returns to it. */
export async function createTextNote(
  page: Page,
  { title, body }: { title?: string; body?: string },
) {
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByRole("button", { name: "Text note" }).click();
  if (title) await page.getByRole("textbox", { name: "Title" }).fill(title);
  if (body) await page.getByRole("textbox", { name: "Note" }).fill(body);
  await page.getByRole("button", { name: "Back" }).click();
}

/** Opens a new checklist and waits until its first item has focus. */
export async function newChecklist(page: Page) {
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByRole("button", { name: "Checklist" }).click();
  await expect(
    page.getByRole("textbox", { name: "List item" }).first(),
  ).toBeFocused();
}

/**
 * Resolves once the app-lock enrolment has reached IndexedDB. Settings
 * persist in the background, so a reload right after enrolling can lose
 * it and the app comes back unlocked.
 */
export async function waitForStoredLock(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const request = indexedDB.open("notes");
            request.onerror = () => resolve(false);
            request.onsuccess = () => {
              const read = request.result
                .transaction("kv")
                .objectStore("kv")
                .get("notes-settings");
              read.onerror = () => resolve(false);
              read.onsuccess = () =>
                resolve(
                  Boolean(
                    (read.result as { lock?: unknown } | undefined)?.lock,
                  ),
                );
            };
          }),
      ),
    )
    .toBe(true);
}
