import Link from "next/link";
import { requireSession } from "@/lib/dal";
import { getIncomeByCategory, getTotals, getTotalsByPaymentMethod } from "@/lib/entries";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { getReceivables } from "@/lib/sales";
import { getEventReceivables } from "@/lib/events";
import { ensureContributions, getContributionsByAgeGroup } from "@/lib/contributions";
import { parseDashboardPeriod } from "@/lib/dashboard-period";
import { toSearchParams } from "@/lib/reports/filters";
import { formatBRL, todayISO } from "@/lib/format";
import { ensureFixedCostMonths, getFixedCostsDue } from "@/lib/fixed-costs";
import { EmptyState, Page, Section } from "@/components/page";
import { Eyebrow } from "@/components/eyebrow";
import {
  cardClass,
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { OpenContributions } from "./open-contributions";
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
  await Promise.all([ensureContributions(today), ensureFixedCostMonths(today)]);
  const [
    totals,
    incomeByCategory,
    byPaymentMethod,
    saleReceivables,
    eventReceivables,
    contributionsByAgeGroup,
    fixedCostsDue,
  ] = await Promise.all([
    getTotals(range),
    getIncomeByCategory(range),
    getTotalsByPaymentMethod(range),
    getReceivables(today, range),
    getEventReceivables(today, range),
    getContributionsByAgeGroup(today, range),
    getFixedCostsDue(today, range),
  ]);
  // Installments of Lojinha sales and of events alike
  const receivables = {
    pending: saleReceivables.pending + eventReceivables.pending,
    overdue: saleReceivables.overdue + eventReceivables.overdue,
  };

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
        <div className={`grid grid-cols-1 sm:grid-cols-3 ${cardClass}`}>
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
          <StatCard
            label="Custos fixos a pagar"
            value={fixedCostsDue.pending}
            tone={fixedCostsDue.overdue > 0 ? "negative" : "pending"}
            href="/fixed-costs"
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

      <Section title="Por forma de pagamento">
        {byPaymentMethod.length === 0 ? (
          <EmptyState>Nenhuma transação no período.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Forma</th>
                  <th className={`${tableHeadCell} text-right`}>Entrou</th>
                  <th className={`${tableHeadCell} text-right`}>Saiu</th>
                  <th className={`${tableHeadCell} text-right`}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {byPaymentMethod.map((row) => {
                  const balance = row.income - row.cost;
                  return (
                    <tr key={row.paymentMethod ?? "none"} className={tableRow}>
                      <td className={`${tableCell} ${row.paymentMethod ? "" : "text-muted"}`}>
                        {paymentMethodLabel(row.paymentMethod)}
                      </td>
                      <td
                        className={`${tableCell} text-right whitespace-nowrap ${row.income > 0 ? "text-income" : "text-muted/60"}`}
                      >
                        {formatBRL(row.income)}
                      </td>
                      <td
                        className={`${tableCell} text-right whitespace-nowrap ${row.cost > 0 ? "text-cost" : "text-muted/60"}`}
                      >
                        {formatBRL(row.cost)}
                      </td>
                      <td
                        className={`${tableCell} text-right whitespace-nowrap ${balance < 0 ? "text-cost" : ""}`}
                      >
                        {formatBRL(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Contribuições em aberto por ramo">
        {contributionsByAgeGroup.length === 0 ? (
          <EmptyState>Nenhuma contribuição em aberto no período.</EmptyState>
        ) : (
          <OpenContributions groups={contributionsByAgeGroup} />
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
  href,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONES;
  // The page with the details behind the figure
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-8 border-line p-6 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
      {href ? (
        <div className="flex items-center justify-between gap-3">
          <Eyebrow tone={TONES[tone].square}>{label}</Eyebrow>
          <Link href={href} className={`${linkClass} text-[13px] leading-4`}>
            Ver
          </Link>
        </div>
      ) : (
        <Eyebrow tone={TONES[tone].square}>{label}</Eyebrow>
      )}
      <p
        className={`text-4xl leading-none tracking-[-0.03em] tabular-nums ${TONES[tone].value}`}
      >
        {formatBRL(value)}
      </p>
    </div>
  );
}
