import { ArrowSquareOut } from "@phosphor-icons/react";

import { useTranslation } from "../../i18n/use-translation";
import { linkLabel } from "../../lib/links";

/** The links found in a text note, as tappable chips below its body. */
export function LinkList({ links }: { links: string[] }) {
  const { t } = useTranslation();
  if (links.length === 0) return null;
  return (
    <ul
      className="m-0 flex list-none flex-wrap gap-2 p-0"
      aria-label={t("links")}
    >
      {links.map((href) => (
        <li key={href} className="max-w-full min-w-0">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-secondary text-secondary-foreground active:bg-muted flex min-h-11 max-w-full items-center gap-2 rounded-full px-4 text-sm font-medium"
          >
            <ArrowSquareOut aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{linkLabel(href)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
