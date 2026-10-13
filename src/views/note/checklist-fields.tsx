import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
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
  ArrowSquareOut,
  CaretDown,
  DotsSixVertical,
  Plus,
  X,
} from "@phosphor-icons/react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
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
import { findLinks, linkLabel } from "../../lib/links";
import type { ChecklistItem, ChecklistNote } from "../../lib/schemas";

/** How far a row is drawn in when nested — `pl-9`. */
const INDENT_WIDTH = 36;

// A row dragged sideways shows where it would land, but no further than one
// nesting step either way.
const limitSidewaysDrag: Modifier = ({ transform }) => ({
  ...transform,
  x: Math.max(-INDENT_WIDTH, Math.min(INDENT_WIDTH, transform.x)),
});

/**
 * The nesting a sideways drag asks for: right nests, left un-nests, and a
 * mostly vertical drag (just a reorder) leaves it be.
 */
function nestingFromDrag(offsetX: number): boolean | null {
  if (Math.abs(offsetX) < INDENT_WIDTH / 2) return null;
  return offsetX > 0;
}

// Keeps the item's input focused when its remove button is tapped, so the
// button (shown only for the focused item) doesn't vanish mid-tap.
function keepFocus(event: { preventDefault: () => void }) {
  event.preventDefault();
}

function ItemRow({
  item,
  indented,
  canNest,
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
  /** Tab may nest it under the item above. */
  canNest: boolean;
  /** The item's input has focus: it alone offers its action buttons. */
  focused: boolean;
  rowRef?: (element: HTMLLIElement | null) => void;
  rowStyle?: CSSProperties;
  dragging?: boolean;
  /** The grip that drags the row; unchecked items only. */
  dragHandle?: ReactNode;
  inputRef: (element: HTMLTextAreaElement | null) => void;
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
  const link = findLinks(item.text)[0];
  const textArea = useRef<HTMLTextAreaElement | null>(null);

  // Long text wraps onto more lines of the same item: the field grows to fit.
  useLayoutEffect(() => {
    const element = textArea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [item.text, indented]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter();
    } else if (event.key === "Backspace" && item.text === "") {
      event.preventDefault();
      onBackspaceEmpty();
    } else if (event.key === "Tab" && !item.checked) {
      // A hardware keyboard nests with Tab, un-nests with Shift+Tab.
      const indent = !event.shiftKey;
      if (indent ? canNest && !item.indented : item.indented) {
        event.preventDefault();
        onIndent(indent);
      }
    }
  }

  return (
    <li
      ref={rowRef}
      style={rowStyle}
      aria-level={indented ? 2 : 1}
      className={`bg-background flex items-start gap-1 ${dragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <span className="flex h-12 w-10 shrink-0 items-center justify-center">
        {dragHandle}
      </span>
      <div
        className={`flex min-w-0 flex-1 items-start gap-3 ${indented ? "pl-9" : ""}`}
      >
        <Checkbox
          className="mt-3"
          checked={item.checked}
          aria-label={t("itemDone", { item: label })}
          onCheckedChange={(checked) => onChecked(checked === true)}
        />
        <textarea
          ref={(element) => {
            textArea.current = element;
            inputRef(element);
          }}
          rows={1}
          value={item.text}
          aria-label={t("listItem")}
          placeholder={t("listItem")}
          className={`placeholder:text-muted-foreground w-0 min-w-0 flex-1 resize-none overflow-hidden bg-transparent py-2.5 text-lg wrap-break-word outline-none ${item.checked ? "text-muted-foreground line-through" : ""}`}
          enterKeyHint="next"
          // An item is one line of text however it wraps: pasted line
          // breaks become spaces.
          onChange={(event) =>
            onText(event.target.value.replace(/[\r\n]+/g, " "))
          }
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
        />
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("openLink", { link: linkLabel(link) })}
            className="hover:bg-muted active:bg-muted mt-1 flex size-10 shrink-0 items-center justify-center rounded-full"
          >
            <ArrowSquareOut aria-hidden="true" className="size-5" />
          </a>
        )}
        {/* Always laid out, only hidden while unfocused, so focusing an
            item doesn't narrow its text and rewrap it. */}
        <Button
          variant="ghost"
          size="icon"
          className={`mt-1 ${focused ? "" : "invisible"}`}
          aria-label={t("removeItem", { item: label })}
          onMouseDown={keepFocus}
          onPointerDown={keepFocus}
          onClick={onRemove}
        >
          <X className="size-6" />
        </Button>
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
 * item un-nests it, then removes it. Dragging an item's handle right nests
 * it under the item above (one level), dragging it left un-nests it.
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
  const inputs = useRef(new Map<string, HTMLTextAreaElement>());
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd({ active, over, delta }: DragEndEvent) {
    const id = String(active.id);
    const moved = over ? moveItem(note.items, id, String(over.id)) : note.items;
    const nested = nestingFromDrag(delta.x);
    setItems(nested === null ? moved : setIndented(moved, id, nested));
  }

  function renderRow(item: ChecklistItem, Row: typeof ItemRow) {
    return (
      <Row
        key={item.id}
        item={item}
        indented={indented.has(item.id)}
        canNest={canIndent(note.items, item.id)}
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
        modifiers={[limitSidewaysDrag]}
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
