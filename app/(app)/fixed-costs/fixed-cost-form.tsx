"use client";

import { useState } from "react";
import type { FixedCostFormState } from "./actions";
import type { FixedCost } from "@/db/schema";
import { todayISO } from "@/lib/format";
import { Field, FormError, FormSuccess, SubmitButton, useFormAction } from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { checkboxClass, formCardClass, inputClass, modalFormClass } from "@/components/styles";

export function FixedCostForm({
  action,
  cost,
}: {
  action: (state: FixedCostFormState, formData: FormData) => Promise<FixedCostFormState>;
  cost?: FixedCost;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const inDialog = useFormDialog(state?.saved);
  // The save the person has edited past, so the confirmation hides once
  // there are unsaved changes again
  const [editedAfter, setEditedAfter] = useState<number>();
  const justSaved = state?.saved !== undefined && state.saved !== editedAfter;

  return (
    <form
      {...formProps}
      onChange={() => setEditedAfter(state?.saved)}
      className={inDialog ? modalFormClass : formCardClass}
    >
      <Field id="fixed-cost-name" label="Nome" hint="Aluguel, internet, energia...">
        <input
          id="fixed-cost-name"
          name="name"
          required
          data-autofocus
          defaultValue={cost?.name}
          className={inputClass}
        />
      </Field>

      <Field id="fixed-cost-supplier" label="Fornecedor (opcional)">
        <input
          id="fixed-cost-supplier"
          name="supplier"
          defaultValue={cost?.supplier ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field
          id="fixed-cost-amount"
          label="Valor (R$)"
          hint={cost ? "Vale para os meses em aberto a partir deste." : undefined}
        >
          <input
            id="fixed-cost-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            defaultValue={cost?.amount}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field id="fixed-cost-due-day" label="Dia do vencimento">
          <input
            id="fixed-cost-due-day"
            name="dueDay"
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            required
            defaultValue={cost?.dueDay}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      {!cost && (
        <Field
          id="fixed-cost-start"
          label="Primeiro mês"
          hint="Meses anteriores também podem ser registrados, para pôr em dia o que já foi pago."
        >
          <input
            id="fixed-cost-start"
            name="startMonth"
            type="month"
            required
            max={todayISO().slice(0, 7)}
            defaultValue={todayISO().slice(0, 7)}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      )}

      <label className="flex items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          name="variable"
          defaultChecked={cost?.variable}
          className={`${checkboxClass} mt-0.5`}
        />
        <span>
          O valor muda todo mês
          <span className="block text-[13px] text-muted">
            Como energia e água: o valor é confirmado a cada pagamento.
          </span>
        </span>
      </label>

      <FormError error={state?.error} />
      {cost ? (
        <>
          <FormSuccess message={justSaved ? "Dados salvos." : undefined} />
          <SubmitButton pending={pending} />
        </>
      ) : (
        <SubmitButton pending={pending} label="Adicionar custo fixo" pendingLabel="Adicionando..." />
      )}
    </form>
  );
}
