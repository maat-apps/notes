// Reusable Playwright test helpers — plain functions specs call directly,
// not test.extend() fixtures (hence "utils.ts", not "fixtures.ts" — see
// maat-core/STRUCTURE.md's Testing section for why that naming matters).
import { readStored } from "@maat-apps/config/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

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

/**
 * Presses a note card and holds it until it lifts, as a long press does,
 * and returns where it was; the mouse is still down afterwards.
 */
export async function pressAndHold(page: Page, card: Locator) {
  const box = await card.boundingBox();
  if (!box) throw new Error("the card is not laid out");
  await page.mouse.move(box.x + 40, box.y + box.height / 2);
  await page.mouse.down();
  await expect(card.locator("xpath=..")).toHaveClass(/shadow-lg/);
  return box;
}

/** A long press that lets go without moving — it selects the card. */
export async function longPress(page: Page, card: Locator) {
  await pressAndHold(page, card);
  await page.mouse.up();
  // dnd-kit keeps swallowing clicks for 50ms after a drag ends, with nothing
  // on the page to wait for — a tap straight after would be lost.
  await page.waitForTimeout(100);
}

/** Deletes the note that is open, through the menu and its confirmation. */
export async function deleteOpenNote(page: Page) {
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Delete note" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
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
 * Drags a checklist item by its handle, `x` px sideways (right nests, left
 * un-nests) and `y` px down.
 */
export async function dragItemHandle(
  page: Page,
  item: string,
  { x = 0, y = 0 }: { x?: number; y?: number },
) {
  const grip = page.getByRole("button", { name: `Reorder ${item}` });
  const handle = await grip.boundingBox();
  if (!handle) throw new Error("the row is not laid out");
  const startX = handle.x + handle.width / 2;
  const startY = handle.y + handle.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + Math.sign(x) * 5, startY + Math.sign(y) * 5, {
    steps: 2,
  });
  // Moves before the row has lifted are lost (WebKit is slow to start the
  // drag): the drop would land where it began.
  await expect(page.getByRole("listitem").filter({ has: grip })).toHaveClass(
    /shadow-lg/,
  );
  await page.mouse.move(startX + x, startY + y, { steps: 10 });
  await page.mouse.up();
  // dnd-kit keeps swallowing clicks for 50ms after a drag ends.
  await page.waitForTimeout(100);
}

/**
 * Resolves once the app-lock enrolment has reached IndexedDB. Settings
 * persist in the background, so a reload right after enrolling can lose
 * it and the app comes back unlocked.
 */
export async function waitForStoredLock(page: Page) {
  await expect
    .poll(async () => {
      const settings = (await readStored(page, "notes", "notes-settings")) as
        { lock?: unknown } | undefined;
      return Boolean(settings?.lock);
    })
    .toBe(true);
}

/**
 * Resolves once every note in IndexedDB carries a `rank`, i.e. a dragged
 * order has been written. Notes persist in the background, so a reload right
 * after a drag can lose it.
 */
export async function waitForStoredOrder(page: Page) {
  await expect
    .poll(async () => {
      const data = (await readStored(page, "notes", "notes-data")) as
        { notes?: { rank?: number }[] } | undefined;
      const notes = data?.notes ?? [];
      return (
        notes.length > 0 && notes.every((note) => typeof note.rank === "number")
      );
    })
    .toBe(true);
}
