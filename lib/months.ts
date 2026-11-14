// Calendar month arithmetic on YYYY-MM-DD strings, free of timezones

export function addMonths(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function firstDay(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function lastDay(year: number, month: number) {
  const next = addMonths(year, month, 1);
  const date = new Date(Date.UTC(next.year, next.month - 1, 0));
  return date.toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The value as a YYYY-MM-DD date, or null. Rejects impossible days like
// 2026-02-31, which Postgres would refuse.
export function isoDate(value: string | null | undefined) {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    ? value
    : null;
}

// The whole calendar month `delta` months away from the one `today` falls in
export function monthRange(today: string, delta: number) {
  const { year, month } = addMonths(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)),
    delta
  );
  return { from: firstDay(year, month), to: lastDay(year, month) };
}
