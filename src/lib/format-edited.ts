/**
 * When a note was last edited, as short as it can be: the time today, the
 * day and month this year, with the year before that.
 */
export function formatEdited(
  updatedAt: string,
  locale: string,
  now = new Date(),
): string {
  const date = new Date(updatedAt);
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}
