"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ENTRY_TYPES,
  INSTALLMENT_STATUSES,
  PERIODS,
  REPORTS,
  STOCK_STATES,
} from "@/lib/reports/definitions";
import {
  defaultFilters,
  periodRange,
  serializeReportFilters,
  type ReportFilters,
} from "@/lib/reports/filters";
import { formatDate } from "@/lib/format";
import {
  cardClass,
  checkboxClass,
  chipClass,
  hintClass,
  inputClass,
  labelClass,
  linkClass,
  primaryButtonClass,
} from "@/components/styles";
import { Eyebrow } from "@/components/eyebrow";
import { TemplateSave, type OpenTemplate } from "./template-save";

type Option = { id: number; name: string };

export type FilterPanelOptions = {
  categories: Option[];
  kids: Option[];
  items: Option[];
  users: Option[];
};

const segmentClass =
  "h-9 cursor-pointer text-sm transition-colors not-last:border-r not-last:border-line hover:bg-canvas aria-pressed:bg-ink aria-pressed:text-canvas";

const SEARCH_DELAY_MS = 350;

// The filter panel next to the preview. Every change rewrites the URL, which
// re-renders the preview on the server; the preview dims while that happens.
export function ReportWorkspace({
  filters,
  options,
  template,
  today,
  children,
}: {
  filters: ReportFilters;
  options: FilterPanelOptions;
  // Its id stays in the URL so the page can tell the template was changed
  template: OpenTemplate | null;
  today: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const query = serializeReportFilters(filters);

  function apply(change: Partial<ReportFilters>) {
    const next = serializeReportFilters({ ...filters, ...change });
    const templateParam = template ? `&template=${template.id}` : "";
    startTransition(() => router.replace(`/reports?${next}${templateParam}`, { scroll: false }));
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <FilterPanel
        filters={filters}
        options={options}
        today={today}
        query={query}
        template={template}
        apply={apply}
      />
      <div
        aria-busy={pending}
        className={`flex min-w-0 flex-col gap-5 transition-opacity ${pending ? "opacity-50" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  options,
  today,
  query,
  template,
  apply,
}: {
  filters: ReportFilters;
  options: FilterPanelOptions;
  today: string;
  query: string;
  template: OpenTemplate | null;
  apply: (change: Partial<ReportFilters>) => void;
}) {
  const report = REPORTS[filters.type];
  const uses = (key: (typeof report.filters)[number]) => report.filters.includes(key);
  const group = report.groups.find((option) => option.key === filters.groupBy);
  const [copied, setCopied] = useState(false);

  function toggle<T>(list: T[], value: T) {
    return list.includes(value) ? list.filter((other) => other !== value) : [...list, value];
  }

  return (
    // While sticky, the filters scroll inside the panel so the actions at its
    // bottom stay in view. Below xl the header has two rows, so it is taller.
    <aside
      className={`flex flex-col lg:sticky lg:top-32 lg:max-h-[calc(100dvh-9.5rem)] xl:top-24 xl:max-h-[calc(100dvh-7.5rem)] ${cardClass}`}
    >
      <div className="flex min-h-0 flex-col lg:overflow-y-auto">
        <section className="flex flex-col gap-5 border-b border-line-soft p-5">
          <div className="flex items-baseline justify-between">
            <Eyebrow as="h2">Filtros</Eyebrow>
            <button
              type="button"
              onClick={() => apply({ ...defaultFilters(filters.type), groupBy: filters.groupBy })}
              className={`${linkClass} text-sm`}
            >
              Limpar filtros
            </button>
          </div>

          {uses("period") && (
            <fieldset className="flex flex-col gap-2">
              <legend className={`${labelClass} mb-2`}>{report.periodLabel}</legend>
              <div className="flex flex-wrap gap-1.5">
                {PERIODS.map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    aria-pressed={filters.period === period.value}
                    onClick={() => apply({ period: period.value })}
                    className={chipClass}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              {filters.period === "custom" ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className={hintClass}>De</span>
                    <input
                      type="date"
                      value={filters.from ?? ""}
                      onChange={(event) => apply({ from: event.target.value || null })}
                      className={`${inputClass} min-w-0`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={hintClass}>Até</span>
                    <input
                      type="date"
                      value={filters.to ?? ""}
                      onChange={(event) => apply({ to: event.target.value || null })}
                      className={`${inputClass} min-w-0`}
                    />
                  </label>
                </div>
              ) : (
                <p className={`${hintClass} tabular-nums`}>{periodHint(filters, today)}</p>
              )}
            </fieldset>
          )}

          {uses("entryType") && (
            <Segmented
              legend="Tipo"
              options={ENTRY_TYPES}
              value={filters.entryType}
              onChange={(entryType) => apply({ entryType })}
            />
          )}

          {uses("categories") && (
            <fieldset className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <legend className={labelClass}>Categorias</legend>
                {filters.categoryIds.length > 0 ? (
                  <button type="button" onClick={() => apply({ categoryIds: [] })} className={`${linkClass} text-[13px]`}>
                    Todas
                  </button>
                ) : (
                  <span className={hintClass}>Todas</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {options.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={filters.categoryIds.includes(category.id)}
                    onClick={() => apply({ categoryIds: toggle(filters.categoryIds, category.id) })}
                    className={chipClass}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {uses("statuses") && (
            <fieldset className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <legend className={labelClass}>Situação</legend>
                {filters.statuses.length === 0 && <span className={hintClass}>Todas</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {INSTALLMENT_STATUSES.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    aria-pressed={filters.statuses.includes(status.value)}
                    onClick={() => apply({ statuses: toggle(filters.statuses, status.value) })}
                    className={chipClass}
                  >
                    {status.filterLabel}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {uses("stockState") && (
            <Segmented
              legend="Situação"
              options={STOCK_STATES}
              value={filters.stockState}
              onChange={(stockState) => apply({ stockState })}
            />
          )}

          {uses("kid") && (
            <OptionSelect
              id="report-kid"
              label="Bandeirante"
              allLabel="Todos os bandeirantes"
              options={options.kids}
              value={filters.kidId}
              onChange={(kidId) => apply({ kidId })}
            />
          )}
          {uses("item") && (
            <OptionSelect
              id="report-item"
              label="Item"
              allLabel="Todos os itens"
              options={options.items}
              value={filters.itemId}
              onChange={(itemId) => apply({ itemId })}
            />
          )}
          {uses("createdBy") && (
            <OptionSelect
              id="report-user"
              label="Registrado por"
              allLabel="Qualquer pessoa"
              options={options.users}
              value={filters.createdById}
              onChange={(createdById) => apply({ createdById })}
            />
          )}
          {uses("search") && (
            <SearchInput value={filters.search} onChange={(search) => apply({ search })} />
          )}
        </section>

        <section className="flex flex-col gap-4 p-5">
          <Eyebrow as="h2" tone="ink">
            Organizar planilha
          </Eyebrow>
          {report.groups.length > 1 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="report-group" className={labelClass}>
                Agrupar por
              </label>
              <select
                id="report-group"
                value={filters.groupBy}
                onChange={(event) => apply({ groupBy: event.target.value })}
                className={inputClass}
              >
                {report.groups.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <details className="group">
            <summary className={`${labelClass} cursor-pointer py-1 select-none`}>
              Colunas ({report.columns.length - filters.hiddenColumns.length} de {report.columns.length})
            </summary>
            <div className="mt-2 flex flex-col">
              {report.columns.map((column) => {
                const visible = !filters.hiddenColumns.includes(column.key);
                const lastVisible = visible && filters.hiddenColumns.length === report.columns.length - 1;
                return (
                  <label key={column.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[15px]">
                    <input
                      type="checkbox"
                      checked={visible}
                      // The spreadsheet needs at least one column
                      disabled={lastVisible}
                      onChange={() => apply({ hiddenColumns: toggle(filters.hiddenColumns, column.key) })}
                      className={checkboxClass}
                    />
                    {column.label}
                  </label>
                );
              })}
            </div>
          </details>
          <label className="flex cursor-pointer items-start gap-2.5 text-[15px] leading-snug">
            <input
              type="checkbox"
              checked={filters.summarySheet}
              onChange={(event) => apply({ summarySheet: event.target.checked })}
              className={`${checkboxClass} mt-0.5 shrink-0`}
            />
            Incluir aba &quot;Resumo&quot; com totais e filtros usados
          </label>
          {group && group.key !== "none" && (
            <label className="flex cursor-pointer items-start gap-2.5 text-[15px] leading-snug">
              <input
                type="checkbox"
                checked={filters.sheetPerGroup}
                onChange={(event) => apply({ sheetPerGroup: event.target.checked })}
                className={`${checkboxClass} mt-0.5 shrink-0`}
              />
              Uma aba para cada {group.label.toLowerCase()}
            </label>
          )}
        </section>
      </div>

      <section className="flex shrink-0 flex-col gap-3 border-t border-line p-5">
        <a href={`/reports/export?${query}`} download className={`${primaryButtonClass} h-12 gap-2 text-base`}>
          <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v8m0 0 3-3m-3 3L5 7M2.5 11v2.5h11V11" />
          </svg>
          Baixar Excel
        </a>
        <TemplateSave key={`${template?.id}-${query}`} template={template} query={query} />
        <button
          type="button"
          title="Quem abrir o link vê este mesmo relatório"
          onClick={async () => {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
          className={`${linkClass} self-center text-sm`}
        >
          {copied ? "Link copiado" : "Copiar link deste relatório"}
        </button>
      </section>
    </aside>
  );
}

function periodHint(filters: ReportFilters, today: string) {
  if (filters.period === "all") return "Desde o primeiro registro";
  const { from, to } = periodRange(filters, today);
  return `${formatDate(from!)} a ${formatDate(to!)}`;
}

function Segmented<Value extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${labelClass} mb-2`}>{legend}</legend>
      <div
        className="grid overflow-hidden rounded-[4px] border border-line"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={segmentClass}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function OptionSelect({
  id,
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  options: Option[];
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        className={inputClass}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// Applies the search after a pause in typing instead of on every key
function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [sent, setSent] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  // Follows changes made elsewhere, like removing the search from the active
  // filters, but not the echo of what was typed, which may be behind the input
  if (value !== previousValue) {
    setPreviousValue(value);
    if (value !== sent) setText(value);
  }

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === value) return;
    const timer = setTimeout(() => {
      setSent(trimmed);
      latest.current(trimmed);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, value]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="report-search" className={labelClass}>
        Buscar
      </label>
      <input
        id="report-search"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Nome, nota, fornecedor..."
        className={inputClass}
      />
    </div>
  );
}
