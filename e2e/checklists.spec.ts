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

test("an item nests under the one above, one level deep", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);

  await page.keyboard.type("Groceries");
  // The first item has nothing to nest under.
  await expect(page.getByRole("button", { name: /^Nest/ })).toHaveCount(0);
  await page.keyboard.press("Enter");
  await page.keyboard.type("Milk");
  await page.getByRole("button", { name: "Nest Milk" }).click();
  // Still typing in the same item, and Enter continues at the same level.
  await expect(
    page.getByRole("textbox", { name: "List item" }).nth(1),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Bread");
  await expect(
    page.getByRole("button", { name: "Unnest Bread" }),
  ).toBeVisible();

  // Checking the parent takes its children along.
  await page.getByRole("checkbox", { name: "Done: Groceries" }).click();
  const checked = page.getByRole("list", { name: "Checked items" });
  await expect(checked.getByRole("textbox")).toHaveCount(3);

  // Unchecking a child brings its parent back too.
  await page.getByRole("checkbox", { name: "Done: Bread" }).click();
  const unchecked = page.getByRole("list", { name: "List items" });
  await expect(unchecked.getByRole("textbox")).toHaveCount(2);
  await expect(checked.getByRole("textbox")).toHaveValue("Milk");
});

test("Backspace on an empty nested item un-nests it first", async ({
  page,
}) => {
  await goHome(page);
  await newChecklist(page);

  await page.keyboard.type("Groceries");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Milk");
  await page.getByRole("button", { name: "Nest Milk" }).click();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");

  const items = page
    .getByRole("list", { name: "List items" })
    .getByRole("textbox");
  await expect(items).toHaveCount(3);
  await expect(page.getByRole("button", { name: /^Nest/ })).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(items).toHaveCount(2);
});
