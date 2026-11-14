"use client";

import { useState } from "react";
import type { EventFormState } from "../actions";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { planInstallments, toCents } from "@/lib/installments";
import { GUEST } from "@/lib/validation";
import { FUND_NAME, NO_FUND_REQUEST } from "@/lib/fund";
import { FundFields, type FundChoice } from "./fund-fields";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { hintClass, inputClass, modalFormClass, panelClass } from "@/components/styles";

type KidOption = { id: number; name: string };

export function ParticipantForm({
  action,
  kids,
  price,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  // Only the kids not signed up yet
  kids: KidOption[];
  price: string;
}) {
  const [state, formProps, pending] = useFormAction(action);
  useFormDialog(state?.saved);

  const [choice, setChoice] = useState(kids.length > 0 ? String(kids[0].id) : GUEST);
  const [total, setTotal] = useState(price);
  const [installmentCount, setInstallmentCount] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(todayISO());
  const [fundStatus, setFundStatus] = useState<FundChoice>(NO_FUND_REQUEST);
  const [fundAmount, setFundAmount] = useState("");

  const totalCents = toCents(total || 0);
  const grantCents = fundStatus === "granted" ? toCents(fundAmount || 0) : 0;
  // What the participant pays once the fund's grant comes off
  const owedCents = totalCents - grantCents;
  const coveredByFund = grantCents > 0 && owedCents === 0;
  const count = Number(installmentCount);
  const plan =
    owedCents > 0 && Number.isInteger(count) && count >= 1 && count <= 24 && firstDueDate
      ? planInstallments(owedCents, count, firstDueDate)
      : [];

  return (
    <form {...formProps} className={modalFormClass}>
      <Field id="participant-kid-id" label="Participante">
        <select
          id="participant-kid-id"
          name="kidId"
          required
          data-autofocus
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          className={inputClass}
        >
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.name}
            </option>
          ))}
          <option value={GUEST}>Convidado (não cadastrado)</option>
        </select>
      </Field>

      {choice === GUEST && (
        <div className={panelClass}>
          <Field id="participant-guest-name" label="Nome do convidado">
            <input id="participant-guest-name" name="guestName" required className={inputClass} />
          </Field>
          <p className={hintClass}>
            O convidado fica só neste evento, sem cadastro de bandeirante.
          </p>
        </div>
      )}

      <Field
        id="participant-total"
        label="Valor (R$)"
        hint="O valor do evento. Mude para dar desconto ou uma vaga gratuita."
      >
        <input
          id="participant-total"
          name="total"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <FundFields
        idPrefix="participant"
        status={fundStatus}
        onStatusChange={setFundStatus}
        amount={fundAmount}
        onAmountChange={setFundAmount}
        hint="Sai do valor; as parcelas dividem o restante."
      />

      {coveredByFund ? (
        <div className={`${panelClass} text-sm text-muted`}>
          O {FUND_NAME} cobre o valor inteiro, então não há parcelas.
          {/* The plan the server checks, though nothing is left to split */}
          <input type="hidden" name="installmentCount" value="1" />
          <input type="hidden" name="firstDueDate" value={firstDueDate} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="participant-installment-count" label="Parcelas">
            <input
              id="participant-installment-count"
              name="installmentCount"
              type="number"
              step="1"
              min="1"
              max="24"
              required
              value={installmentCount}
              onChange={(event) => setInstallmentCount(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="participant-first-due-date" label="Vencimento da 1ª parcela">
            <input
              id="participant-first-due-date"
              name="firstDueDate"
              type="date"
              required
              value={firstDueDate}
              onChange={(event) => setFirstDueDate(event.target.value)}
              className={`${inputClass} tabular-nums`}
            />
          </Field>
        </div>
      )}

      {(plan.length > 1 || (plan.length === 1 && grantCents > 0)) && (
        <ul className={`${panelClass} gap-1 text-sm text-muted tabular-nums`}>
          {plan.map((installment) => (
            <li key={installment.number} className="flex justify-between">
              <span>
                {installment.number}ª parcela - vence {formatDate(installment.dueDate)}
              </span>
              <span>{formatBRL(installment.amountCents / 100)}</span>
            </li>
          ))}
        </ul>
      )}

      <Field id="participant-note" label="Nota (opcional)">
        <input id="participant-note" name="note" className={inputClass} />
      </Field>

      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Inscrever" pendingLabel="Inscrevendo..." />
    </form>
  );
}
