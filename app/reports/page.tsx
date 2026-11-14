import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { REPORT_TYPES, REPORTS, type ReportColumn } from "@/lib/reports/definitions";
import {
  normalizeReportQuery,
  parseReportFilters,
  serializeReportFilters,
  toSearchParams,
} from "@/lib/reports/filters";
import { buildReport, describeFilters, formatStat, type BuiltReport, type ReportGroupRows, type ReportRow } from "@/lib/reports/build";
import {
  fetchReportRows,
  filterNames,
  listFilterOptions,
  listReportTemplates,
} from "@/lib/reports/queries";
import { Page, Section } from "@/components/page";
import { Eyebrow } from "@/components/eyebrow";
import {
  cardClass,
  labelClass,
  tableCell,
  tableClass,
  tableHeadCell,
} from "@/components/styles";
import { ReportWorkspace } from "./report-workspace";
import { Templates } from "./templates";

// The preview shows the first rows; the spreadsheet always has all of them
const PREVIEW_ROWS = 60;

const STAT_TONES = {
  income: "text-income",
  cost: "text-cost",
  pending: "text-pending",
  neutral: "",
};

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  await requireSession();
  const params = toSearchParams(await searchParams);
  const filters = parseReportFilters(params);
  const query = serializeReportFilters(filters);
  const today = todayISO();

  const [rows, options, templates] = await Promise.all([
    fetchReportRows(filters, today),
    listFilterOptions(),
    listReportTemplates(),
  ]);
  const report = buildReport(filters, rows, filterNames(options), today);

  const templateCards = templates.map((template) => {
    const templateQuery = normalizeReportQuery(template.query);
    return {
      id: template.id,
      name: template.name,
      description: describeFilters(parseReportFilters(new URLSearchParams(templateQuery))),
      href: `/reports?${templateQuery}&template=${template.id}`,
    };
  });
  // A deleted template's link opens its filters without it
  const activeTemplate = templates.find((template) => String(template.id) === params.get("template"));
  const active = activeTemplate
    ? {
        id: activeTemplate.id,
        name: activeTemplate.name,
        href: templateCards.find((card) => card.id === activeTemplate.id)!.href,
        modified: normalizeReportQuery(activeTemplate.query) !== query,
      }
    : null;

  return (
    <Page title="Relatórios">
      <p className="-mt-4 max-w-2xl font-serif text-[17px] leading-relaxed text-muted">
        Escolha um modelo salvo ou monte o seu: filtre, confira a prévia e baixe a planilha.
      </p>

      <Section title="Modelos salvos">
        <Templates templates={templateCards} activeId={active?.id ?? null} />
      </Section>

      <nav aria-label="Tipo de relatório" className={`grid grid-cols-2 lg:grid-cols-4 ${cardClass}`}>
        {REPORT_TYPES.map((type) => {
          const definition = REPORTS[type];
          const current = type === filters.type;
          return (
            <Link
              key={type}
              href={`/reports?type=${type}`}
              aria-current={current ? "page" : undefined}
              className={`relative flex flex-col gap-1.5 border-line p-4 transition-colors not-last:border-r max-lg:nth-[2]:border-r-0 max-lg:nth-[-n+2]:border-b hover:bg-canvas sm:p-5 ${
                current ? "bg-canvas after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-ink" : ""
              }`}
            >
              <span className={labelClass}>Relatório</span>
              <span className="text-[17px] tracking-[-0.01em]">{definition.title}</span>
              <span className="text-[13px] leading-snug text-muted max-sm:hidden">{definition.description}</span>
            </Link>
          );
        })}
      </nav>

      <ReportWorkspace
        filters={filters}
        options={options}
        template={active}
        today={today}
      >
        <ActiveFilters report={report} templateId={active?.id ?? null} />
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${cardClass}`}>
          {report.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-3 border-line p-5 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0"
            >
              <span className={labelClass}>{stat.label}</span>
              <span className={`text-[28px] leading-none tracking-[-0.02em] tabular-nums ${STAT_TONES[stat.tone]}`}>
                {formatStat(stat)}
              </span>
            </div>
          ))}
        </div>
        <Preview report={report} />
      </ReportWorkspace>
    </Page>
  );
}

function ActiveFilters({ report, templateId }: { report: BuiltReport; templateId: number | null }) {
  const template = templateId ? `&template=${templateId}` : "";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${labelClass} mr-1`}>Mostrando</span>
      {report.activeFilters.length === 0 && <span className="text-[13px] text-muted">tudo, sem filtros</span>}
      {report.activeFilters.map((filter) => (
        <span
          key={`${filter.label}-${filter.value}`}
          className="inline-flex h-7 items-center gap-1 rounded-[3px] bg-sunken pr-1 pl-2.5 text-[13px]"
        >
          <span className="text-muted">{filter.label}:</span> {filter.value}
          {filter.removeQuery === null ? (
            <span className="w-1.5" />
          ) : (
            <Link
              href={`/reports?${filter.removeQuery}${template}`}
              scroll={false}
              replace
              aria-label={`Remover filtro ${filter.label}: ${filter.value}`}
              className="px-1.5 text-[15px] leading-none text-muted transition-colors hover:text-ink"
            >
              ×
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}

function Preview({ report }: { report: BuiltReport }) {
  const { columns, definition, groups, rows, filters } = report;
  const grouped = groups[0]?.label !== null;
  const totalIndex = columns.findIndex((column) => column.key === definition.totalKey);

  const sheets = [
    ...(filters.summarySheet ? ["Resumo"] : []),
    definition.sheetName,
    ...(filters.sheetPerGroup ? groups.map((group) => group.label!) : []),
  ];

  return (
    <div className={`overflow-hidden ${cardClass}`}>
      {rows.length === 0 ? (
        <p className="px-5 py-12 text-center font-serif text-[17px] text-muted">
          Nenhum registro com esses filtros.
        </p>
      ) : (
        <div className="relative max-h-[600px] overflow-auto">
          <table className={tableClass}>
            {/* Solid cells and a shadow line instead of the shared translucent
                row and its border, which let rows show through once it sticks */}
            <thead className="sticky top-0 z-[1]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${tableHeadCell} bg-sunken shadow-[inset_0_-1px_0_var(--line)] ${
                      alignRight(column) ? "text-right" : ""
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            {previewGroups(groups).map(({ group, shown }) => (
              <tbody key={group.label ?? "all"}>
                {grouped && (
                  <tr className="border-b border-line-soft bg-canvas">
                    <td colSpan={columns.length} className="px-5 pt-4 pb-2.5">
                      <Eyebrow as="span" tone="ink">
                        {group.label} · {group.rows.length} {group.rows.length === 1 ? "linha" : "linhas"}
                      </Eyebrow>
                    </td>
                  </tr>
                )}
                {shown.map((row, index) => (
                  <tr key={index} className="border-b border-line-soft transition-colors hover:bg-canvas">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${tableCell} whitespace-nowrap ${alignRight(column) ? "text-right" : ""} ${
                          column.kind === "note" ? "max-w-60 truncate font-serif text-muted" : ""
                        }`}
                      >
                        <Cell column={column} row={row} />
                      </td>
                      ))}
                    </tr>
                  ))}
                  {grouped && group.subtotal !== null && totalIndex >= 0 && shown.length === group.rows.length && (
                    <tr className="border-b border-line bg-canvas font-medium">
                      {columns.map((column, index) => (
                        <td key={column.key} className={`${tableCell} whitespace-nowrap ${index === totalIndex ? "text-right" : ""}`}>
                          {index === 0 ? "Subtotal" : index === totalIndex ? formatBRL(group.subtotal!) : ""}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
            ))}
          </table>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-muted">
        <span>
          {rows.length} {rows.length === 1 ? "linha" : "linhas"} no relatório
          {rows.length > PREVIEW_ROWS && ` · prévia das primeiras ${PREVIEW_ROWS}, a planilha leva todas`}
        </span>
        <span className="font-mono">{report.fileName}</span>
      </div>
      <div className="flex overflow-x-auto border-t border-line bg-sunken" aria-label="Abas da planilha">
        {sheets.map((sheet, index) => (
          <span
            key={`${sheet}-${index}`}
            className={`border-r border-line px-3.5 py-2 text-[13px] whitespace-nowrap ${
              sheet === definition.sheetName && index === (filters.summarySheet ? 1 : 0)
                ? "-mt-px bg-surface text-ink"
                : "text-muted"
            }`}
          >
            {sheet}
          </span>
        ))}
        <span className="ml-auto px-3.5 py-2 text-xs whitespace-nowrap text-muted">Abas da planilha</span>
      </div>
    </div>
  );
}

// Spreads the preview's row limit over the groups in order, dropping groups
// that no longer fit
function previewGroups(groups: ReportGroupRows[]) {
  let left = PREVIEW_ROWS;
  return groups.flatMap((group) => {
    const shown = group.rows.slice(0, left);
    left -= shown.length;
    return shown.length > 0 ? [{ group, shown }] : [];
  });
}

function alignRight(column: ReportColumn) {
  return column.kind === "money" || column.kind === "number";
}

function Cell({ column, row }: { column: ReportColumn; row: ReportRow }) {
  const value = row[column.key];
  if (value === null || value === "") return null;
  if (column.kind === "date") return formatDate(String(value));
  if (column.kind === "money") {
    const amount = Number(value);
    // Transaction amounts are signed: blue in, orange out
    const tone = column.key === "amount" && row.type ? (amount < 0 ? "text-cost" : "text-income") : "";
    return <span className={tone}>{formatBRL(amount)}</span>;
  }
  if (column.key === "type") {
    return (
      <Eyebrow as="span" tone={value === "Saída" ? "orange" : "blue"}>
        {value}
      </Eyebrow>
    );
  }
  if (column.key === "status") {
    const tone = value === "Atrasada" ? "text-cost" : value === "Em aberto" ? "text-pending" : "";
    return <span className={tone}>{value}</span>;
  }
  return String(value);
}
