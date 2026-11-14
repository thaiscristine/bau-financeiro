// The period the dashboard (painel) looks at, read from its query string.
// Unlike reports there is no open-ended option: every figure on the panel is
// about a concrete span of dates, the current month unless another is chosen.

import { monthRange } from "@/lib/months";

export const DASHBOARD_PERIODS = [
  { value: "this-month", label: "Este mês" },
  { value: "last-month", label: "Mês passado" },
  { value: "next-month", label: "Próximo mês" },
  { value: "custom", label: "Escolher datas" },
] as const;

export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]["value"];

export type DateRange = { from: string; to: string };

const MONTH_OFFSET = { "this-month": 0, "last-month": -1, "next-month": 1 } as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Rejects impossible days like 2026-02-31, which Postgres would refuse
function isoDate(value: string | null) {
  if (!value || !ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
    ? value
    : null;
}

// Anything unknown falls back to the current month. A custom period missing
// one of its dates takes that end from the current month, and dates typed in
// the wrong order still mean the span between them.
export function parseDashboardPeriod(
  params: URLSearchParams,
  today: string
): { period: DashboardPeriod; range: DateRange } {
  const period =
    DASHBOARD_PERIODS.find((option) => option.value === params.get("period"))
      ?.value ?? "this-month";
  if (period !== "custom") {
    return { period, range: monthRange(today, MONTH_OFFSET[period]) };
  }

  const current = monthRange(today, 0);
  const from = isoDate(params.get("from")) ?? current.from;
  const to = isoDate(params.get("to")) ?? current.to;
  return {
    period,
    range: from <= to ? { from, to } : { from: to, to: from },
  };
}
