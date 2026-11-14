import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import {
  getEvent,
  getEventSummary,
  listEventExpenses,
  listEventParticipants,
  listExpenseKinds,
  listKidsToSignUp,
} from "@/lib/events";
import type { AgeGroup } from "@/lib/age-groups";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { FUND_NAME } from "@/lib/fund";
import { EmptyState, Page, Section } from "@/components/page";
import { FormDialog } from "@/components/form-dialog";
import { DeleteButton } from "@/components/delete-button";
import { Stat, statGridClass } from "@/components/stat";
import { AgeGroupLabel } from "@/components/age-group";
import {
  cardClass,
  linkClass,
  tableCell,
  tableClass,
  tableGroupHeadCell,
  tableGroupHeadRow,
  tableHeadCell,
  tableHeadRow,
  tableRow,
  tableWrapClass,
} from "@/components/styles";
import { PaymentForm } from "@/app/(app)/sales/payment-form";
import { UndoPaymentButton } from "@/app/(app)/sales/undo-payment-button";
import { EventForm } from "../event-form";
import { EventDates } from "../event-dates";
import { ParticipantForm } from "./participant-form";
import { ExpenseForm } from "./expense-form";
import {
  createExpense,
  deleteEvent,
  deleteExpense,
  payExpense,
  signUpParticipant,
  undoExpensePayment,
  updateEvent,
} from "../actions";

type ParticipantRow = Awaited<ReturnType<typeof listEventParticipants>>[number];
type ExpenseRow = Awaited<ReturnType<typeof listEventExpenses>>[number];

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  await requireSession();

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const today = todayISO();
  const [event, summary, participants, expenses, kidsToSignUp, kinds] = await Promise.all([
    getEvent(id),
    getEventSummary(id, today),
    listEventParticipants(id, today),
    listEventExpenses(id),
    listKidsToSignUp(id),
    listExpenseKinds(),
  ]);
  if (!event) notFound();

  const expected = summary.received + summary.pending;
  const expensesTotal = summary.expensesPaid + summary.expensesUnpaid;

  return (
    <Page title={event.name}>
      <p className="-mt-6 text-[15px] text-muted tabular-nums">
        <EventDates startDate={event.startDate} endDate={event.endDate} />
        {" · "}
        {formatBRL(Number(event.price))} por participante
        {event.note && <span className="block font-serif">{event.note}</span>}
      </p>

      {/* One per row on phones, where a negative balance would not fit half the width */}
      <div className={`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${statGridClass}`}>
        <Stat
          label="Recebido"
          value={formatBRL(summary.received)}
          hint={`de ${formatBRL(expected)} previsto`}
          tone="text-income"
          square="blue"
        />
        <Stat
          label="A receber"
          value={formatBRL(summary.pending)}
          hint={summary.overdue > 0 ? `${formatBRL(summary.overdue)} atrasado` : undefined}
          tone="text-pending"
          square={summary.overdue > 0 ? "orange" : "ink"}
        />
        <Stat
          label="Despesas"
          value={formatBRL(expensesTotal)}
          hint={
            summary.expensesUnpaid > 0
              ? `${formatBRL(summary.expensesUnpaid)} a pagar`
              : undefined
          }
          tone={expensesTotal > 0 ? "text-cost" : ""}
          square="orange"
        />
        <Stat
          label="Saldo disponível"
          value={formatBRL(summary.available)}
          hint="Recebido menos todas as despesas"
          tone={summary.available < 0 ? "text-cost" : ""}
          square="ink"
        />
      </div>

      <Section
        title={`Participantes (${participants.length})`}
        aside={
          <FormDialog label="Inscrever participante">
            <ParticipantForm
              action={signUpParticipant.bind(null, id)}
              kids={kidsToSignUp}
              price={event.price}
            />
          </FormDialog>
        }
      >
        {(summary.fund.grantedCount > 0 || summary.fund.requestedCount > 0) && (
          <p className="text-[15px] text-muted tabular-nums">
            {FUND_NAME}:{" "}
            {summary.fund.grantedCount > 0 && (
              <>
                cobriu <span className="text-ink">{formatBRL(summary.fund.granted)}</span> para{" "}
                {summary.fund.grantedCount}{" "}
                {summary.fund.grantedCount === 1 ? "participante" : "participantes"}
              </>
            )}
            {summary.fund.grantedCount > 0 && summary.fund.requestedCount > 0 && " · "}
            {summary.fund.requestedCount > 0 && (
              <span className="text-pending">
                {summary.fund.requestedCount}{" "}
                {summary.fund.requestedCount === 1 ? "pedido aguardando" : "pedidos aguardando"}
              </span>
            )}
          </p>
        )}
        {participants.length === 0 ? (
          <EmptyState>Ninguém inscrito ainda.</EmptyState>
        ) : (
          <ParticipantsTable eventId={id} participants={participants} />
        )}
      </Section>

      <Section
        title="Despesas"
        aside={
          <FormDialog label="Nova despesa">
            <ExpenseForm action={createExpense.bind(null, id)} kinds={kinds} />
          </FormDialog>
        }
      >
        {expenses.length === 0 ? (
          <EmptyState>Nenhuma despesa ainda.</EmptyState>
        ) : (
          <ul className={`divide-y divide-line-soft text-[15px] ${cardClass}`}>
            {expenses.map((expense) => (
              <ExpenseItem key={expense.id} expense={expense} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Dados do evento">
        <EventForm action={updateEvent.bind(null, id)} event={event} />
      </Section>

      <DeleteButton
        action={deleteEvent.bind(null, id)}
        label="Excluir evento"
        confirmMessage={`Excluir ${event.name}? As inscrições e despesas também são excluídas, e o que já foi pago sai das transações.`}
      />
    </Page>
  );
}

// Ramo order, then kids with no ramo, then the guests
type GroupKey = AgeGroup | "none" | "guest";

function groupOf(participant: ParticipantRow): GroupKey {
  if (participant.kidId === null) return "guest";
  return participant.ageGroup ?? "none";
}

function groupLabel(key: GroupKey) {
  if (key === "guest") return "Convidados";
  if (key === "none") return "Sem ramo";
  return <AgeGroupLabel ageGroup={key} />;
}

function ParticipantsTable({
  eventId,
  participants,
}: {
  eventId: number;
  participants: ParticipantRow[];
}) {
  // The query already sorts by ramo; guests and kids with no ramo come mixed
  // at the end, so they are split here
  const groups = new Map<GroupKey, ParticipantRow[]>();
  for (const participant of participants) {
    const key = groupOf(participant);
    groups.set(key, [...(groups.get(key) ?? []), participant]);
  }
  const ordered = [...groups.entries()].sort(
    ([a], [b]) => Number(a === "guest") - Number(b === "guest")
  );

  return (
    <div className={tableWrapClass}>
      <table className={tableClass}>
        <thead>
          <tr className={tableHeadRow}>
            <th className={tableHeadCell}>Nome</th>
            <th className={`${tableHeadCell} text-right max-sm:hidden`}>Valor</th>
            <th className={`${tableHeadCell} max-sm:hidden`}>Pagas</th>
            <th className={`${tableHeadCell} text-right`}>Falta</th>
            <th className={tableHeadCell}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        {ordered.map(([key, rows]) => (
          <tbody key={key}>
            <tr className={tableGroupHeadRow}>
              <th scope="rowgroup" colSpan={5} className={tableGroupHeadCell}>
                {groupLabel(key)} · {rows.length}
              </th>
            </tr>
            {rows.map((participant) => {
              const remaining = participant.pending;
              const settled = participant.paidCount === participant.installmentCount;
              // Nothing to pay when Fundo Lisah covers the whole fee
              const paidLabel =
                participant.installmentCount === 0
                  ? "Coberto"
                  : `${participant.paidCount}/${participant.installmentCount}`;
              return (
                <tr key={participant.id} className={tableRow}>
                  <td className={tableCell}>
                    {participant.name}
                    <FundNote participant={participant} />
                    <span
                      className={`block text-[13px] sm:hidden ${settled ? "text-income" : "text-muted"}`}
                    >
                      {paidLabel}
                      {participant.installmentCount > 0 && " pagas"} ·{" "}
                      {formatBRL(participant.total)}
                    </span>
                  </td>
                  <td className={`${tableCell} text-right whitespace-nowrap max-sm:hidden`}>
                    {formatBRL(participant.total)}
                  </td>
                  <td
                    className={`${tableCell} whitespace-nowrap max-sm:hidden ${settled ? "text-income" : "text-pending"}`}
                  >
                    {paidLabel}
                  </td>
                  <td className={`${tableCell} text-right whitespace-nowrap`}>
                    <span
                      className={
                        participant.overdue > 0
                          ? "text-cost"
                          : remaining > 0
                            ? "text-pending"
                            : "text-muted/60"
                      }
                    >
                      {formatBRL(remaining)}
                    </span>
                    {participant.overdue > 0 && (
                      <span className="block text-[13px] text-cost">atrasado</span>
                    )}
                  </td>
                  <td className={`${tableCell} text-right`}>
                    <Link
                      href={`/events/${eventId}/participants/${participant.id}`}
                      className={linkClass}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

// Under the name: the Fundo Lisah request or what it granted
function FundNote({ participant }: { participant: ParticipantRow }) {
  if (!participant.fundStatus) return null;
  const text =
    participant.fundStatus === "granted"
      ? `${FUND_NAME}: ${formatBRL(participant.fundAmount!)}`
      : participant.fundStatus === "requested"
        ? `${FUND_NAME}: aguardando`
        : `${FUND_NAME}: negado`;
  return (
    <span
      className={`block text-[13px] ${participant.fundStatus === "requested" ? "text-pending" : "text-muted"}`}
    >
      {text}
    </span>
  );
}

function ExpenseItem({ expense }: { expense: ExpenseRow }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex min-w-0 flex-col gap-1 tabular-nums">
        <p>
          {expense.description}
          <span className="text-muted">
            {" · "}
            <span className="text-cost">{formatBRL(Number(expense.amount))}</span>
            {expense.kind && ` · ${expense.kind}`}
          </span>
        </p>
        <p className="text-sm text-muted">
          {formatDate(expense.expenseDate)}
          {expense.supplier && ` · ${expense.supplier}`}
          {" · "}
          {expense.paidDate ? (
            <span>
              Paga em {formatDate(expense.paidDate)} ·{" "}
              {paymentMethodLabel(expense.paymentMethod)}
            </span>
          ) : (
            <span className="text-pending">A pagar</span>
          )}
        </p>
        {expense.note && <p className="font-serif text-sm text-muted">{expense.note}</p>}
      </div>
      {/* On phones the payment form takes the full width and the links share a row */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-sm:w-full">
        {expense.entryId ? (
          <UndoPaymentButton
            action={undoExpensePayment.bind(null, expense.id)}
            confirmMessage="Desfazer este pagamento? A transação de saída correspondente será excluída e a despesa volta a ficar a pagar."
          />
        ) : (
          <div className="max-sm:basis-full">
            <PaymentForm action={payExpense.bind(null, expense.id)} incoming={false} />
          </div>
        )}
        <DeleteButton
          action={deleteExpense.bind(null, expense.id)}
          label="Excluir"
          confirmMessage={
            expense.entryId
              ? "Excluir esta despesa? A transação de saída também é excluída."
              : "Excluir esta despesa?"
          }
          variant="link"
        />
      </div>
    </li>
  );
}
