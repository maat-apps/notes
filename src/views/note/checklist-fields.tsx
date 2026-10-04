import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CaretDown,
  DotsSixVertical,
  Plus,
  TextIndent,
  TextOutdent,
  X,
} from "@phosphor-icons/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@maat-apps/ui/button";
import { Checkbox } from "../../components/checkbox";
import { useTranslation } from "../../i18n/use-translation";
import {
  canIndent,
  createItem,
  insertItemAfter,
  moveItem,
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
  focused,
  rowRef,
  rowStyle,
  dragging = false,
  dragHandle,
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
  /** The item's input has focus: it alone offers its action buttons. */
  focused: boolean;
  rowRef?: (element: HTMLLIElement | null) => void;
  rowStyle?: CSSProperties;
  dragging?: boolean;
  /** The grip that drags the row; unchecked items only. */
  dragHandle?: ReactNode;
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
    <li
      ref={rowRef}
      style={rowStyle}
      className={`bg-background flex items-center gap-1 ${dragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <span className="flex size-10 shrink-0 items-center justify-center">
        {dragHandle}
      </span>
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 ${indented ? "pl-9" : ""}`}
      >
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
          className={`placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent py-2.5 text-lg outline-none ${item.checked ? "text-muted-foreground line-through" : ""}`}
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
              { item: label },
            )}
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onClick={() => onIndent(indentAction === "indent")}
          >
            {indentAction === "indent" ? <TextIndent /> : <TextOutdent />}
          </Button>
        )}
        {focused && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("removeItem", { item: label })}
            onMouseDown={keepFocus}
            onPointerDown={keepFocus}
            onClick={onRemove}
          >
            <X className="size-6" />
          </Button>
        )}
      </div>
    </li>
  );
}

/* eslint-disable react-hooks/refs -- useSortable returns ref callbacks and
   event handlers, which the rule mistakes for ref values. */
function SortableItemRow(props: Parameters<typeof ItemRow>[0]) {
  const { t } = useTranslation();
  const sortable = useSortable({ id: props.item.id });
  const label = props.item.text || t("emptyItem");
  return (
    <ItemRow
      {...props}
      rowRef={sortable.setNodeRef}
      rowStyle={{
        transform: CSS.Translate.toString(sortable.transform),
        transition: sortable.transition,
      }}
      dragging={sortable.isDragging}
      dragHandle={
        <button
          type="button"
          ref={sortable.setActivatorNodeRef}
          className="text-foreground flex size-10 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-3"
          aria-label={t("dragItem", { item: label })}
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <DotsSixVertical weight="bold" className="size-6" />
        </button>
      }
    />
  );
}
/* eslint-enable react-hooks/refs */

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over)
      setItems(moveItem(note.items, String(active.id), String(over.id)));
  }

  function renderRow(item: ChecklistItem, Row: typeof ItemRow) {
    return (
      <Row
        key={item.id}
        item={item}
        indented={indented.has(item.id)}
        indentAction={indentActionFor(item)}
        focused={item.id === focusedId}
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

  function renderSortable(item: ChecklistItem) {
    return renderRow(item, SortableItemRow);
  }

  function renderPlain(item: ChecklistItem) {
    return renderRow(item, ItemRow);
  }

  return (
    <div className="grid gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={unchecked.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            className="m-0 grid list-none gap-0.5 p-0"
            aria-label={t("listItems")}
          >
            {unchecked.map(renderSortable)}
          </ul>
        </SortableContext>
      </DndContext>
      <Button
        variant="ghost"
        className="h-12 justify-start gap-3 pl-11 text-lg font-normal"
        onClick={() => addItemAfter(unchecked.at(-1)?.id ?? null)}
      >
        <Plus aria-hidden="true" className="size-6" /> {t("addItem")}
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
              {checked.map(renderPlain)}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
