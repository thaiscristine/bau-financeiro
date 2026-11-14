import Link from "next/link";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
  type DateRange,
} from "@/lib/dashboard-period";
import { formatDate } from "@/lib/format";
import {
  chipClass,
  hintClass,
  inputClass,
  secondaryButtonClass,
} from "@/components/styles";

// Plain links and a GET form, so choosing a period is just a new URL that can
// be bookmarked or shared and works before any JavaScript loads
export function PeriodFilter({
  period,
  range,
}: {
  period: DashboardPeriod;
  range: DateRange;
}) {
  return (
    <nav aria-label="Período" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <ul className="flex flex-wrap gap-1.5">
          {DASHBOARD_PERIODS.map((option) => (
            <li key={option.value}>
              <Link
                href={
                  option.value === "this-month"
                    ? "/dashboard"
                    : `/dashboard?period=${option.value}`
                }
                aria-current={period === option.value ? "page" : undefined}
                className={chipClass}
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
        {period !== "custom" && (
          <p className={`${hintClass} tabular-nums`}>
            {formatDate(range.from)} a {formatDate(range.to)}
          </p>
        )}
      </div>
      {period === "custom" && (
        // Keyed by the range so the inputs show the applied dates after a submit
        <form
          key={`${range.from}:${range.to}`}
          action="/dashboard"
          className="grid grid-cols-2 gap-2 sm:flex sm:items-end"
        >
          <input type="hidden" name="period" value="custom" />
          <label className="flex min-w-0 flex-col gap-1">
            <span className={hintClass}>De</span>
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              required
              className={`${inputClass} w-full min-w-0`}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className={hintClass}>Até</span>
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              required
              className={`${inputClass} w-full min-w-0`}
            />
          </label>
          <button
            type="submit"
            className={`${secondaryButtonClass} col-span-2`}
          >
            Aplicar
          </button>
        </form>
      )}
    </nav>
  );
}
