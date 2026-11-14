"use client";

import type { KidFormState } from "./actions";
import type { Kid } from "@/db/schema";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { formCardClass, inputClass } from "@/components/styles";

export function KidForm({
  action,
  kid,
}: {
  action: (state: KidFormState, formData: FormData) => Promise<KidFormState>;
  kid?: Kid;
}) {
  const [state, formProps, pending] = useFormAction(action);

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

      <Field id="contact" label="Contato (opcional)" hint="Telefone do responsável, por exemplo.">
        <input
          id="contact"
          name="contact"
          defaultValue={kid?.contact ?? ""}
          className={inputClass}
        />
      </Field>

      <FormError error={state?.error} />
      <SubmitButton pending={pending} />
    </form>
  );
}
