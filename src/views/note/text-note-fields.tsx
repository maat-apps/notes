import { useTranslation } from "../../i18n/use-translation";
import type { TextNote } from "../../lib/schemas";

/** A plain-text note's body — no formatting (PRODUCT.md). */
export function TextNoteFields({
  note,
  autoFocus,
  onChange,
}: {
  note: TextNote;
  autoFocus: boolean;
  onChange: (note: TextNote) => void;
}) {
  const { t } = useTranslation();
  return (
    <textarea
      value={note.body}
      autoFocus={autoFocus}
      aria-label={t("noteBody")}
      placeholder={t("notePlaceholder")}
      className="placeholder:text-muted-foreground [field-sizing:content] min-h-40 w-full resize-none bg-transparent text-base leading-relaxed outline-none"
      onChange={(event) => onChange({ ...note, body: event.target.value })}
    />
  );
}
