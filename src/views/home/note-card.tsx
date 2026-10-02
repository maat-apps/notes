import { CheckSquare, Square } from "@phosphor-icons/react";

import { ListRow } from "@maat-apps/ui/list-row";
import { useTranslation } from "../../i18n/use-translation";
import { splitItems } from "../../lib/checklist-utils";
import type { Note } from "../../lib/schemas";

const PREVIEW_ITEMS = 5;

function ChecklistPreview({
  note,
}: {
  note: Extract<Note, { type: "checklist" }>;
}) {
  const { t } = useTranslation();
  const { unchecked, checked } = splitItems(note.items);
  const shown = unchecked.slice(0, PREVIEW_ITEMS);
  const hidden = unchecked.length - shown.length;
  return (
    <ul className="m-0 grid list-none gap-1 p-0">
      {shown.map((item) => (
        <li key={item.id} className="flex items-start gap-2">
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

/** One note in the list: its title (if any) and a preview of its content. */
export function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return (
    <ListRow onClick={onOpen} className="items-start">
      <div className="grid min-w-0 flex-1 gap-1.5 text-left text-sm">
        {note.title && (
          <h3 className="m-0 text-base font-semibold break-words">
            {note.title}
          </h3>
        )}
        {note.type === "text" ? (
          <p className="text-muted-foreground m-0 line-clamp-6 break-words whitespace-pre-line">
            {note.body}
          </p>
        ) : (
          <ChecklistPreview note={note} />
        )}
      </div>
    </ListRow>
  );
}
