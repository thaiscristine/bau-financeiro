"use client";

import { useState } from "react";
import type { KidFormState } from "./actions";
import type { Kid } from "@/db/schema";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import {
  checkboxClass,
  formCardClass,
  hintClass,
  inputClass,
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
  const [isMinor, setIsMinor] = useState(kid?.isMinor ?? false);

  return (
    <form {...formProps} className={formCardClass}>
      <Field id="name" label="Nome">
        <input
          id="name"
          name="name"
          required
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
      <SubmitButton pending={pending} />
    </form>
  );
}
