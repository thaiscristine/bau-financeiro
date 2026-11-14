import { requireSession } from "@/lib/dal";
import {
  SAMPLE_COSTS,
  fixedCostDueDate,
  isFixedCostLate,
  monthsUpTo,
  sampleMonths,
} from "@/lib/fixed-costs-preview";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { Page, Section } from "@/components/page";
import { Stat, statGridClass } from "@/components/stat";
import {
  primaryButtonClass,
  secondaryButtonClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";

function shortMonth(month: string) {
  return formatMonth(month.slice(0, 7)).slice(0, 3);
}

function dayMonth(date: string) {
  return formatDate(date).slice(0, 5);
}

// The organization's monthly bills: this month's, with what is still to pay,
// and the last six months side by side to spot one that was missed
export default async function FixedCostsPage() {
  await requireSession();
  const today = todayISO();
  const months = monthsUpTo(today, 6);
  const currentMonth = months.at(-1)!;
  const rows = sampleMonths(today);
  const thisMonth = SAMPLE_COSTS.map((cost) => ({
    cost,
    month: rows.find((row) => row.costId === cost.id && row.month === currentMonth)!,
  }));

  const total = thisMonth.reduce((sum, { month }) => sum + month.amount, 0);
  const paid = thisMonth
    .filter(({ month }) => month.paidDate)
    .reduce((sum, { month }) => sum + month.amount, 0);
  const late = thisMonth
    .filter(({ cost, month }) => !month.paidDate && isFixedCostLate(month.month, cost.dueDay, today))
    .reduce((sum, { month }) => sum + month.amount, 0);
  const monthLabel = formatMonth(currentMonth.slice(0, 7));

  return (
    <Page
      title="Custos fixos"
      aside={
        <button type="button" className={primaryButtonClass}>
          Novo custo fixo
        </button>
      }
    >
      <div className={`${statGridClass} grid-cols-1 sm:grid-cols-3`}>
        <Stat label={`Total de ${monthLabel.split(" ")[0].toLowerCase()}`} value={formatBRL(total)} square="ink" />
        <Stat label="Pago" value={formatBRL(paid)} tone="text-cost" square="orange" />
        <Stat
          label="A pagar"
          value={formatBRL(total - paid)}
          tone="text-pending"
          square="ink"
          hint={late > 0 ? `${formatBRL(late)} atrasado` : undefined}
        />
      </div>

      <Section title={monthLabel}>
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Custo</th>
                <th className={`${tableHeadCell} max-sm:hidden`}>Situação</th>
                <th className={`${tableHeadCell} text-right`}>Valor</th>
                <th className={`${tableHeadCell} max-sm:hidden`}>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {thisMonth.map(({ cost, month }) => {
                const isLate = !month.paidDate && isFixedCostLate(month.month, cost.dueDay, today);
                const status = month.paidDate ? (
                  <span className="text-muted">
                    Pago em {dayMonth(month.paidDate)} · {paymentMethodLabel(month.paymentMethod)}
                  </span>
                ) : isLate ? (
                  <span className="text-cost">
                    Atrasado, venceu em {dayMonth(fixedCostDueDate(month.month, cost.dueDay))}
                  </span>
                ) : (
                  <span className="text-pending">
                    Vence em {dayMonth(fixedCostDueDate(month.month, cost.dueDay))}
                  </span>
                );
                return (
                  <tr key={cost.id} className={tableRow}>
                    <td className={tableCell}>
                      {cost.name}
                      <span className="block text-[13px] text-muted">
                        {cost.supplier} · todo dia {cost.dueDay}
                      </span>
                      <span className="block text-[13px] sm:hidden">{status}</span>
                    </td>
                    <td className={`${tableCell} text-[14px] max-sm:hidden`}>{status}</td>
                    <td className={`${tableCell} text-right whitespace-nowrap`}>
                      <span className={month.paidDate ? "text-cost" : ""}>
                        {formatBRL(month.amount)}
                      </span>
                      {cost.variable && (
                        <span className="block text-[13px] text-muted">varia todo mês</span>
                      )}
                      {/* On phones the button sits under the amount, leaving room for the name */}
                      {!month.paidDate && (
                        <span className="mt-2 block sm:hidden">
                          <PayButton />
                        </span>
                      )}
                    </td>
                    <td className={`${tableCell} text-right max-sm:hidden`}>
                      {!month.paidDate && <PayButton />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Últimos 6 meses" tone="ink">
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRow}>
                <th className={tableHeadCell}>Custo</th>
                {months.map((month) => (
                  <th key={month} className={`${tableHeadCell} text-right`}>
                    {shortMonth(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_COSTS.map((cost) => (
                <tr key={cost.id} className={tableRow}>
                  <td className={`${tableCell} whitespace-nowrap`}>{cost.name}</td>
                  {months.map((month) => {
                    const row = rows.find((r) => r.costId === cost.id && r.month === month)!;
                    const missed = !row.paidDate && isFixedCostLate(month, cost.dueDay, today);
                    return (
                      <td
                        key={month}
                        className={`${tableCell} text-right whitespace-nowrap ${
                          row.paidDate ? "" : missed ? "text-cost" : "text-muted/60"
                        }`}
                        title={
                          row.paidDate
                            ? `Pago em ${formatDate(row.paidDate)}`
                            : missed
                              ? "Não pago"
                              : "Ainda não venceu"
                        }
                      >
                        {missed && (
                          <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-cost align-middle" />
                        )}
                        {formatBRL(row.amount)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-line bg-sunken/60">
                <td className={`${tableCell} font-mono text-xs tracking-[0.05em] text-muted uppercase`}>
                  Total
                </td>
                {months.map((month) => (
                  <td key={month} className={`${tableCell} text-right whitespace-nowrap`}>
                    {formatBRL(
                      rows.filter((r) => r.month === month).reduce((sum, r) => sum + r.amount, 0)
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-muted">
          <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-cost align-middle" />
          Venceu e não foi pago
        </p>
      </Section>
    </Page>
  );
}

function PayButton() {
  return (
    <button type="button" className={`${secondaryButtonClass} h-8 px-3 text-[14px]`}>
      Pagar
    </button>
  );
}
