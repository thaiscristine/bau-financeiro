// Turns the rows of a report into what the preview and the spreadsheet show:
// visible columns, groups with subtotals, totals and the filters in words.
// Both read from here, so what is previewed is what is downloaded.

import { formatBRL, formatDate, formatMonth } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import {
  ENTRY_TYPES,
  INSTALLMENT_STATUSES,
  PERIODS,
  REPORTS,
  STOCK_STATES,
  type ReportColumn,
  type ReportDefinition,
} from "./definitions";
import {
  defaultFilters,
  periodRange,
  serializeReportFilters,
  type ReportFilters,
} from "./filters";

export type ReportRow = Record<string, string | number | null>;

export type ReportStat = {
  label: string;
  value: number;
  format: "money" | "number";
  tone: "income" | "cost" | "pending" | "neutral";
};

export type ReportGroupRows = {
  // null when the report is not grouped
  label: string | null;
  rows: ReportRow[];
  subtotal: number | null;
};

export type ActiveFilter = {
  label: string;
  value: string;
  // The report without this filter; null when it cannot be removed
  removeQuery: string | null;
};

// Names for the ids in the filters, to describe them in words
export type FilterNames = {
  categories: Map<number, string>;
  kids: Map<number, string>;
  items: Map<number, string>;
  users: Map<number, string>;
};

export type BuiltReport = {
  definition: ReportDefinition;
  filters: ReportFilters;
  columns: ReportColumn[];
  rows: ReportRow[];
  groups: ReportGroupRows[];
  stats: ReportStat[];
  activeFilters: ActiveFilter[];
  fileName: string;
};

function sum(rows: ReportRow[], key: string) {
  // Rounded to cents so float noise never shows up as R$ 0,01 off
  return Math.round(rows.reduce((total, row) => total + Number(row[key] ?? 0), 0) * 100) / 100;
}

export function reportStats(filters: ReportFilters, rows: ReportRow[]): ReportStat[] {
  switch (filters.type) {
    case "entries": {
      const income = sum(rows.filter((row) => Number(row.amount) > 0), "amount");
      const cost = -sum(rows.filter((row) => Number(row.amount) < 0), "amount");
      const balance = Math.round((income - cost) * 100) / 100;
      return [
        { label: "Entrou", value: income, format: "money", tone: "income" },
        { label: "Saiu", value: cost, format: "money", tone: "cost" },
        { label: "Saldo do período", value: balance, format: "money", tone: balance < 0 ? "cost" : "neutral" },
      ];
    }
    case "installments": {
      const byStatus = (value: string) =>
        sum(rows.filter((row) => row.status === statusLabel(value)), "amount");
      return [
        { label: "Recebido", value: byStatus("paid"), format: "money", tone: "income" },
        { label: "Em aberto", value: byStatus("open"), format: "money", tone: "pending" },
        { label: "Atrasado", value: byStatus("overdue"), format: "money", tone: "cost" },
      ];
    }
    case "sales":
      return [
        { label: "Vendido", value: sum(rows, "total"), format: "money", tone: "neutral" },
        { label: "Recebido", value: sum(rows, "paid"), format: "money", tone: "income" },
        { label: "Falta receber", value: sum(rows, "open"), format: "money", tone: "pending" },
      ];
    case "stock":
      return [
        { label: "Unidades em estoque", value: sum(rows, "stock"), format: "number", tone: "neutral" },
        // Only items whose restocks recorded what was paid have a cost
        { label: "Valor (custo registrado)", value: sum(rows, "costValue"), format: "money", tone: "neutral" },
        { label: "Valor (venda)", value: sum(rows, "saleValue"), format: "money", tone: "income" },
      ];
  }
}

export function statusLabel(value: string) {
  return INSTALLMENT_STATUSES.find((status) => status.value === value)?.label ?? value;
}

const collator = new Intl.Collator("pt-BR");

export function groupRows(
  definition: ReportDefinition,
  filters: ReportFilters,
  rows: ReportRow[]
): ReportGroupRows[] {
  const total = (list: ReportRow[]) =>
    definition.totalKey ? sum(list, definition.totalKey) : null;
  const group = definition.groups.find((option) => option.key === filters.groupBy);
  if (!group || group.key === "none") {
    return [{ label: null, rows, subtotal: total(rows) }];
  }

  const byMonth = group.key === "month";
  const emptyLabel = `Sem ${group.label.toLowerCase()}`;
  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const raw = byMonth ? String(row[definition.dateKey!]).slice(0, 7) : row[group.key];
    const key = raw === null || raw === "" ? "" : String(raw);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  // Months in calendar order, everything else alphabetically, the empty group last
  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === "" || b === "") return a === "" ? 1 : -1;
      return byMonth ? a.localeCompare(b) : collator.compare(a, b);
    })
    .map(([key, list]) => ({
      label: key === "" ? emptyLabel : byMonth ? formatMonth(key) : key,
      rows: list,
      subtotal: total(list),
    }));
}

function periodText(filters: ReportFilters, today: string) {
  const { from, to } = periodRange(filters, today);
  const label = PERIODS.find((period) => period.value === filters.period)!.label;
  if (filters.period === "all") return "Tudo";
  if (filters.period === "custom") {
    if (from && to) return `${formatDate(from)} a ${formatDate(to)}`;
    if (from) return `A partir de ${formatDate(from)}`;
    if (to) return `Até ${formatDate(to)}`;
    return "Tudo";
  }
  return `${label} (${formatDate(from!)} a ${formatDate(to!)})`;
}

export function activeFilters(
  filters: ReportFilters,
  names: FilterNames,
  today: string
): ActiveFilter[] {
  const definition = REPORTS[filters.type];
  const without = (change: Partial<ReportFilters>) =>
    serializeReportFilters({ ...filters, ...change });
  const list: ActiveFilter[] = [];
  const defaults = defaultFilters(filters.type);

  if (definition.periodLabel) {
    list.push({
      label: definition.periodLabel,
      value: periodText(filters, today),
      removeQuery: filters.period === "all" ? null : without({ period: "all", from: null, to: null }),
    });
  }
  if (filters.entryType !== defaults.entryType) {
    list.push({
      label: "Tipo",
      value: ENTRY_TYPES.find((option) => option.value === filters.entryType)!.label,
      removeQuery: without({ entryType: "all" }),
    });
  }
  for (const id of filters.categoryIds) {
    list.push({
      label: "Categoria",
      value: names.categories.get(id) ?? "Categoria excluída",
      removeQuery: without({ categoryIds: filters.categoryIds.filter((other) => other !== id) }),
    });
  }
  for (const method of filters.paymentMethods) {
    list.push({
      label: "Pagamento",
      value: PAYMENT_METHOD_LABELS[method],
      removeQuery: without({
        paymentMethods: filters.paymentMethods.filter((other) => other !== method),
      }),
    });
  }
  for (const status of filters.statuses) {
    list.push({
      label: "Situação",
      value: statusLabel(status),
      removeQuery: without({ statuses: filters.statuses.filter((other) => other !== status) }),
    });
  }
  if (filters.kidId) {
    list.push({
      label: "Bandeirante",
      value: names.kids.get(filters.kidId) ?? "Bandeirante excluído",
      removeQuery: without({ kidId: null }),
    });
  }
  if (filters.itemId) {
    list.push({
      label: "Item",
      value: names.items.get(filters.itemId) ?? "Item excluído",
      removeQuery: without({ itemId: null }),
    });
  }
  if (filters.createdById) {
    list.push({
      label: "Registrado por",
      value: names.users.get(filters.createdById) ?? "Usuário excluído",
      removeQuery: without({ createdById: null }),
    });
  }
  if (filters.search) {
    list.push({ label: "Busca", value: `"${filters.search}"`, removeQuery: without({ search: "" }) });
  }
  if (filters.stockState !== "all") {
    list.push({
      label: "Situação",
      value: STOCK_STATES.find((state) => state.value === filters.stockState)!.label,
      removeQuery: without({ stockState: "all" }),
    });
  }
  return list;
}

// A short line for a saved template, such as "Transações · Mês passado · por categoria"
export function describeFilters(filters: ReportFilters) {
  const definition = REPORTS[filters.type];
  const parts: string[] = [definition.title];
  if (definition.periodLabel) {
    parts.push(PERIODS.find((period) => period.value === filters.period)!.label);
  }
  if (filters.entryType !== "all") {
    parts.push(ENTRY_TYPES.find((option) => option.value === filters.entryType)!.label.toLowerCase());
  }
  if (filters.statuses.length > 0) {
    parts.push(
      filters.statuses
        .map((status) => INSTALLMENT_STATUSES.find((option) => option.value === status)!.filterLabel.toLowerCase())
        .join(", ")
    );
  }
  const group = definition.groups.find((option) => option.key === filters.groupBy);
  if (group && group.key !== "none") parts.push(`por ${group.label.toLowerCase()}`);
  return parts.join(" · ");
}

export function reportFileName(filters: ReportFilters, today: string) {
  const { fileSlug, periodLabel } = REPORTS[filters.type];
  const { from, to } = periodLabel ? periodRange(filters, today) : { from: null, to: null };
  if (from && to) return `${fileSlug}_${from}_a_${to}.xlsx`;
  if (from) return `${fileSlug}_desde_${from}.xlsx`;
  if (to) return `${fileSlug}_ate_${to}.xlsx`;
  return `${fileSlug}_${today}.xlsx`;
}

export function buildReport(
  filters: ReportFilters,
  rows: ReportRow[],
  names: FilterNames,
  today: string
): BuiltReport {
  const definition = REPORTS[filters.type];
  return {
    definition,
    filters,
    columns: definition.columns.filter((column) => !filters.hiddenColumns.includes(column.key)),
    rows,
    groups: groupRows(definition, filters, rows),
    stats: reportStats(filters, rows),
    activeFilters: activeFilters(filters, names, today),
    fileName: reportFileName(filters, today),
  };
}

export function formatStat(stat: ReportStat) {
  return stat.format === "money" ? formatBRL(stat.value) : stat.value.toLocaleString("pt-BR");
}
