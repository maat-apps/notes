import type { ChecklistItem } from "./schemas";

// The checklist editor's item operations, kept pure (and unit-tested) so the
// editor only holds state and wires these to its inputs. Items keep one
// array order; checked items are shown below the unchecked ones (PRODUCT.md)
// but never reordered in storage, so unchecking puts an item back where it
// was.
//
// Nesting is one level deep and lives in that same flat order: an
// `indented` item is a child of the nearest top-level item above it, so a
// parent's children are the indented items right after it.

export function createItem(text = "", indented = false): ChecklistItem {
  return { id: crypto.randomUUID(), text, checked: false, indented };
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

/** The first item can't be indented: it has no item above to belong to. */
function withTopLevelFirst(items: ChecklistItem[]): ChecklistItem[] {
  const [first, ...rest] = items;
  return first?.indented ? [{ ...first, indented: false }, ...rest] : items;
}

export function removeItem(
  items: ChecklistItem[],
  id: string,
): ChecklistItem[] {
  return withTopLevelFirst(items.filter((item) => item.id !== id));
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

/** An indented item's parent: the nearest top-level item above it. */
export function parentId(items: ChecklistItem[], id: string): string | null {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1 || !items[index].indented) return null;
  for (let above = index - 1; above >= 0; above--) {
    if (!items[above].indented) return items[above].id;
  }
  return null;
}

/** A top-level item's children: the indented items right after it. */
export function childIds(items: ChecklistItem[], id: string): string[] {
  const index = items.findIndex((item) => item.id === id);
  if (index === -1 || items[index].indented) return [];
  const children: string[] = [];
  for (const item of items.slice(index + 1)) {
    if (!item.indented) break;
    children.push(item.id);
  }
  return children;
}

/** Every item but the first can be indented (one level only). */
export function canIndent(items: ChecklistItem[], id: string): boolean {
  return items.findIndex((item) => item.id === id) > 0;
}

export function setIndented(
  items: ChecklistItem[],
  id: string,
  indented: boolean,
): ChecklistItem[] {
  if (indented && !canIndent(items, id)) return items;
  return updateItem(items, id, { indented });
}

/**
 * Checks or unchecks an item the way Keep does: a parent takes its
 * children along, and unchecking a child unchecks its parent too (a
 * parent can't stay done with an open child).
 */
export function setChecked(
  items: ChecklistItem[],
  id: string,
  checked: boolean,
): ChecklistItem[] {
  const affected = new Set([id, ...childIds(items, id)]);
  const parent = parentId(items, id);
  if (!checked && parent) affected.add(parent);
  return items.map((item) =>
    affected.has(item.id) ? { ...item, checked } : item,
  );
}

/**
 * Whether Enter on `id` starts an indented item: after a child, or after a
 * parent (the new item becomes its first child — a top-level item there
 * would take the parent's children over).
 */
export function nextItemIndented(items: ChecklistItem[], id: string): boolean {
  const item = items.find((entry) => entry.id === id);
  return Boolean(item?.indented) || childIds(items, id).length > 0;
}

/**
 * The items of `shown` (one rendered list, e.g. the unchecked ones) to draw
 * indented: those whose parent is in the same list. A child shown without
 * its parent — checked on its own, say — reads as top-level there.
 */
export function shownIndented(
  items: ChecklistItem[],
  shown: ChecklistItem[],
): Set<string> {
  const shownIds = new Set(shown.map((item) => item.id));
  return new Set(
    shown
      .filter((item) => {
        const parent = parentId(items, item.id);
        return parent !== null && shownIds.has(parent);
      })
      .map((item) => item.id),
  );
}

/** An item with the children that travel with it when it is moved. */
function groupIds(items: ChecklistItem[], id: string): string[] {
  return [id, ...childIds(items, id)];
}

/**
 * Moves `id` to where `overId` is, the way a dragged row lands on the row
 * it was dropped over: below it when dragged down, above it when dragged
 * up. A top-level item takes its children along and lands beside `overId`'s
 * whole group, so it never splits a parent from its children; an indented
 * item moves alone and joins whichever parent ends up above it.
 */
export function moveItem(
  items: ChecklistItem[],
  id: string,
  overId: string,
): ChecklistItem[] {
  const from = items.findIndex((item) => item.id === id);
  const to = items.findIndex((item) => item.id === overId);
  if (from === -1 || to === -1 || from === to) return items;

  const moving = new Set(groupIds(items, id));
  if (moving.has(overId)) return items;

  const overItem = items[to];
  const anchorGroup = items[from].indented
    ? [overId]
    : groupIds(
        items,
        overItem.indented ? (parentId(items, overId) ?? overId) : overId,
      );
  const movingItems = items.filter((item) => moving.has(item.id));
  const rest = items.filter((item) => !moving.has(item.id));
  const draggedDown = from < to;
  const anchor = draggedDown ? anchorGroup.at(-1) : anchorGroup[0];
  const anchorIndex = rest.findIndex((item) => item.id === anchor);
  const insertAt = draggedDown ? anchorIndex + 1 : anchorIndex;
  return withTopLevelFirst([
    ...rest.slice(0, insertAt),
    ...movingItems,
    ...rest.slice(insertAt),
  ]);
}
