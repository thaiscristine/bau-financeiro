"use client";

import { useState } from "react";
import type { EventFormState } from "./actions";
import type { events } from "@/db/schema";
import { todayISO } from "@/lib/format";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  useFormAction,
} from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { formCardClass, inputClass, modalFormClass } from "@/components/styles";

export function EventForm({
  action,
  event,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  event?: typeof events.$inferSelect;
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
      <Field id="name" label="Nome" hint="Acampamento, passeio, encontro...">
        <input
          id="name"
          name="name"
          required
          data-autofocus
          defaultValue={event?.name}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field id="startDate" label="Início">
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={event?.startDate ?? todayISO()}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field id="endDate" label="Término (opcional)">
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={event?.endDate ?? ""}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      <Field
        id="price"
        label="Valor por participante (R$)"
        hint={
          event
            ? "Mudar o valor só vale para as próximas inscrições."
            : "Pode ser mudado na inscrição de cada um, para descontos ou vagas gratuitas."
        }
      >
        <input
          id="price"
          name="price"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          defaultValue={event?.price}
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <Field id="note" label="Nota (opcional)">
        <input id="note" name="note" defaultValue={event?.note ?? ""} className={inputClass} />
      </Field>

      <FormError error={state?.error} />
      {event ? (
        <>
          <FormSuccess message={justSaved ? "Dados salvos." : undefined} />
          <SubmitButton pending={pending} />
        </>
      ) : (
        <SubmitButton pending={pending} label="Criar evento" pendingLabel="Criando..." />
      )}
    </form>
  );
}
