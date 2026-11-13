// Splits a total into monthly installments. Amounts are worked in cents so the
// installments always add up to the exact total; leftover cents go to the first ones.
export function planInstallments(
  totalCents: number,
  count: number,
  firstDueDate: string
) {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;

  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    amountCents: base + (index < remainder ? 1 : 0),
    dueDate: addMonths(firstDueDate, index),
  }));
}

// Adds months to a YYYY-MM-DD date, clamping to the last day of shorter months
// (31/01 + 1 month = 28/02 or 29/02).
export function addMonths(isoDate: string, months: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function toCents(value: string | number) {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number) {
  return (cents / 100).toFixed(2);
}
