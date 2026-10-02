import { expect, test } from "@playwright/test";

import { createTextNote, goHome } from "./utils";

test("a text note saves as you type and shows in the list", async ({
  page,
}) => {
  await goHome(page);

  await createTextNote(page, { title: "Groceries", body: "Milk\nBread" });

  const card = page.getByRole("button", { name: /Groceries/ });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Milk");

  // Survives a reload: the edits were saved without a Save button.
  await page.reload();
  await card.click();
  await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue(
    "Milk\nBread",
  );
});

test("a note left empty isn't kept", async ({ page }) => {
  await goHome(page);

  await createTextNote(page, {});

  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();
});

test("pinned notes sit above the others", async ({ page }) => {
  await goHome(page);
  await createTextNote(page, { title: "First" });
  await createTextNote(page, { title: "Second" });

  await page.getByRole("button", { name: /First/ }).click();
  await page.getByRole("button", { name: "Pin" }).click();
  await page.getByRole("button", { name: "Back" }).click();

  const pinned = page.getByRole("region", { name: "Pinned" });
  const others = page.getByRole("region", { name: "Others" });
  await expect(pinned.getByRole("button", { name: /First/ })).toBeVisible();
  await expect(others.getByRole("button", { name: /Second/ })).toBeVisible();
});

test("deleting a note asks first, then removes it for good", async ({
  page,
}) => {
  await goHome(page);
  await createTextNote(page, { title: "Old idea" });

  await page.getByRole("button", { name: /Old idea/ }).click();
  await page.getByRole("button", { name: "Delete note" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();
});

test("a stale link shows a way back", async ({ page }) => {
  await page.goto("does-not-exist");
  await expect(
    page.getByText("This note doesn't exist any more."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to notes" }).click();
  await expect(
    page.getByRole("heading", { name: "Notes", exact: true }),
  ).toBeVisible();
});
