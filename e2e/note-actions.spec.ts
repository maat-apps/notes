import { expect, test } from "@playwright/test";

import { createTextNote, goHome } from "./utils";

async function newTextNote(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "New note" }).click();
  await page.getByRole("button", { name: "Text note" }).click();
  await expect(page.getByRole("textbox", { name: "Note" })).toBeFocused();
}

test("undo and redo step through the edits of a note", async ({ page }) => {
  await goHome(page);
  await newTextNote(page);
  const body = page.getByRole("textbox", { name: "Note" });
  const undo = page.getByRole("button", { name: "Undo" });
  const redo = page.getByRole("button", { name: "Redo" });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();

  await body.fill("Hello");
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(body).toHaveValue("");
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(body).toHaveValue("Hello");
});

test("a burst of typing is one undo step", async ({ page }) => {
  await goHome(page);
  await newTextNote(page);
  const body = page.getByRole("textbox", { name: "Note" });

  await page.keyboard.type("Hello world", { delay: 20 });
  await page.getByRole("button", { name: "Undo" }).click();

  await expect(body).toHaveValue("");
});

test("the toolbar says when the note was edited", async ({ page }) => {
  await goHome(page);
  await newTextNote(page);
  await expect(page.getByText(/^Edited /)).toHaveCount(0);

  await page.getByRole("textbox", { name: "Note" }).fill("Hello");

  await expect(page.getByText(/^Edited /)).toBeVisible();
});

test("a note is copied from the menu", async ({ page }) => {
  await goHome(page);
  await createTextNote(page, { title: "Ideas", body: "Plan the trip" });
  await page.getByRole("button", { name: /Ideas/ }).click();
  const original = page.url();

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Make a copy" }).click();
  await expect(page).not.toHaveURL(original);
  await page.getByRole("button", { name: "Back" }).click();

  await expect(page.getByRole("button", { name: /Ideas/ })).toHaveCount(2);
});

test("a text note becomes a checklist and back", async ({ page }) => {
  await goHome(page);
  await createTextNote(page, { title: "Shopping", body: "Milk\nBread" });
  await page.getByRole("button", { name: /Shopping/ }).click();

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Show checkboxes" }).click();
  const items = page
    .getByRole("list", { name: "List items" })
    .getByRole("textbox", { name: "List item" });
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toHaveValue("Milk");
  await expect(items.nth(1)).toHaveValue("Bread");

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Hide checkboxes" }).click();
  await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue(
    "Milk\nBread",
  );
});

test("converting a note can be undone", async ({ page }) => {
  await goHome(page);
  await createTextNote(page, { title: "Shopping", body: "Milk" });
  await page.getByRole("button", { name: /Shopping/ }).click();

  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Show checkboxes" }).click();
  await expect(page.getByRole("list", { name: "List items" })).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue("Milk");
});
