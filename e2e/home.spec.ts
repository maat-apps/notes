import { expect, test } from "@playwright/test";

import { createTextNote, goHome } from "./utils";

test("an empty list invites the first note", async ({ page }) => {
  await goHome(page);
  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();
});

test("a card is dragged into a new place and stays there", async ({ page }) => {
  await goHome(page);
  for (const title of ["First", "Second", "Third"]) {
    await createTextNote(page, { title, body: title });
  }
  const cards = page.getByRole("button", { name: /First|Second|Third/ });
  await expect(cards.nth(0)).toContainText("Third");

  const grip = await cards.nth(0).boundingBox();
  const target = await cards.nth(2).boundingBox();
  if (!grip || !target) throw new Error("cards are not laid out");
  await page.mouse.move(grip.x + 40, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + 40, grip.y + grip.height / 2 + 12, {
    steps: 4,
  });
  await page.mouse.move(grip.x + 40, target.y + target.height / 2, {
    steps: 12,
  });
  await page.mouse.up();

  await expect(cards.nth(2)).toContainText("Third");
  await page.reload();
  await expect(cards.nth(2)).toContainText("Third");
});
