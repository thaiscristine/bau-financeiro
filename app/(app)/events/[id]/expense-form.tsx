"use client";

import { useState } from "react";
import type { EventFormState } from "../actions";
import { todayISO } from "@/lib/format";
import { ChoiceGroup, Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { PaymentMethodChoice } from "@/components/payment-method";
import { inputClass, modalFormClass } from "@/components/styles";

// Offered along with the kinds typed on earlier events
const COMMON_KINDS = [
  "Alimentação",
  "Transporte",
  "Material de atividade",
  "Vestuário",
  "Enfermaria",
  "Equipamentos",
  "Hospedagem",
];

export function ExpenseForm({
  action,
  kinds,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  kinds: string[];
}) {
  const [state, formProps, pending] = useFormAction(action);
  useFormDialog(state?.saved);
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const suggestions = [...new Set([...COMMON_KINDS, ...kinds])].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return (
    <form {...formProps} className={modalFormClass}>
      <Field id="expense-description" label="Despesa" hint="Camisetas, aluguel da van, mercado...">
        <input
          id="expense-description"
          name="description"
          required
          data-autofocus
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field id="expense-amount" label="Valor (R$)">
          <input
            id="expense-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field id="expense-date" label="Data">
          <input
            id="expense-date"
            name="expenseDate"
            type="date"
            required
            defaultValue={todayISO()}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field id="expense-kind" label="Tipo (opcional)">
          <input id="expense-kind" name="kind" list="expense-kinds" className={inputClass} />
          <datalist id="expense-kinds">
            {suggestions.map((kind) => (
              <option key={kind} value={kind} />
            ))}
          </datalist>
        </Field>
        <Field id="expense-supplier" label="Fornecedor (opcional)">
          <input id="expense-supplier" name="supplier" className={inputClass} />
        </Field>
      </div>

      <ChoiceGroup
        name="status"
        legend="Situação"
        value={status}
        onChange={setStatus}
        options={[
          { value: "paid", label: "Pago", tone: "orange" },
          { value: "pending", label: "A pagar", tone: "ink" },
        ]}
      />

      {/* A paid expense goes to Transações now; one to pay waits until it is paid */}
      {status === "paid" && <PaymentMethodChoice />}

      <Field
        id="expense-note"
        label="Nota (opcional)"
        hint={status === "pending" ? "Quem vai receber, por exemplo um reembolso." : undefined}
      >
        <input id="expense-note" name="note" className={inputClass} />
      </Field>

      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Adicionar despesa" pendingLabel="Adicionando..." />
    </form>
  );
}
