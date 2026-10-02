import { describe, expect, it } from "vitest";

import {
  createItem,
  insertItemAfter,
  previousUncheckedId,
  removeItem,
  splitItems,
  updateItem,
} from "@/lib/checklist-utils";
import type { ChecklistItem } from "@/lib/schemas";

const item = (id: string, checked = false): ChecklistItem => ({
  id,
  text: id,
  checked,
});

const ids = (items: ChecklistItem[]) => items.map((entry) => entry.id);

describe("createItem", () => {
  it("creates an unchecked item with a unique id", () => {
    const first = createItem("Milk");
    expect(first).toMatchObject({ text: "Milk", checked: false });
    expect(createItem().id).not.toBe(first.id);
  });
});

describe("splitItems", () => {
  it("puts checked items after unchecked ones, keeping each order", () => {
    const { unchecked, checked } = splitItems([
      item("a", true),
      item("b"),
      item("c", true),
      item("d"),
    ]);
    expect(ids(unchecked)).toEqual(["b", "d"]);
    expect(ids(checked)).toEqual(["a", "c"]);
  });
});

describe("updateItem", () => {
  it("changes only the matching item", () => {
    const items = updateItem([item("a"), item("b")], "b", { checked: true });
    expect(items).toEqual([item("a"), item("b", true)]);
  });
});

describe("insertItemAfter", () => {
  it("inserts right after the given item", () => {
    expect(
      ids(insertItemAfter([item("a"), item("b")], "a", item("x"))),
    ).toEqual(["a", "x", "b"]);
  });

  it("appends when there's no such item", () => {
    expect(ids(insertItemAfter([item("a")], null, item("x")))).toEqual([
      "a",
      "x",
    ]);
  });
});

describe("removeItem", () => {
  it("removes the item", () => {
    expect(ids(removeItem([item("a"), item("b")], "a"))).toEqual(["b"]);
  });
});

describe("previousUncheckedId", () => {
  it("is the unchecked item shown above, skipping checked ones", () => {
    const items = [item("a"), item("b", true), item("c")];
    expect(previousUncheckedId(items, "c")).toBe("a");
  });

  it("is null for the first item or an unknown one", () => {
    expect(previousUncheckedId([item("a")], "a")).toBeNull();
    expect(previousUncheckedId([item("a")], "zz")).toBeNull();
  });
});
