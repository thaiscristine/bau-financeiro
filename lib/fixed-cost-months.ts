// When a fixed cost's month is due. Pure, so it is unit tested and shared by
// the database code and the screens.

import { addMonths, firstDay, lastDay } from "@/lib/months";

// The due date of a month (its first day). A month without the due day, like
// February for the 31st, is due on its last day.
export function fixedCostDueDate(month: string, dueDay: number) {
  const last = lastDay(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const day = Math.min(dueDay, Number(last.slice(8, 10)));
  return `${month.slice(0, 8)}${String(day).padStart(2, "0")}`;
}

// Late once the due date has passed without a payment
export function isFixedCostLate(month: string, dueDay: number, today: string) {
  return fixedCostDueDate(month, dueDay) < today;
}

// The first days of the `count` months up to the one today falls in, oldest first
export function recentMonths(today: string, count: number) {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return Array.from({ length: count }, (_, index) => {
    const shifted = addMonths(year, month, index - (count - 1));
    return firstDay(shifted.year, shifted.month);
  });
}
