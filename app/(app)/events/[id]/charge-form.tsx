"use client";

import type { EventFormState } from "../actions";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { inputClass, modalFormClass } from "@/components/styles";

// Creates an extra charge, or edits one when given
export function ChargeForm({
  action,
  charge,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  charge?: { id: number; name: string; price: string };
}) {
  const [state, formProps, pending] = useFormAction(action);
  useFormDialog(state?.saved);
  // Two of these forms can share the page
  const idPrefix = charge ? `charge-${charge.id}` : "charge-new";

  return (
    <form {...formProps} className={modalFormClass}>
      <Field id={`${idPrefix}-name`} label="Nome" hint="Passagem aérea, camiseta do evento...">
        <input
          id={`${idPrefix}-name`}
          name="name"
          required
          data-autofocus
          defaultValue={charge?.name}
          className={inputClass}
        />
      </Field>

      <Field
        id={`${idPrefix}-price`}
        label="Valor por participante (R$)"
        hint={
          charge
            ? "Mudar o valor só vale para quem for adicionado depois."
            : "Pode ser mudado para cada participante."
        }
      >
        <input
          id={`${idPrefix}-price`}
          name="price"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          defaultValue={charge?.price}
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <FormError error={state?.error} />
      {charge ? (
        <SubmitButton pending={pending} />
      ) : (
        <SubmitButton pending={pending} label="Criar cobrança" pendingLabel="Criando..." />
      )}
    </form>
  );
}
