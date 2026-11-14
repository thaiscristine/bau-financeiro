"use client";

import { useState } from "react";
import type { KidFormState } from "./actions";
import type { Kid } from "@/db/schema";
import { AgeGroupSelect } from "./age-group-select";
import { paysMonthlyFee } from "@/lib/age-groups";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  useFormAction,
} from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import {
  checkboxClass,
  formCardClass,
  hintClass,
  inputClass,
  modalFormClass,
  panelClass,
} from "@/components/styles";

export function KidForm({
  action,
  kid,
}: {
  action: (state: KidFormState, formData: FormData) => Promise<KidFormState>;
  kid?: Kid;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const inDialog = useFormDialog(state?.saved);
  const [isMinor, setIsMinor] = useState(kid?.isMinor ?? false);
  const [ageGroup, setAgeGroup] = useState(kid?.ageGroup ?? null);
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
      <Field id="name" label="Nome">
        <input
          id="name"
          name="name"
          required
          data-autofocus
          defaultValue={kid?.name}
          className={inputClass}
        />
      </Field>

      <Field id="contact" label="Contato (opcional)" hint="Telefone do bandeirante, por exemplo.">
        <input
          id="contact"
          name="contact"
          defaultValue={kid?.contact ?? ""}
          className={inputClass}
        />
      </Field>

      <Field id="ageGroup" label="Ramo (opcional)">
        <AgeGroupSelect id="ageGroup" defaultValue={kid?.ageGroup} onChange={setAgeGroup} />
      </Field>

      {/* Not rendered for the coordination, who pays no contribution */}
      {paysMonthlyFee(ageGroup) && (
        <Field
          id="monthlyFee"
          label="Contribuição mensal (R$)"
          hint="Cobrada de fevereiro a novembro, menos julho. Deixe vazio se não paga."
        >
          <input
            id="monthlyFee"
            name="monthlyFee"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            defaultValue={kid?.monthlyFee ?? ""}
            className={inputClass}
          />
        </Field>
      )}

      <label className="flex cursor-pointer items-start gap-3 border border-line bg-canvas p-4">
        <input
          type="checkbox"
          name="isMinor"
          checked={isMinor}
          onChange={(event) => setIsMinor(event.target.checked)}
          className={`mt-0.5 ${checkboxClass}`}
        />
        <span className="flex flex-col gap-1">
          <span className="text-[15px]">Menor de idade</span>
          <span className={hintClass}>
            Bandeirantes com menos de 18 anos precisam de um responsável cadastrado.
          </span>
        </span>
      </label>

      {/* Not rendered when unticked, so an adult is saved without a responsible person */}
      {isMinor && (
        <div className={panelClass}>
          <Field id="guardianName" label="Nome do responsável">
            <input
              id="guardianName"
              name="guardianName"
              required
              defaultValue={kid?.guardianName ?? ""}
              className={inputClass}
            />
          </Field>
          <Field id="guardianPhone" label="Telefone do responsável">
            <input
              id="guardianPhone"
              name="guardianPhone"
              type="tel"
              required
              defaultValue={kid?.guardianPhone ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      )}

      <FormError error={state?.error} />
      {kid ? (
        <>
          <FormSuccess message={justSaved ? "Dados salvos." : undefined} />
          <SubmitButton pending={pending} />
        </>
      ) : (
        <SubmitButton pending={pending} label="Adicionar" pendingLabel="Adicionando..." />
      )}
    </form>
  );
}
