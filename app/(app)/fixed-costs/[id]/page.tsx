import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import {
  currentMonth,
  ensureFixedCostMonths,
  getFixedCost,
  listFixedCostMonths,
} from "@/lib/fixed-costs";
import { fixedCostDueDate, isFixedCostLate } from "@/lib/fixed-cost-months";
import { formatBRL, formatDate, formatMonth, todayISO } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { EmptyState, Page, Section } from "@/components/page";
import { DeleteButton } from "@/components/delete-button";
import { SubmitButton } from "@/components/form";
import { cardClass, secondaryButtonClass } from "@/components/styles";
import { UndoPaymentButton } from "@/app/(app)/sales/undo-payment-button";
import { FixedCostForm } from "../fixed-cost-form";
import { PayDialog } from "../pay-dialog";
import {
  deleteFixedCost,
  payFixedCostMonth,
  setFixedCostEnded,
  undoFixedCostMonth,
  updateFixedCost,
} from "../actions";

export default async function FixedCostPage({ params }: PageProps<"/fixed-costs/[id]">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const today = todayISO();
  await ensureFixedCostMonths(today);
  const [cost, months] = await Promise.all([getFixedCost(id), listFixedCostMonths(id)]);
  if (!cost) notFound();

  const thisMonth = currentMonth(today);
  const hasPayments = months.some((month) => month.entryId !== null);
  const paidTotal = months
    .filter((month) => month.entryId !== null)
    .reduce((sum, month) => sum + Number(month.amount), 0);

  return (
    <Page title={cost.name}>
      <p className="-mt-6 text-[15px] text-muted tabular-nums">
        {cost.supplier ? `${cost.supplier} · ` : ""}
        {formatBRL(Number(cost.amount))}
        {cost.variable ? ", varia todo mês" : ""} · todo dia {cost.dueDay}
        <span className="block">
          Desde {formatMonth(cost.startMonth.slice(0, 7)).toLowerCase()}
          {cost.endMonth
            ? `, encerrado em ${formatMonth(cost.endMonth.slice(0, 7)).toLowerCase()}`
            : ""}
          {paidTotal > 0 && ` · ${formatBRL(paidTotal)} pagos ao todo`}
        </span>
      </p>

      <Section title="Meses">
        {months.length === 0 ? (
          <EmptyState>Nenhum mês cobrado ainda.</EmptyState>
        ) : (
          <ul className={`divide-y divide-line-soft ${cardClass}`}>
            {months.map((month) => {
              const late = !month.entryId && isFixedCostLate(month.month, cost.dueDay, today);
              return (
                <li key={month.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4">
                  <div className="flex flex-1 flex-col gap-1 tabular-nums">
                    <p>
                      {formatMonth(month.month.slice(0, 7))}
                      <span className="text-muted"> · {formatBRL(Number(month.amount))}</span>
                    </p>
                    <p className="text-sm text-muted">
                      {month.paidDate ? (
                        <>
                          Pago em {formatDate(month.paidDate)} · {paymentMethodLabel(month.paymentMethod)}
                        </>
                      ) : late ? (
                        <span className="text-cost">
                          Atrasado, venceu em {formatDate(fixedCostDueDate(month.month, cost.dueDay))}
                        </span>
                      ) : (
                        <span className="text-pending">
                          Vence em {formatDate(fixedCostDueDate(month.month, cost.dueDay))}
                        </span>
                      )}
                    </p>
                  </div>
                  {month.entryId ? (
                    <UndoPaymentButton
                      action={undoFixedCostMonth.bind(null, month.id)}
                      confirmMessage="Desfazer este pagamento? A transação de saída correspondente será excluída."
                    />
                  ) : (
                    <PayDialog
                      title={`Pagar ${cost.name}`}
                      description={`${formatMonth(month.month.slice(0, 7))} · vence em ${formatDate(fixedCostDueDate(month.month, cost.dueDay))}`}
                      amount={month.amount}
                      action={payFixedCostMonth.bind(null, month.id)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Dados do custo fixo">
        <FixedCostForm action={updateFixedCost.bind(null, id)} cost={cost} />
      </Section>

      <div className="flex max-w-xl flex-col gap-3">
        {cost.endMonth === null ? (
          <form action={setFixedCostEnded.bind(null, id, true)}>
            <SubmitButton
              label="Encerrar custo fixo"
              pendingLabel="Encerrando..."
              className={`${secondaryButtonClass} h-11 w-full`}
            />
          </form>
        ) : (
          cost.endMonth === thisMonth && (
            <form action={setFixedCostEnded.bind(null, id, false)}>
              <SubmitButton
                label="Reabrir custo fixo"
                pendingLabel="Reabrindo..."
                className={`${secondaryButtonClass} h-11 w-full`}
              />
            </form>
          )
        )}
        <p className="text-[13px] text-muted">
          {cost.endMonth === null
            ? `Encerrar para de cobrar a partir do mês que vem; ${formatMonth(thisMonth.slice(0, 7)).toLowerCase()} continua cobrado.`
            : cost.endMonth === thisMonth
              ? "Encerrado neste mês. Reabra se foi engano."
              : "Para voltar a pagar, cadastre um novo custo fixo."}
        </p>
        {!hasPayments && (
          <DeleteButton
            action={deleteFixedCost.bind(null, id)}
            label="Excluir custo fixo"
            confirmMessage={`Excluir ${cost.name}? Não dá para desfazer.`}
          />
        )}
      </div>
    </Page>
  );
}
