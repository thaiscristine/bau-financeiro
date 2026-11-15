import Link from "next/link";
import { requireSession } from "@/lib/dal";
import {
  currentMonth,
  ensureFixedCostMonths,
  listEndedFixedCosts,
  listFixedCostHistory,
  listMonthFixedCosts,
} from "@/lib/fixed-costs";
import { fixedCostDueDate, isFixedCostLate, recentMonths } from "@/lib/fixed-cost-months";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { EmptyState, Page, Section } from "@/components/page";
import { FormDialog } from "@/components/form-dialog";
import { Stat, statGridClass } from "@/components/stat";
import {
  linkClass,
  tableCell,
  tableClass,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { UndoPaymentButton } from "@/app/(app)/sales/undo-payment-button";
import { FixedCostForm } from "./fixed-cost-form";
import { PayDialog } from "./pay-dialog";
import { createFixedCost, payFixedCostMonth, undoFixedCostMonth } from "./actions";

type MonthRow = Awaited<ReturnType<typeof listMonthFixedCosts>>[number];

const HISTORY_MONTHS = 6;

function shortMonth(month: string) {
  return formatMonth(month.slice(0, 7)).slice(0, 3);
}

function dayMonth(date: string) {
  return formatDate(date).slice(0, 5);
}

// ?month=YYYY-MM picks a month up to the current one; anything else shows the current
function shownMonth(value: string | string[] | undefined, today: string) {
  const month = typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
  return month && month <= currentMonth(today) ? month : currentMonth(today);
}

// The organization's monthly bills: one month's, with what is still to pay,
// and the last six months side by side to spot one that was missed
export default async function FixedCostsPage({ searchParams }: PageProps<"/fixed-costs">) {
  await requireSession();
  const today = todayISO();
  const month = shownMonth((await searchParams).month, today);
  await ensureFixedCostMonths(today);

  const months = recentMonths(today, HISTORY_MONTHS);
  const [rows, history, ended] = await Promise.all([
    listMonthFixedCosts(month),
    listFixedCostHistory(months),
    listEndedFixedCosts(),
  ]);

  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const paid = rows
    .filter((row) => row.entryId !== null)
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const late = rows
    .filter((row) => row.entryId === null && isFixedCostLate(row.month, row.dueDay, today))
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const monthLabel = formatMonth(month.slice(0, 7));
  const isCurrent = month === currentMonth(today);

  return (
    <Page
      title="Custos fixos"
      aside={
        <FormDialog label="Novo custo fixo">
          <FixedCostForm action={createFixedCost} />
        </FormDialog>
      }
    >
      {history.length === 0 && rows.length === 0 ? (
        <EmptyState>
          Nenhum custo fixo ainda. Cadastre as contas de todo mês, como aluguel, internet e energia.
        </EmptyState>
      ) : (
        <>
          <div className={`${statGridClass} grid-cols-1 sm:grid-cols-3`}>
            <Stat
              label={`Total de ${monthLabel.split(" ")[0].toLowerCase()}`}
              value={formatBRL(total)}
              square="ink"
            />
            <Stat
              label="Pago"
              value={formatBRL(paid)}
              tone={paid > 0 ? "text-cost" : ""}
              square="orange"
            />
            <Stat
              label="A pagar"
              value={formatBRL(total - paid)}
              tone={total - paid > 0 ? "text-pending" : ""}
              square="ink"
              hint={late > 0 ? `${formatBRL(late)} atrasado` : undefined}
            />
          </div>

          <Section
            title={monthLabel}
            aside={
              !isCurrent && (
                <Link href="/fixed-costs" className={`${linkClass} text-[14px]`}>
                  Voltar para o mês atual
                </Link>
              )
            }
          >
            {rows.length === 0 ? (
              <EmptyState>Nenhum custo fixo neste mês.</EmptyState>
            ) : (
              <MonthTable rows={rows} today={today} />
            )}
          </Section>

          {history.length > 0 && <HistoryTable months={months} history={history} today={today} shown={month} />}
        </>
      )}

      {ended.length > 0 && (
        <Section title="Encerrados" tone="ink">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            {ended.map((cost) => (
              <li key={cost.id}>
                <Link href={`/fixed-costs/${cost.id}`} className={linkClass}>
                  {cost.name}
                </Link>
                <span className="text-muted">
                  {" "}
                  · até {formatMonth(cost.endMonth!.slice(0, 7)).toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </Page>
  );
}

function MonthStatus({ row, today }: { row: MonthRow; today: string }) {
  const due = dayMonth(fixedCostDueDate(row.month, row.dueDay));
  if (row.paidDate) {
    return (
      <span className="text-muted">
        Pago em {dayMonth(row.paidDate)} · {paymentMethodLabel(row.paymentMethod)}
      </span>
    );
  }
  return isFixedCostLate(row.month, row.dueDay, today) ? (
    <span className="text-cost">Atrasado, venceu em {due}</span>
  ) : (
    <span className="text-pending">Vence em {due}</span>
  );
}

function MonthAction({ row }: { row: MonthRow }) {
  return row.entryId ? (
    <UndoPaymentButton
      action={undoFixedCostMonth.bind(null, row.monthId)}
      confirmMessage="Desfazer este pagamento? A transação de saída correspondente será excluída."
    />
  ) : (
    <PayDialog
      title={`Pagar ${row.name}`}
      description={`${formatMonth(row.month.slice(0, 7))} · vence em ${formatDate(fixedCostDueDate(row.month, row.dueDay))}`}
      amount={row.amount}
      action={payFixedCostMonth.bind(null, row.monthId)}
    />
  );
}

function MonthTable({ rows, today }: { rows: MonthRow[]; today: string }) {
  return (
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
          {rows.map((row) => (
            <tr key={row.monthId} className={tableRow}>
              <td className={tableCell}>
                <Link href={`/fixed-costs/${row.costId}`} className="underline-offset-4 hover:underline">
                  {row.name}
                </Link>
                <span className="block text-[13px] text-muted">
                  {row.supplier ? `${row.supplier} · ` : ""}todo dia {row.dueDay}
                </span>
                <span className="block text-[13px] sm:hidden">
                  <MonthStatus row={row} today={today} />
                </span>
              </td>
              <td className={`${tableCell} text-[14px] max-sm:hidden`}>
                <MonthStatus row={row} today={today} />
              </td>
              <td className={`${tableCell} text-right whitespace-nowrap`}>
                <span className={row.entryId ? "text-cost" : ""}>{formatBRL(Number(row.amount))}</span>
                {row.variable && !row.entryId && (
                  <span className="block text-[13px] text-muted">varia todo mês</span>
                )}
                {/* On phones the action sits under the amount, leaving room for the name */}
                <span className="mt-2 block sm:hidden">
                  <MonthAction row={row} />
                </span>
              </td>
              <td className={`${tableCell} text-right max-sm:hidden`}>
                <MonthAction row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({
  months,
  history,
  today,
  shown,
}: {
  months: string[];
  history: Awaited<ReturnType<typeof listFixedCostHistory>>;
  today: string;
  shown: string;
}) {
  return (
    <Section title={`Últimos ${months.length} meses`} tone="ink">
      <div className={tableWrapClass}>
        <table className={tableClass}>
          <thead>
            <tr className={tableHeadRow}>
              <th className={tableHeadCell}>Custo</th>
              {months.map((month) => (
                <th key={month} className={`${tableHeadCell} text-right`}>
                  <Link
                    href={`/fixed-costs?month=${month.slice(0, 7)}`}
                    aria-current={month === shown ? "page" : undefined}
                    aria-label={formatMonth(month.slice(0, 7))}
                    className="underline-offset-4 hover:text-ink hover:underline aria-[current=page]:text-ink aria-[current=page]:underline"
                  >
                    {shortMonth(month)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((cost) => (
              <tr key={cost.id} className={tableRow}>
                <td className={`${tableCell} whitespace-nowrap`}>{cost.name}</td>
                {months.map((month) => {
                  const row = cost.months.get(month);
                  if (!row) {
                    return (
                      <td key={month} className={`${tableCell} text-right text-muted/60`}>
                        -
                      </td>
                    );
                  }
                  const missed = !row.paid && isFixedCostLate(month, cost.dueDay, today);
                  return (
                    <td
                      key={month}
                      className={`${tableCell} text-right whitespace-nowrap ${
                        row.paid ? "" : missed ? "text-cost" : "text-muted/60"
                      }`}
                      title={row.paid ? "Pago" : missed ? "Não pago" : "Ainda não venceu"}
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
                    history.reduce((sum, cost) => sum + (cost.months.get(month)?.amount ?? 0), 0)
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted">
        <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-cost align-middle" />
        Venceu e não foi pago. Clique no mês para pagar.
      </p>
    </Section>
  );
}
