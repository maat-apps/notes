// Finds the web links in a note's text (PRODUCT.md: tappable, never fetched).
// Only http(s) links count, so nothing like `javascript:` ever reaches an
// href.

const LINK_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const LABEL_LENGTH = 40;

/** Drops sentence punctuation and a closing bracket the link never opened. */
function trimTrailing(link: string): string {
  let trimmed = link.replace(TRAILING_PUNCTUATION, "");
  for (;;) {
    const last = trimmed.at(-1);
    const opener = last === undefined ? undefined : CLOSERS[last];
    if (!opener) return trimmed;
    const opened = trimmed.split(opener).length - 1;
    const closed = trimmed.split(last as string).length - 1;
    if (closed <= opened) return trimmed;
    trimmed = trimmed.slice(0, -1).replace(TRAILING_PUNCTUATION, "");
  }
}

function toHref(link: string): string | null {
  const href = /^www\./i.test(link) ? `https://${link}` : link;
  try {
    const { protocol } = new URL(href);
    return protocol === "http:" || protocol === "https:" ? href : null;
  } catch {
    return null;
  }
}

/** Every distinct http(s) link in `text`, in order of appearance. */
export function findLinks(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(LINK_PATTERN)) {
    const href = toHref(trimTrailing(match[0]));
    if (href) found.add(href);
  }
  return [...found];
}

/** A short, readable form of a link: host and path, without the scheme. */
export function linkLabel(href: string): string {
  const { host, pathname, search } = new URL(href);
  const path = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  const label = `${host.replace(/^www\./, "")}${path}${search}`;
  return label.length > LABEL_LENGTH
    ? `${label.slice(0, LABEL_LENGTH - 1)}…`
    : label;
}
