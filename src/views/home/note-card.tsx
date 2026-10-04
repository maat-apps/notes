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
    <ul className="m-0 grid list-none gap-2.5 p-0">
      {shown.map((item) => (
        <li
          key={item.id}
          className={`flex items-start gap-2 ${indented.has(item.id) ? "pl-6" : ""}`}
        >
          <Square aria-hidden="true" className="mt-1 size-5 shrink-0" />
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
          <CheckSquare aria-hidden="true" className="size-5 shrink-0" />
          {t("checkedItemsCount", { count: checked.length })}
        </li>
      )}
    </ul>
  );
}

/** One note in the list: its title (if any) and a preview of its content. */
export function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return (
    <ListRow onClick={onOpen} className="items-start rounded-3xl px-5 py-6">
      <div className="grid min-w-0 flex-1 gap-3 text-left text-lg">
        {note.title && (
          <h3 className="m-0 text-lg font-semibold break-words">
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
