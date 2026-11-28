const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long ago the last backup was, in whole calendar days ("today",
 * "yesterday", "12 days ago"), in `locale`.
 */
export function formatBackupAge(
  lastBackupAt: string,
  locale: string,
  now = new Date(),
): string {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round(
    (startOfDay(now) - startOfDay(new Date(lastBackupAt))) / DAY_MS,
  );
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    -Math.max(days, 0),
    "day",
  );
}
