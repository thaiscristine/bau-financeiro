"use client";

import { useState } from "react";
import type { EventFormState } from "../actions";
import { todayISO } from "@/lib/format";
import { toCents } from "@/lib/installments";
import { GUEST } from "@/lib/validation";
import { FUND_NAME, NO_FUND_REQUEST } from "@/lib/fund";
import { FundFields, type FundChoice } from "./fund-fields";
import { InstallmentFields } from "./installment-fields";
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
        <InstallmentFields
          idPrefix="participant"
          owedCents={owedCents}
          count={installmentCount}
          onCountChange={setInstallmentCount}
          firstDueDate={firstDueDate}
          onFirstDueDateChange={setFirstDueDate}
          // With a grant, the single installment shows what is left to pay
          showSinglePlan={grantCents > 0}
        />
      )}

      <Field id="participant-note" label="Nota (opcional)">
        <input id="participant-note" name="note" className={inputClass} />
      </Field>

      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Inscrever" pendingLabel="Inscrevendo..." />
    </form>
  );
}
