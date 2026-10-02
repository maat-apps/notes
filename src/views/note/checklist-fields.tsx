import { CaretDown, Plus, X } from "@phosphor-icons/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button } from "@maat-apps/ui/button";
import { Checkbox } from "@maat-apps/ui/checkbox";
import { useTranslation } from "../../i18n/use-translation";
import {
  createItem,
  insertItemAfter,
  previousUncheckedId,
  removeItem,
  splitItems,
  updateItem,
} from "../../lib/checklist-utils";
import type { ChecklistItem, ChecklistNote } from "../../lib/schemas";

function ItemRow({
  item,
  inputRef,
  onText,
  onChecked,
  onEnter,
  onBackspaceEmpty,
  onRemove,
}: {
  item: ChecklistItem;
  inputRef: (element: HTMLInputElement | null) => void;
  onText: (text: string) => void;
  onChecked: (checked: boolean) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter();
    } else if (event.key === "Backspace" && item.text === "") {
      event.preventDefault();
      onBackspaceEmpty();
    }
  }

  return (
    <li className="flex items-center gap-3">
      <Checkbox
        checked={item.checked}
        aria-label={t("itemDone", { item: item.text || t("emptyItem") })}
        onCheckedChange={(checked) => onChecked(checked === true)}
      />
      <input
        ref={inputRef}
        value={item.text}
        aria-label={t("listItem")}
        placeholder={t("listItem")}
        className={`placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2 text-base outline-none ${item.checked ? "text-muted-foreground line-through" : ""}`}
        enterKeyHint="next"
        onChange={(event) => onText(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("removeItem", { item: item.text || t("emptyItem") })}
        onClick={onRemove}
      >
        <X />
      </Button>
    </li>
  );
}

/**
 * A checklist's items: unchecked first, checked ones below in a collapsible
 * section (PRODUCT.md). Enter adds the next item; Backspace on an empty
 * item removes it.
 */
export function ChecklistFields({
  note,
  autoFocus,
  onChange,
}: {
  note: ChecklistNote;
  autoFocus: boolean;
  onChange: (note: ChecklistNote) => void;
}) {
  const { t } = useTranslation();
  const inputs = useRef(new Map<string, HTMLInputElement>());
  // The item to focus once it has rendered — a new checklist's first item.
  const pendingFocus = useRef<string | null>(
    autoFocus ? (note.items[0]?.id ?? null) : null,
  );
  const [checkedOpen, setCheckedOpen] = useState(true);
  const { unchecked, checked } = splitItems(note.items);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    inputs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  function focusAfterRender(id: string | null) {
    pendingFocus.current = id;
  }

  function setItems(items: ChecklistItem[]) {
    onChange({ ...note, items });
  }

  function addItemAfter(afterId: string | null) {
    const item = createItem();
    focusAfterRender(item.id);
    setItems(insertItemAfter(note.items, afterId, item));
  }

  function renderItem(item: ChecklistItem) {
    return (
      <ItemRow
        key={item.id}
        item={item}
        inputRef={(element) => {
          if (element) inputs.current.set(item.id, element);
          else inputs.current.delete(item.id);
        }}
        onText={(text) => setItems(updateItem(note.items, item.id, { text }))}
        onChecked={(isChecked) =>
          setItems(updateItem(note.items, item.id, { checked: isChecked }))
        }
        onEnter={() => addItemAfter(item.id)}
        onBackspaceEmpty={() => {
          focusAfterRender(previousUncheckedId(note.items, item.id));
          setItems(removeItem(note.items, item.id));
        }}
        onRemove={() => setItems(removeItem(note.items, item.id))}
      />
    );
  }

  return (
    <div className="grid gap-2">
      <ul
        className="m-0 grid list-none gap-0.5 p-0"
        aria-label={t("listItems")}
      >
        {unchecked.map(renderItem)}
      </ul>
      <Button
        variant="ghost"
        className="text-muted-foreground justify-start px-1"
        onClick={() => addItemAfter(unchecked.at(-1)?.id ?? null)}
      >
        <Plus aria-hidden="true" /> {t("addItem")}
      </Button>
      {checked.length > 0 && (
        <section className="grid gap-1 border-t pt-3">
          <Button
            variant="ghost"
            className="text-muted-foreground justify-start px-1"
            aria-expanded={checkedOpen}
            onClick={() => setCheckedOpen((open) => !open)}
          >
            <CaretDown
              aria-hidden="true"
              className={checkedOpen ? "" : "-rotate-90"}
            />
            {t("checkedItemsCount", { count: checked.length })}
          </Button>
          {checkedOpen && (
            <ul
              className="m-0 grid list-none gap-0.5 p-0"
              aria-label={t("checkedItems")}
            >
              {checked.map(renderItem)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
