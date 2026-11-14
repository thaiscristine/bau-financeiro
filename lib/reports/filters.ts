// The filters of a report and their query-string form. The query string is the
// source of truth: the /reports URL, the export link and saved templates all
// carry it, so a report always opens the same way wherever it came from.

import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment-methods";
import {
  ENTRY_TYPES,
  INSTALLMENT_STATUSES,
  PERIODS,
  REPORT_TYPES,
  REPORTS,
  STOCK_STATES,
  type EntryTypeFilter,
  type InstallmentStatus,
  type Period,
  type ReportType,
  type StockState,
} from "./definitions";
import { firstDay, lastDay, monthRange } from "@/lib/months";

export type ReportFilters = {
  type: ReportType;
  period: Period;
  // Only used by the custom period, as YYYY-MM-DD
  from: string | null;
  to: string | null;
  entryType: EntryTypeFilter;
  categoryIds: number[];
  kidId: number | null;
  itemId: number | null;
  createdById: number | null;
  search: string;
  paymentMethods: PaymentMethod[];
  statuses: InstallmentStatus[];
  stockState: StockState;
  groupBy: string;
  hiddenColumns: string[];
  // Adds a "Resumo" sheet with the filters used and the totals
  summarySheet: boolean;
  // One extra sheet per group
  sheetPerGroup: boolean;
};

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function toSearchParams(record: SearchParamsRecord) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      params.append(key, item);
    }
  }
  return params;
}

export function defaultFilters(type: ReportType): ReportFilters {
  return {
    type,
    // Collections are followed up over every due date; the rest look back at a closed month
    period: type === "installments" || type === "stock" ? "all" : "last-month",
    from: null,
    to: null,
    entryType: "all",
    categoryIds: [],
    kidId: null,
    itemId: null,
    createdById: null,
    search: "",
    paymentMethods: [],
    statuses: [],
    stockState: "all",
    groupBy: "none",
    hiddenColumns: REPORTS[type].columns
      .filter((column) => column.hiddenByDefault)
      .map((column) => column.key),
    summarySheet: true,
    sheetPerGroup: false,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(values: readonly { value: T }[], value: string | null) {
  return values.find((option) => option.value === value)?.value;
}

function positiveInt(value: string | null) {
  const number = Number(value);
  return value && Number.isInteger(number) && number > 0 ? number : null;
}

// Anything unknown or invalid falls back to the default, so an old or
// hand-edited link still opens a report instead of an error. Filters that do
// not apply to the report type are dropped, which keeps the result canonical.
export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const type = REPORT_TYPES.find((value) => value === params.get("type")) ?? "entries";
  const report = REPORTS[type];
  const filters = defaultFilters(type);
  const uses = (key: (typeof report.filters)[number]) => report.filters.includes(key);

  if (uses("period")) {
    filters.period = oneOf(PERIODS, params.get("period")) ?? filters.period;
    if (filters.period === "custom") {
      const from = params.get("from");
      const to = params.get("to");
      filters.from = from && ISO_DATE.test(from) ? from : null;
      filters.to = to && ISO_DATE.test(to) ? to : null;
    }
  }
  if (uses("entryType")) {
    filters.entryType = oneOf(ENTRY_TYPES, params.get("kind")) ?? "all";
  }
  if (uses("categories")) {
    const ids = params.getAll("category").map(positiveInt).filter((id) => id !== null);
    filters.categoryIds = [...new Set(ids)].sort((a, b) => a - b);
  }
  if (uses("kid")) filters.kidId = positiveInt(params.get("kid"));
  if (uses("item")) filters.itemId = positiveInt(params.get("item"));
  if (uses("createdBy")) filters.createdById = positiveInt(params.get("user"));
  if (uses("search")) filters.search = (params.get("q") ?? "").trim().slice(0, 100);
  if (uses("paymentMethods")) {
    const chosen = new Set(params.getAll("payment"));
    filters.paymentMethods = PAYMENT_METHODS.filter((method) => chosen.has(method));
  }
  if (uses("statuses")) {
    const chosen = new Set(params.getAll("status"));
    filters.statuses = INSTALLMENT_STATUSES.map((status) => status.value).filter((value) =>
      chosen.has(value)
    );
  }
  if (uses("stockState")) {
    filters.stockState = oneOf(STOCK_STATES, params.get("stock")) ?? "all";
  }

  const group = params.get("group");
  if (report.groups.some((option) => option.key === group)) filters.groupBy = group!;

  // An empty "hide" means every column is shown, which differs from the default
  // when some columns start hidden
  if (params.has("hide")) {
    const hidden = new Set(params.getAll("hide"));
    filters.hiddenColumns = report.columns
      .map((column) => column.key)
      .filter((key) => hidden.has(key));
  }
  // The spreadsheet needs at least one column
  if (filters.hiddenColumns.length === report.columns.length) {
    filters.hiddenColumns = defaultFilters(type).hiddenColumns;
  }

  filters.summarySheet = params.get("summary") !== "0";
  filters.sheetPerGroup = filters.groupBy !== "none" && params.get("sheets") === "1";

  return filters;
}

// Writes only what differs from the defaults, in a fixed order, so equal
// filters always give the same string
export function serializeReportFilters(filters: ReportFilters) {
  const defaults = defaultFilters(filters.type);
  const params = new URLSearchParams();
  params.set("type", filters.type);
  if (filters.period !== defaults.period) params.set("period", filters.period);
  if (filters.period === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.entryType !== "all") params.set("kind", filters.entryType);
  for (const id of filters.categoryIds) params.append("category", String(id));
  for (const method of filters.paymentMethods) params.append("payment", method);
  if (filters.kidId) params.set("kid", String(filters.kidId));
  if (filters.itemId) params.set("item", String(filters.itemId));
  if (filters.createdById) params.set("user", String(filters.createdById));
  if (filters.search) params.set("q", filters.search);
  for (const status of filters.statuses) params.append("status", status);
  if (filters.stockState !== "all") params.set("stock", filters.stockState);
  if (filters.groupBy !== "none") params.set("group", filters.groupBy);
  if (filters.hiddenColumns.join() !== defaults.hiddenColumns.join()) {
    if (filters.hiddenColumns.length === 0) params.set("hide", "");
    for (const key of filters.hiddenColumns) params.append("hide", key);
  }
  if (!filters.summarySheet) params.set("summary", "0");
  if (filters.sheetPerGroup) params.set("sheets", "1");
  return params.toString();
}

// Puts a query string in canonical form, to tell whether two describe the same report
export function normalizeReportQuery(query: string) {
  return serializeReportFilters(parseReportFilters(new URLSearchParams(query)));
}

// The dates a period covers, relative to today. Whole calendar months, so
// "este mês" also shows installments due later this month. null is open-ended.
export function periodRange(
  filters: Pick<ReportFilters, "period" | "from" | "to">,
  today: string
): { from: string | null; to: string | null } {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  switch (filters.period) {
    case "this-month":
      return monthRange(today, 0);
    case "last-month":
      return monthRange(today, -1);
    case "quarter": {
      const start = month - ((month - 1) % 3);
      return { from: firstDay(year, start), to: lastDay(year, start + 2) };
    }
    case "year":
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    case "all":
      return { from: null, to: null };
    case "custom":
      // Dates typed in the wrong order still mean the span between them
      if (filters.from && filters.to && filters.from > filters.to) {
        return { from: filters.to, to: filters.from };
      }
      return { from: filters.from, to: filters.to };
  }
}
