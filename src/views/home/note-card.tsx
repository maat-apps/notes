import { CheckSquare, Square } from "@phosphor-icons/react";

import { ListRow } from "@maat-apps/ui/list-row";
import { useTranslation } from "../../i18n/use-translation";
import { shownIndented, splitItems } from "../../lib/checklist-utils";
import type { Note } from "../../lib/schemas";

const PREVIEW_ITEMS = 8;

function ChecklistPreview({
  note,
}: {
  note: Extract<Note, { type: "checklist" }>;
}) {
  const { t } = useTranslation();
  const { unchecked, checked } = splitItems(note.items);
  const shown = unchecked.slice(0, PREVIEW_ITEMS);
  const indented = shownIndented(note.items, shown);
  const hidden = unchecked.length - shown.length;
  return (
    <ul className="m-0 grid list-none gap-1.5 p-0">
      {shown.map((item) => (
        <li
          key={item.id}
          className={`flex items-start gap-2 ${indented.has(item.id) ? "pl-6" : ""}`}
        >
          <Square aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 break-words">{item.text}</span>
        </li>
      ))}
      {hidden > 0 && (
        <li className="text-muted-foreground">
          {t("moreItems", { count: hidden })}
        </li>
      )}
      {checked.length > 0 && (
        <li className="text-muted-foreground flex items-center gap-2">
          <CheckSquare aria-hidden="true" className="size-4 shrink-0" />
          {t("checkedItemsCount", { count: checked.length })}
        </li>
      )}
    </ul>
  );
}

/**
 * One note in the list, as in Keep: an outlined card (no filled surface)
 * with its title (if any) and a clipped preview of its content. A selected
 * card gets a bold outline and settles in slightly.
 */
export function NoteCard({
  note,
  selected,
  onClick,
}: {
  note: Note;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <ListRow
      onClick={onClick}
      className={`min-h-0 items-start bg-transparent px-4 py-3 transition-[transform,box-shadow,border-color] duration-150 ease-out motion-reduce:transition-none ${selected ? "border-foreground ring-foreground scale-[0.98] ring-2" : ""}`}
    >
      <div className="grid min-w-0 flex-1 gap-2 text-left text-sm leading-5">
        {note.title && (
          <h3 className="m-0 text-base leading-6 font-medium break-words">
            {note.title}
          </h3>
        )}
        {note.type === "text" ? (
          <p className="m-0 line-clamp-10 break-words whitespace-pre-line">
            {note.body}
          </p>
        ) : (
          <ChecklistPreview note={note} />
        )}
      </div>
    </ListRow>
  );
}
