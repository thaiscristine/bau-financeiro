"use client";

import { useEffect, useRef } from "react";
import type { UserFormState } from "./actions";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { formCardClass, inputClass } from "@/components/styles";

export function NewUserForm({
  action,
}: {
  action: (state: UserFormState, formData: FormData) => Promise<UserFormState>;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.saved) formRef.current?.reset();
  }, [state?.saved]);

  return (
    <form ref={formRef} {...formProps} className={formCardClass}>
      <Field id="user-name" label="Nome">
        <input id="user-name" name="name" required className={inputClass} />
      </Field>
      <Field id="user-email" label="E-mail">
        <input
          id="user-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <Field
        id="user-password"
        label="Senha"
        hint="Pelo menos 8 caracteres. Passe a senha para a pessoa por um canal seguro."
      >
        <input
          id="user-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Adicionar" pendingLabel="Adicionando..." />
    </form>
  );
}
