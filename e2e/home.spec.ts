import { expect, test } from "@playwright/test";

import {
  createTextNote,
  goHome,
  longPress,
  pressAndHold,
  waitForStoredOrder,
} from "./utils";

test("an empty list invites the first note", async ({ page }) => {
  await goHome(page);
  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();
});

test("a card is dragged into a new place and stays there", async ({ page }) => {
  await goHome(page);
  for (const title of ["First", "Second", "Third"]) {
    const body = title === "Third" ? `${title}\n\n\n\n\n` : title;
    await createTextNote(page, { title, body });
  }
  const cards = page.getByRole("button", { name: /First|Second|Third/ });
  await expect(cards.nth(0)).toContainText("Third");

  const grip = await pressAndHold(page, cards.nth(0));
  const target = await cards.nth(2).boundingBox();
  if (!target) throw new Error("cards are not laid out");
  await page.mouse.move(grip.x + 40, target.y + target.height / 2, {
    steps: 12,
  });
  const dragged = cards.nth(0).locator("xpath=..");
  const transform = await dragged.evaluate((el) => el.style.transform);
  expect(transform).not.toContain("scale");
  await page.mouse.up();

  await expect(cards.nth(2)).toContainText("Third");
  await expect(page.getByText(/selected$/)).toHaveCount(0);
  await waitForStoredOrder(page);
  await page.reload();
  await expect(cards.nth(2)).toContainText("Third");
});

test("a long press selects a card, and taps then add or remove more", async ({
  page,
}) => {
  await goHome(page);
  for (const title of ["First", "Second"]) {
    await createTextNote(page, { title });
  }
  const newNote = page.getByRole("button", { name: "New note" });

  await longPress(page, page.getByRole("button", { name: "First" }));
  await expect(page.getByText("1 selected")).toBeVisible();
  await expect(newNote).toHaveCount(0);

  await page.getByRole("button", { name: "Second" }).click();
  await expect(page.getByText("2 selected")).toBeVisible();
  await page.getByRole("button", { name: "Second" }).click();
  await expect(page.getByText("1 selected")).toBeVisible();
  await expect(page).toHaveURL(/\/notes\/$/);

  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.getByText(/selected$/)).toHaveCount(0);
  await expect(newNote).toBeVisible();
});

test("selected notes are pinned and deleted together", async ({ page }) => {
  await goHome(page);
  for (const title of ["First", "Second", "Third"]) {
    await createTextNote(page, { title });
  }

  await longPress(page, page.getByRole("button", { name: "First" }));
  await page.getByRole("button", { name: "Second" }).click();
  await page.getByRole("button", { name: "Pin", exact: true }).click();
  const pinned = page.getByRole("region", { name: "Pinned" });
  await expect(pinned.getByRole("button", { name: "First" })).toBeVisible();
  await expect(pinned.getByRole("button", { name: "Second" })).toBeVisible();
  await expect(page.getByRole("button", { name: "New note" })).toBeVisible();

  await longPress(page, page.getByRole("button", { name: "First" }));
  await page.getByRole("button", { name: "Third" }).click();
  await page.getByRole("button", { name: "Delete selected notes" }).click();
  await expect(page.getByText("Delete 2 notes?")).toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(page.getByRole("button", { name: "First" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Third" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Second" })).toBeVisible();
});
