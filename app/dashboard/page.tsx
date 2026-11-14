import { requireSession } from "@/lib/dal";
import { getIncomeByCategory, getTotals } from "@/lib/entries";
import { getReceivables } from "@/lib/sales";
import { ensureContributions, getContributionsByAgeGroup } from "@/lib/contributions";
import { AGE_GROUP_LABELS } from "@/lib/age-groups";
import { parseDashboardPeriod } from "@/lib/dashboard-period";
import { toSearchParams } from "@/lib/reports/filters";
import { formatBRL, todayISO } from "@/lib/format";
import { EmptyState, Page, Section } from "@/components/page";
import { Eyebrow } from "@/components/eyebrow";
import {
  cardClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { PeriodFilter } from "./period-filter";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  await requireSession();
  const today = todayISO();
  const { period, range } = parseDashboardPeriod(
    toSearchParams(await searchParams),
    today
  );
  await ensureContributions(today);
  const [totals, incomeByCategory, receivables, contributionsByAgeGroup] =
    await Promise.all([
      getTotals(range),
      getIncomeByCategory(range),
      getReceivables(today, range),
      getContributionsByAgeGroup(today, range),
    ]);
  const openContributions = contributionsByAgeGroup.reduce(
    (sum, row) => sum + row.pending,
    0
  );

  return (
    <Page title="Painel">
      <div className="flex flex-col gap-4">
        <PeriodFilter period={period} range={range} />
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${cardClass}`}>
          <StatCard label="Entrou" value={totals.income} tone="positive" />
          <StatCard label="Saiu" value={totals.cost} tone="negative" />
          <StatCard
            label="Saldo"
            value={totals.balance}
            tone={totals.balance >= 0 ? "neutral" : "negative"}
          />
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${cardClass}`}>
          <StatCard
            label="A receber em parcelas"
            value={receivables.pending}
            tone="pending"
          />
          <StatCard
            label="Parcelas atrasadas"
            value={receivables.overdue}
            tone={receivables.overdue > 0 ? "negative" : "neutral"}
          />
        </div>
      </div>

      <Section title="Por origem">
        {incomeByCategory.length === 0 ? (
          <EmptyState>Nenhuma entrada no período.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Categoria</th>
                  <th className={`${tableHeadCell} text-right`}>
                    Entrou
                    <span className="ml-2 text-income">
                      {formatBRL(totals.income)}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {incomeByCategory.map((row) => (
                  <tr key={row.category} className={tableRow}>
                    <td className={tableCell}>{row.category}</td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap text-income`}
                    >
                      {formatBRL(row.income)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Contribuições em aberto por ramo">
        {contributionsByAgeGroup.length === 0 ? (
          <EmptyState>Nenhuma contribuição em aberto no período.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Ramo</th>
                  <th className={`${tableHeadCell} text-right max-sm:hidden`}>
                    Meses
                  </th>
                  <th className={`${tableHeadCell} text-right`}>
                    Em aberto
                    <span className="ml-2 text-pending">
                      {formatBRL(openContributions)}
                    </span>
                  </th>
                  <th className={`${tableHeadCell} text-right`}>Atrasado</th>
                </tr>
              </thead>
              <tbody>
                {contributionsByAgeGroup.map((row) => (
                  <tr key={row.ageGroup ?? "none"} className={tableRow}>
                    <td className={`${tableCell} whitespace-nowrap`}>
                      {row.ageGroup ? (
                        AGE_GROUP_LABELS[row.ageGroup]
                      ) : (
                        <span className="text-muted">Sem ramo</span>
                      )}
                    </td>
                    <td className={`${tableCell} text-right max-sm:hidden`}>
                      {row.count}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap text-pending`}
                    >
                      {formatBRL(row.pending)}
                    </td>
                    <td
                      className={`${tableCell} text-right whitespace-nowrap ${row.overdue > 0 ? "text-cost" : "text-muted/60"}`}
                    >
                      {formatBRL(row.overdue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </Page>
  );
}

const TONES = {
  positive: { value: "text-income", square: "blue" },
  negative: { value: "text-cost", square: "orange" },
  pending: { value: "text-pending", square: "ink" },
  neutral: { value: "text-ink", square: "ink" },
} as const;

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="flex flex-col gap-8 border-line p-6 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
      <Eyebrow tone={TONES[tone].square}>{label}</Eyebrow>
      <p
        className={`text-4xl leading-none tracking-[-0.03em] tabular-nums ${TONES[tone].value}`}
      >
        {formatBRL(value)}
      </p>
    </div>
  );
}
