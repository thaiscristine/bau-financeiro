import { requireSession } from "@/lib/dal";
import Link from "next/link";
import {
  getTotals,
  getMonthlyBreakdown,
  getTotalsByCategory,
} from "@/lib/entries";
import { getReceivables, listOverdueInstallments } from "@/lib/sales";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { EmptyState, Eyebrow, Page, Section } from "@/components/page";
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

export default async function DashboardPage() {
  await requireSession();
  const today = todayISO();
  const [totals, monthly, byCategory, receivables, overdue] = await Promise.all([
    getTotals(),
    getMonthlyBreakdown(),
    getTotalsByCategory(),
    getReceivables(today),
    listOverdueInstallments(today),
  ]);

  return (
    <Page title="Painel">
      <div className="flex flex-col gap-4">
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

      {overdue.length > 0 && (
        <Section title="Parcelas atrasadas">
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Vencimento</th>
                  <th className={tableHeadCell}>Bandeirante</th>
                  <th className={tableHeadCell}>Item</th>
                  <th className={`${tableHeadCell} text-right`}>Valor</th>
                  <th className={tableHeadCell}>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((installment) => (
                  <tr key={installment.id} className={tableRow}>
                    <td className={`${tableCell} whitespace-nowrap text-cost`}>
                      {formatDate(installment.dueDate)}
                    </td>
                    <td className={tableCell}>{installment.kidName}</td>
                    <td className={tableCell}>
                      {installment.itemName}
                      <span className="text-muted">
                        {" "}
                        (parcela {installment.number})
                      </span>
                    </td>
                    <td className={`${tableCell} text-right whitespace-nowrap`}>
                      {formatBRL(Number(installment.amount))}
                    </td>
                    <td className={`${tableCell} text-right`}>
                      <Link
                        href={`/sales/${installment.saleId}`}
                        className={linkClass}
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Por origem">
        {byCategory.length === 0 ? (
          <EmptyState>Nenhuma transação ainda.</EmptyState>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr className={tableHeadRow}>
                  <th className={tableHeadCell}>Categoria</th>
                  <th className={`${tableHeadCell} text-right`}>Entrou</th>
                  <th className={`${tableHeadCell} text-right`}>Saiu</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((row) => (
                  <tr key={row.category} className={tableRow}>
                    <td className={tableCell}>{row.category}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Por mês">
        {monthly.length === 0 ? (
          <EmptyState>Nenhuma transação ainda.</EmptyState>
        ) : (
          <>
            <ul className={`divide-y divide-line-soft sm:hidden ${cardClass}`}>
              {monthly.map((row) => (
                <li key={row.month} className="flex flex-col gap-3 p-4">
                  <p className="text-[15px]">{formatMonth(row.month)}</p>
                  <dl className="grid grid-cols-3 gap-2 tabular-nums">
                    <MonthValue label="Entrou" value={row.income} tone="text-income" />
                    <MonthValue label="Saiu" value={row.cost} tone="text-cost" />
                    <MonthValue
                      label="Saldo"
                      value={row.balance}
                      tone={row.balance < 0 ? "text-cost" : ""}
                    />
                  </dl>
                </li>
              ))}
            </ul>
            <div className={`hidden sm:block ${tableWrapClass}`}>
              <table className={tableClass}>
                <thead>
                  <tr className={tableHeadRow}>
                    <th className={tableHeadCell}>Mês</th>
                    <th className={`${tableHeadCell} text-right`}>Entrou</th>
                    <th className={`${tableHeadCell} text-right`}>Saiu</th>
                    <th className={`${tableHeadCell} text-right`}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr key={row.month} className={tableRow}>
                      <td className={`${tableCell} whitespace-nowrap`}>
                        {formatMonth(row.month)}
                      </td>
                      <td className={`${tableCell} text-right text-income`}>
                        {formatBRL(row.income)}
                      </td>
                      <td className={`${tableCell} text-right text-cost`}>
                        {formatBRL(row.cost)}
                      </td>
                      <td
                        className={`${tableCell} text-right ${
                          row.balance < 0 ? "text-cost" : ""
                        }`}
                      >
                        {formatBRL(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
    </Page>
  );
}

function MonthValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[11px] tracking-[0.05em] text-muted uppercase">
        {label}
      </dt>
      <dd className={`text-sm ${tone}`}>{formatBRL(value)}</dd>
    </div>
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
