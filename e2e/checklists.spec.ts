import { expect, test } from "@playwright/test";

import { goHome, newChecklist } from "./utils";

test("a checklist adds items with Enter and moves checked items down", async ({
  page,
}) => {
  await goHome(page);
  await newChecklist(page);

  await page.keyboard.type("Milk");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Bread");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Eggs");

  const unchecked = page.getByRole("list", { name: "List items" });
  await expect(unchecked.getByRole("textbox")).toHaveCount(3);

  await page.getByRole("checkbox", { name: "Done: Milk" }).click();

  await expect(unchecked.getByRole("textbox")).toHaveCount(2);
  const checked = page.getByRole("list", { name: "Checked items" });
  await expect(checked.getByRole("textbox")).toHaveValue("Milk");

  // Unchecking puts it back above.
  await page.getByRole("checkbox", { name: "Done: Milk" }).click();
  await expect(unchecked.getByRole("textbox")).toHaveCount(3);
});

test("Backspace on an empty item removes it", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);

  await page.keyboard.type("Milk");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("list", { name: "List items" }).getByRole("textbox"),
  ).toHaveCount(2);
  await page.keyboard.press("Backspace");

  const unchecked = page.getByRole("list", { name: "List items" });
  await expect(unchecked.getByRole("textbox")).toHaveCount(1);
  await expect(unchecked.getByRole("textbox")).toBeFocused();
});

test("the list previews a checklist's items", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);
  await page.getByRole("textbox", { name: "Title" }).fill("Shopping");
  await page.getByRole("textbox", { name: "List item" }).fill("Apples");
  await page.getByRole("button", { name: "Back" }).click();

  await expect(page.getByRole("button", { name: /Shopping/ })).toContainText(
    "Apples",
  );
});
