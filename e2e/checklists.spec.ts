import { expect, test } from "@playwright/test";

import { dragItemHandle, goHome, newChecklist } from "./utils";

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

test("dragging an item's handle right nests it under the one above", async ({
  page,
}) => {
  await goHome(page);
  await newChecklist(page);

  await page.keyboard.type("Groceries");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Milk");
  const unchecked = page.getByRole("list", { name: "List items" });
  const nested = unchecked.getByRole("listitem", { level: 2 });

  // The first item has nothing to nest under.
  await dragItemHandle(page, "Groceries", { x: 60 });
  await expect(nested).toHaveCount(0);

  await dragItemHandle(page, "Milk", { x: 60 });
  await expect(nested).toHaveCount(1);
  await expect(nested.getByRole("textbox")).toHaveValue("Milk");

  // Enter continues at the same level.
  await unchecked.getByRole("textbox").nth(1).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Bread");
  await expect(nested).toHaveCount(2);

  // Dragging left un-nests it again.
  await dragItemHandle(page, "Bread", { x: -60 });
  await expect(nested).toHaveCount(1);
  await dragItemHandle(page, "Bread", { x: 60 });
  await expect(nested).toHaveCount(2);

  // Checking the parent takes its children along.
  await page.getByRole("checkbox", { name: "Done: Groceries" }).click();
  const checked = page.getByRole("list", { name: "Checked items" });
  await expect(checked.getByRole("textbox")).toHaveCount(3);

  // Unchecking a child brings its parent back too.
  await page.getByRole("checkbox", { name: "Done: Bread" }).click();
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
  await dragItemHandle(page, "Milk", { x: 60 });
  const unchecked = page.getByRole("list", { name: "List items" });
  const items = unchecked.getByRole("textbox");
  const nested = unchecked.getByRole("listitem", { level: 2 });
  // The drop lands a moment after the mouse lets go (slower on WebKit);
  // typing before it would add an item at the top level.
  await expect(nested).toHaveCount(1);
  await items.nth(1).click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");

  await expect(items).toHaveCount(3);
  await expect(nested).toHaveCount(1);
  await page.keyboard.press("Backspace");
  await expect(items).toHaveCount(2);
});

test("a long item wraps onto more lines of the same item", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);
  const item = page.getByRole("textbox", { name: "List item" });
  const oneLine = await item.boundingBox();

  await page.keyboard.type(
    "Remember to buy oat milk, sourdough bread, free-range eggs, coffee beans and a big bunch of fresh basil",
  );

  await expect(item).toHaveCount(1);
  await expect
    .poll(async () => (await item.boundingBox())?.height ?? 0)
    .toBeGreaterThan((oneLine?.height ?? 0) * 1.5);
  const overflow = await item.evaluate(
    (element) => element.scrollHeight - element.clientHeight,
  );
  expect(overflow).toBe(0);
});

test("focusing an item doesn't rewrap its text", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);
  await page.keyboard.type(
    "Remember to buy oat milk, sourdough bread, free-range eggs and coffee",
  );
  await page.keyboard.press("Enter");

  const item = page.getByRole("textbox", { name: "List item" }).first();
  const remove = page.getByRole("button", { name: /^Remove Remember/ });
  await expect(remove).toHaveCount(0);
  const unfocused = await item.boundingBox();

  await item.click();
  await expect(remove).toBeVisible();
  expect(await item.boundingBox()).toEqual(unfocused);
});

test("an item is reordered by dragging its handle", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);
  await page.keyboard.type("Milk");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Bread");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Eggs");

  const target = await page
    .getByRole("textbox", { name: "List item" })
    .nth(2)
    .boundingBox();
  const grip = await page
    .getByRole("button", { name: "Reorder Milk" })
    .boundingBox();
  if (!grip || !target) throw new Error("rows are not laid out");

  await dragItemHandle(page, "Milk", {
    y: target.y + target.height - (grip.y + grip.height / 2),
  });

  const items = page
    .getByRole("list", { name: "List items" })
    .getByRole("textbox", { name: "List item" });
  await expect(items.nth(0)).toHaveValue("Bread");
  await expect(items.nth(1)).toHaveValue("Eggs");
  await expect(items.nth(2)).toHaveValue("Milk");
});

test("an item with a link gets a button that opens it", async ({ page }) => {
  await goHome(page);
  await newChecklist(page);
  await page.keyboard.type("Buy at https://shop.example/milk");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Plain item");

  const open = page.getByRole("link", { name: "Open shop.example/milk" });
  await expect(open).toHaveAttribute("href", "https://shop.example/milk");
  await expect(page.getByRole("link")).toHaveCount(1);
});

test.describe("on a narrow phone", () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test("adding items never widens the page", async ({ page }) => {
    await goHome(page);
    await newChecklist(page);
    for (const item of ["Dishwasher", "Laundry", "Groceries"]) {
      await page.keyboard.type(item);
      await page.keyboard.press("Enter");
    }

    await expect(page.getByRole("textbox", { name: "List item" })).toHaveCount(
      4,
    );
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });
});
