// The period of the Lojinha report, read from its query string. It uses the
// same periods as /reports, so the spreadsheet link opens the same span.

import { PERIODS, type Period } from "../reports/definitions";
import type { SearchParamsRecord } from "../reports/filters";
import { isoDate } from "../months";

export type SalesReportPeriod = {
  period: Period;
  // Only used by the custom period, as YYYY-MM-DD
  from: string | null;
  to: string | null;
};

export const DEFAULT_PERIOD: Period = "this-month";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Anything unknown falls back to the default, so a hand-edited link still opens
export function parseSalesReportPeriod(params: SearchParamsRecord): SalesReportPeriod {
  const value = first(params.period);
  const period = PERIODS.find((option) => option.value === value)?.value ?? DEFAULT_PERIOD;
  if (period !== "custom") return { period, from: null, to: null };
  return { period, from: isoDate(first(params.from)), to: isoDate(first(params.to)) };
}

export function periodQuery(period: SalesReportPeriod) {
  const params = new URLSearchParams({ period: period.period });
  if (period.period === "custom") {
    if (period.from) params.set("from", period.from);
    if (period.to) params.set("to", period.to);
  }
  return params.toString();
}

export type MonthTotals = {
  month: string;
  sold: number;
  received: number;
  restockCost: number;
};

// Joins the per-month sums of each source into one row per month, newest first.
// A month only shows up when something happened in it.
export function mergeMonths(sources: {
  sold: { month: string; total: number }[];
  received: { month: string; total: number }[];
  restockCost: { month: string; total: number }[];
}): MonthTotals[] {
  const months = new Map<string, MonthTotals>();
  const row = (month: string) => {
    let existing = months.get(month);
    if (!existing) {
      existing = { month, sold: 0, received: 0, restockCost: 0 };
      months.set(month, existing);
    }
    return existing;
  };
  for (const { month, total } of sources.sold) row(month).sold += total;
  for (const { month, total } of sources.received) row(month).received += total;
  for (const { month, total } of sources.restockCost) row(month).restockCost += total;
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}
