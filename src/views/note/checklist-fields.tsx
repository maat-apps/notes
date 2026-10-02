import {
  CaretDown,
  Plus,
  TextIndent,
  TextOutdent,
  X,
} from "@phosphor-icons/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { Button } from "@maat-apps/ui/button";
import { Checkbox } from "@maat-apps/ui/checkbox";
import { useTranslation } from "../../i18n/use-translation";
import {
  canIndent,
  createItem,
  insertItemAfter,
  nextItemIndented,
  previousUncheckedId,
  removeItem,
  setChecked,
  setIndented,
  shownIndented,
  splitItems,
  updateItem,
} from "../../lib/checklist-utils";
import type { ChecklistItem, ChecklistNote } from "../../lib/schemas";

type IndentAction = "indent" | "outdent" | null;

// Keeps the item's input focused when its indent button is tapped, so the
// button (shown only for the focused item) doesn't vanish mid-tap.
function keepFocus(event: { preventDefault: () => void }) {
  event.preventDefault();
}

function ItemRow({
  item,
  indented,
  indentAction,
  inputRef,
  onFocusChange,
  onText,
  onChecked,
  onEnter,
  onBackspaceEmpty,
  onIndent,
  onRemove,
}: {
  item: ChecklistItem;
  /** Drawn nested under its parent. */
  indented: boolean;
  /** The indent button to offer while the item has focus. */
  indentAction: IndentAction;
  inputRef: (element: HTMLInputElement | null) => void;
  onFocusChange: (focused: boolean) => void;
  onText: (text: string) => void;
  onChecked: (checked: boolean) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onIndent: (indented: boolean) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const label = item.text || t("emptyItem");

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter();
    } else if (event.key === "Backspace" && item.text === "") {
      event.preventDefault();
      onBackspaceEmpty();
    } else if (event.key === "Tab" && indentAction !== null) {
      // A hardware keyboard nests with Tab, un-nests with Shift+Tab.
      const indent = !event.shiftKey;
      if (indent === (indentAction === "indent")) {
        event.preventDefault();
        onIndent(indent);
      }
    }
  }

  return (
    <li className={`flex items-center gap-3 ${indented ? "pl-8" : ""}`}>
      <Checkbox
        checked={item.checked}
        aria-label={t("itemDone", { item: label })}
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
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
      />
      {indentAction && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t(
            indentAction === "indent" ? "indentItem" : "outdentItem",
            {
              item: label,
            },
          )}
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={() => onIndent(indentAction === "indent")}
        >
          {indentAction === "indent" ? <TextIndent /> : <TextOutdent />}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("removeItem", { item: label })}
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
 * item un-nests it, then removes it. The focused item offers a button to
 * nest it under the item above (one level) or un-nest it.
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
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { unchecked, checked } = splitItems(note.items);
  const indented = new Set([
    ...shownIndented(note.items, unchecked),
    ...shownIndented(note.items, checked),
  ]);

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
    const item = createItem(
      "",
      afterId !== null && nextItemIndented(note.items, afterId),
    );
    focusAfterRender(item.id);
    setItems(insertItemAfter(note.items, afterId, item));
  }

  function indentActionFor(item: ChecklistItem): IndentAction {
    if (item.id !== focusedId || item.checked) return null;
    if (item.indented) return "outdent";
    return canIndent(note.items, item.id) ? "indent" : null;
  }

  function renderItem(item: ChecklistItem) {
    return (
      <ItemRow
        key={item.id}
        item={item}
        indented={indented.has(item.id)}
        indentAction={indentActionFor(item)}
        onFocusChange={(focused) => {
          if (focused) setFocusedId(item.id);
          else
            setFocusedId((current) => (current === item.id ? null : current));
        }}
        onIndent={(nested) =>
          setItems(setIndented(note.items, item.id, nested))
        }
        inputRef={(element) => {
          if (element) inputs.current.set(item.id, element);
          else inputs.current.delete(item.id);
        }}
        onText={(text) => setItems(updateItem(note.items, item.id, { text }))}
        onChecked={(isChecked) =>
          setItems(setChecked(note.items, item.id, isChecked))
        }
        onEnter={() => addItemAfter(item.id)}
        onBackspaceEmpty={() => {
          if (item.indented) {
            setItems(setIndented(note.items, item.id, false));
            return;
          }
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
