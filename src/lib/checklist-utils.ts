import type { ChecklistItem } from "./schemas";

// The checklist editor's item operations, kept pure (and unit-tested) so the
// editor only holds state and wires these to its inputs. Items keep one
// array order; checked items are shown below the unchecked ones (PRODUCT.md)
// but never reordered in storage, so unchecking puts an item back where it
// was.

export function createItem(text = ""): ChecklistItem {
  return { id: crypto.randomUUID(), text, checked: false };
}

/** Unchecked items, then checked ones — each in their stored order. */
export function splitItems(items: ChecklistItem[]): {
  unchecked: ChecklistItem[];
  checked: ChecklistItem[];
} {
  return {
    unchecked: items.filter((item) => !item.checked),
    checked: items.filter((item) => item.checked),
  };
}

export function updateItem(
  items: ChecklistItem[],
  id: string,
  changes: Partial<Omit<ChecklistItem, "id">>,
): ChecklistItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...changes } : item));
}

/** Inserts `item` right after the item `afterId` (at the end if not found). */
export function insertItemAfter(
  items: ChecklistItem[],
  afterId: string | null,
  item: ChecklistItem,
): ChecklistItem[] {
  const index = items.findIndex((existing) => existing.id === afterId);
  if (index === -1) return [...items, item];
  return [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
}

export function removeItem(
  items: ChecklistItem[],
  id: string,
): ChecklistItem[] {
  return items.filter((item) => item.id !== id);
}

/** The unchecked item shown just above `id`, for focus after a removal. */
export function previousUncheckedId(
  items: ChecklistItem[],
  id: string,
): string | null {
  const { unchecked } = splitItems(items);
  const index = unchecked.findIndex((item) => item.id === id);
  return index > 0 ? unchecked[index - 1].id : null;
}
