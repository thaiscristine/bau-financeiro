import "server-only";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/format";
import type { BuiltReport, ReportGroupRows, ReportRow } from "./build";
import type { ReportColumn } from "./definitions";

// Written in Excel's neutral format; Excel shows it with the reader's separators
const MONEY_FORMAT = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
const DATE_FORMAT = "dd/mm/yyyy";
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1EEE9" } };
const GROUP_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF9F6" } };

// Dates become real dates (sortable, filterable); amounts stay numbers so SUM works
function cellValue(column: ReportColumn, value: ReportRow[string]) {
  if (value === null || value === "") return null;
  if (column.kind === "date") {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  if (column.kind === "money" || column.kind === "number") return Number(value);
  return String(value);
}

function columnWidth(column: ReportColumn) {
  if (column.kind === "note") return 40;
  if (column.kind === "date") return 12;
  if (column.kind === "money") return 15;
  return Math.max(12, column.label.length + 4);
}

// Sheet names are at most 31 characters, without : \ / ? * [ ], and unique
function sheetName(name: string, used: Set<string>) {
  const base = name.replace(/[:\\/?*[\]]/g, "-").trim().slice(0, 31) || "Aba";
  let candidate = base;
  for (let n = 2; used.has(candidate.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  report: BuiltReport,
  groups: ReportGroupRows[]
) {
  const { columns, definition } = report;
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: columnWidth(column),
    style: {
      numFmt: column.kind === "money" ? MONEY_FORMAT : column.kind === "date" ? DATE_FORMAT : undefined,
      alignment: column.kind === "note" ? { wrapText: true, vertical: "top" } : { vertical: "top" },
    },
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = HEADER_FILL;
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const totalIndex = columns.findIndex((column) => column.key === definition.totalKey);
  for (const group of groups) {
    if (group.label !== null) {
      const row = sheet.addRow([group.label]);
      row.font = { bold: true };
      row.fill = GROUP_FILL;
    }
    for (const data of group.rows) {
      sheet.addRow(columns.map((column) => cellValue(column, data[column.key])));
    }
    if (group.label !== null && group.subtotal !== null && totalIndex >= 0) {
      const values: (string | number | null)[] = columns.map(() => null);
      values[0] = `Subtotal ${group.label}`;
      values[totalIndex] = group.subtotal;
      const row = sheet.addRow(values);
      row.font = { bold: true };
      row.border = { top: { style: "thin" } };
      sheet.addRow([]);
    }
  }
  return sheet;
}

function addSummarySheet(workbook: ExcelJS.Workbook, report: BuiltReport, today: string) {
  const sheet = workbook.addWorksheet("Resumo");
  sheet.columns = [{ width: 32 }, { width: 48 }];
  const title = sheet.addRow([`Baú Financeiro - ${report.definition.title}`]);
  title.font = { bold: true, size: 14 };
  sheet.addRow(["Gerado em", formatDate(today)]);
  sheet.addRow([]);

  const heading = (text: string) => {
    sheet.addRow([text]).font = { bold: true };
  };
  heading("Filtros usados");
  for (const filter of report.activeFilters) sheet.addRow([filter.label, filter.value]);
  if (report.activeFilters.length === 0) sheet.addRow(["Nenhum", "Todos os registros"]);
  sheet.addRow([]);

  heading("Totais");
  for (const stat of report.stats) {
    const row = sheet.addRow([stat.label, stat.value]);
    if (stat.format === "money") row.getCell(2).numFmt = MONEY_FORMAT;
  }
  sheet.addRow(["Linhas", report.rows.length]);

  const group = report.definition.groups.find((option) => option.key === report.filters.groupBy);
  if (group && group.key !== "none" && report.definition.totalKey) {
    sheet.addRow([]);
    heading(`Por ${group.label.toLowerCase()}`);
    for (const { label, subtotal } of report.groups) {
      sheet.addRow([label, subtotal]).getCell(2).numFmt = MONEY_FORMAT;
    }
  }
  sheet.getColumn(2).alignment = { horizontal: "left" };
}

export async function reportWorkbook(report: BuiltReport, today: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Baú Financeiro";
  const used = new Set<string>();

  if (report.filters.summarySheet) {
    used.add("resumo");
    addSummarySheet(workbook, report, today);
  }
  addDataSheet(workbook, sheetName(report.definition.sheetName, used), report, report.groups);
  if (report.filters.sheetPerGroup) {
    for (const group of report.groups) {
      addDataSheet(workbook, sheetName(group.label ?? "Aba", used), report, [{ ...group, label: null }]);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
