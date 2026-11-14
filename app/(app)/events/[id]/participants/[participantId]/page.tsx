import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/dal";
import { getParticipant, listParticipantInstallments } from "@/lib/events";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { FUND_NAME } from "@/lib/fund";
import { EmptyState, Page } from "@/components/page";
import { Eyebrow } from "@/components/eyebrow";
import { DeleteButton } from "@/components/delete-button";
import { cardClass, labelClass } from "@/components/styles";
import { PaymentForm } from "@/app/(app)/sales/payment-form";
import { UndoPaymentButton } from "@/app/(app)/sales/undo-payment-button";
import {
  deleteParticipant,
  payEventInstallment,
  undoEventPayment,
  updateParticipantFund,
} from "../../../actions";
import { FundForm } from "./fund-form";

export default async function ParticipantPage({
  params,
}: PageProps<"/events/[id]/participants/[participantId]">) {
  await requireSession();

  const { id: eventParam, participantId: participantParam } = await params;
  const eventId = Number(eventParam);
  const id = Number(participantParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [participant, installments] = await Promise.all([
    getParticipant(id),
    listParticipantInstallments(id),
  ]);
  // The address names the event too, so a participant of another event is not found
  if (!participant || participant.eventId !== eventId) notFound();

  const today = todayISO();
  const remaining = installments
    .filter((installment) => !installment.entryId)
    .reduce((sum, installment) => sum + Number(installment.amount), 0);
  const paid = installments
    .filter((installment) => installment.entryId)
    .reduce((sum, installment) => sum + Number(installment.amount), 0);
  const fundAmount = participant.fundAmount ? Number(participant.fundAmount) : 0;

  return (
    <Page title={participant.name}>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
        <Detail label="Evento">
          <Link href={`/events/${eventId}`} className="underline-offset-4 hover:underline">
            {participant.eventName}
          </Link>
        </Detail>
        <Detail label="Cadastro">
          {participant.kidId ? (
            <Link href={`/kids/${participant.kidId}`} className="underline-offset-4 hover:underline">
              Ver bandeirante
            </Link>
          ) : (
            <span className="text-muted">Convidado, sem cadastro</span>
          )}
        </Detail>
        <Detail label="Valor">
          {formatBRL(Number(participant.total))}
          {fundAmount > 0 && (
            <span className="block text-sm text-muted">
              {FUND_NAME}: -{formatBRL(fundAmount)}
            </span>
          )}
        </Detail>
        <Detail label="Falta receber">
          <span className={remaining > 0 ? "text-pending" : "text-income"}>
            {formatBRL(remaining)}
          </span>
        </Detail>
        {participant.note && (
          <Detail label="Nota" className="col-span-full font-serif">
            {participant.note}
          </Detail>
        )}
      </dl>

      <section className="flex flex-col gap-4">
        <Eyebrow as="h2">{FUND_NAME}</Eyebrow>
        <FundForm
          action={updateParticipantFund.bind(null, id)}
          status={participant.fundStatus}
          amount={participant.fundAmount}
          maxAmount={Number(participant.total) - paid}
        />
      </section>

      <section className="flex flex-col gap-4">
        <Eyebrow as="h2">Parcelas</Eyebrow>
        {installments.length === 0 ? (
          <EmptyState>
            {participant.fundStatus === "granted"
              ? `O ${FUND_NAME} cobre o valor inteiro.`
              : "Nenhuma parcela."}
          </EmptyState>
        ) : (
          <ul className={`divide-y divide-line-soft text-[15px] ${cardClass}`}>
            {installments.map((installment) => {
              const overdue = !installment.entryId && installment.dueDate < today;
              return (
                <li
                  key={installment.id}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4"
                >
                  <div className="flex flex-col gap-1 tabular-nums">
                    <p>
                      {installment.number}ª parcela
                      <span className="text-muted">
                        {" "}
                        de {installments.length} · {formatBRL(Number(installment.amount))}
                      </span>
                    </p>
                    <p className="text-sm text-muted">
                      Vence {formatDate(installment.dueDate)} ·{" "}
                      {installment.paidDate ? (
                        <span className="text-income">
                          Paga em {formatDate(installment.paidDate)} ·{" "}
                          {paymentMethodLabel(installment.paymentMethod)}
                        </span>
                      ) : overdue ? (
                        <span className="text-cost">Atrasada</span>
                      ) : (
                        <span>A vencer</span>
                      )}
                    </p>
                  </div>
                  {installment.entryId ? (
                    <UndoPaymentButton action={undoEventPayment.bind(null, installment.id)} />
                  ) : (
                    <PaymentForm action={payEventInstallment.bind(null, installment.id)} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <DeleteButton
        action={deleteParticipant.bind(null, id)}
        label="Cancelar inscrição"
        confirmMessage={`Cancelar a inscrição de ${participant.name}? As parcelas pagas também saem das transações.`}
      />
    </Page>
  );
}

function Detail({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 bg-surface p-5 ${className}`}>
      <dt className={labelClass}>{label}</dt>
      <dd className="text-[17px] tabular-nums">{children}</dd>
    </div>
  );
}
