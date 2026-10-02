import { expect, test } from "@playwright/test";

import { goHome } from "./utils";

test("an empty list invites the first note", async ({ page }) => {
  await goHome(page);
  await expect(
    page.getByRole("heading", { name: "No notes yet" }),
  ).toBeVisible();
});
