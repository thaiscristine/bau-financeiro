// When the contribuição mensal is charged. Pure, so it is unit tested and
// shared by the database code and the screens.

import { firstDay } from "@/lib/months";

// February to November, skipping the July holidays
export const DEFAULT_CONTRIBUTION_MONTHS = [2, 3, 4, 5, 6, 8, 9, 10, 11] as const;

export function isDefaultContributionMonth(month: number) {
  return (DEFAULT_CONTRIBUTION_MONTHS as readonly number[]).includes(month);
}

// The twelve months of a year, each due when it is a default month from
// fromMonth on. A kid who starts paying mid-year owes nothing before that.
export function planContributionYear(year: number, fromMonth = 1) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      month: firstDay(year, month),
      due: month >= fromMonth && isDefaultContributionMonth(month),
    };
  });
}

// A month's contribution is late once the month is over
export function isContributionOverdue(month: string, today: string) {
  return month < `${today.slice(0, 7)}-01`;
}
