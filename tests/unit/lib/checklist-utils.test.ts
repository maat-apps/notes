import { describe, expect, it } from "vitest";

import {
  canIndent,
  childIds,
  createItem,
  insertItemAfter,
  nextItemIndented,
  parentId,
  previousUncheckedId,
  removeItem,
  setChecked,
  setIndented,
  shownIndented,
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

const child = (id: string, checked = false): ChecklistItem => ({
  ...item(id, checked),
  indented: true,
});

const checkedIds = (items: ChecklistItem[]) =>
  items.filter((entry) => entry.checked).map((entry) => entry.id);

describe("nesting", () => {
  const list = [item("a"), child("a1"), child("a2"), item("b"), child("b1")];

  it("creates indented items on request", () => {
    expect(createItem("x", true).indented).toBe(true);
    expect(createItem().indented).toBe(false);
  });

  it("finds a child's parent and a parent's children", () => {
    expect(parentId(list, "a2")).toBe("a");
    expect(parentId(list, "b1")).toBe("b");
    expect(parentId(list, "a")).toBeNull();
    expect(parentId(list, "zz")).toBeNull();
    expect(childIds(list, "a")).toEqual(["a1", "a2"]);
    expect(childIds(list, "b")).toEqual(["b1"]);
    expect(childIds(list, "a1")).toEqual([]);
    expect(childIds(list, "zz")).toEqual([]);
  });

  it("has no parent for an indented first item", () => {
    expect(parentId([child("x")], "x")).toBeNull();
  });

  it("indents any item but the first", () => {
    expect(canIndent(list, "a")).toBe(false);
    expect(canIndent(list, "b")).toBe(true);
    expect(setIndented(list, "a", true)).toBe(list);
    expect(setIndented(list, "b", true)[3].indented).toBe(true);
    expect(setIndented(list, "a1", false)[1].indented).toBe(false);
  });

  it("keeps the first item top-level after a removal", () => {
    const items = removeItem(list, "a");
    expect(items[0]).toMatchObject({ id: "a1", indented: false });
    expect(removeItem([item("a")], "a")).toEqual([]);
  });

  it("checks a parent together with its children", () => {
    expect(checkedIds(setChecked(list, "a", true))).toEqual(["a", "a1", "a2"]);
  });

  it("checks a child on its own", () => {
    expect(checkedIds(setChecked(list, "a1", true))).toEqual(["a1"]);
  });

  it("unchecks a child's parent along with it", () => {
    const done = setChecked(list, "a", true);
    expect(checkedIds(setChecked(done, "a2", false))).toEqual(["a1"]);
  });

  it("starts an indented item after a child or a parent", () => {
    expect(nextItemIndented(list, "a1")).toBe(true);
    expect(nextItemIndented(list, "a")).toBe(true);
    expect(nextItemIndented([item("x"), item("y")], "x")).toBe(false);
    expect(nextItemIndented(list, "zz")).toBe(false);
  });

  it("draws a child indented only next to its parent", () => {
    const items = [item("a"), child("a1", true), child("a2"), item("b")];
    const { unchecked, checked } = splitItems(items);
    expect([...shownIndented(items, unchecked)]).toEqual(["a2"]);
    expect([...shownIndented(items, checked)]).toEqual([]);
  });
});
