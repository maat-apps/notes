import { expect, test } from "@playwright/test";

import { createTextNote, goHome } from "./utils";

test("search filters notes, ignoring case and diacritics", async ({ page }) => {
  await goHome(page);
  await createTextNote(page, { title: "Żółw", body: "Zielony" });
  await createTextNote(page, { title: "Zakupy", body: "Chleb" });
  const search = page.getByRole("searchbox", { name: "Search notes" });

  await search.fill("zolw");

  await expect(page.getByRole("button", { name: /Żółw/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Zakupy/ })).toHaveCount(0);

  await search.fill("nothing like this");
  await expect(
    page.getByRole("heading", { name: "No matching notes" }),
  ).toBeVisible();

  await search.fill("");
  await expect(page.getByRole("button", { name: /Zakupy/ })).toBeVisible();
});
