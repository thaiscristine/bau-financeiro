"use client";

import { useState } from "react";
import type { EventFormState } from "../actions";
import { todayISO } from "@/lib/format";
import { toCents } from "@/lib/installments";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { inputClass, modalFormClass } from "@/components/styles";
import { InstallmentFields } from "./installment-fields";

// Adds a participant of the event to an extra charge
export function ChargeSignUpForm({
  action,
  chargeId,
  participants,
  price,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  chargeId: number;
  // Only the participants who have not taken the charge yet
  participants: { id: number; name: string }[];
  price: string;
}) {
  const [state, formProps, pending] = useFormAction(action);
  useFormDialog(state?.saved);

  const [total, setTotal] = useState(price);
  const [installmentCount, setInstallmentCount] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(todayISO());
  const idPrefix = `charge-${chargeId}`;

  return (
    <form {...formProps} className={modalFormClass}>
      <Field id={`${idPrefix}-participant`} label="Participante">
        <select
          id={`${idPrefix}-participant`}
          name="participantId"
          required
          data-autofocus
          className={inputClass}
        >
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id={`${idPrefix}-total`}
        label="Valor (R$)"
        hint="O valor da cobrança. Mude para dar desconto."
      >
        <input
          id={`${idPrefix}-total`}
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

      <InstallmentFields
        idPrefix={idPrefix}
        owedCents={toCents(total || 0)}
        count={installmentCount}
        onCountChange={setInstallmentCount}
        firstDueDate={firstDueDate}
        onFirstDueDateChange={setFirstDueDate}
      />

      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Adicionar" pendingLabel="Adicionando..." />
    </form>
  );
}
