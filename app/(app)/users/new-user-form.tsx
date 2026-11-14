"use client";

import type { UserFormState } from "./actions";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { inputClass, modalFormClass } from "@/components/styles";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "@/lib/validation";

type UserAction = (state: UserFormState, formData: FormData) => Promise<UserFormState>;

// Opened in a FormDialog, which it closes once the user is added
export function NewUserForm({ action }: { action: UserAction }) {
  const [state, formProps, pending] = useFormAction(action);
  useFormDialog(state?.saved);

  return (
    <form {...formProps} className={modalFormClass}>
      <Field id="user-name" label="Nome">
        <input id="user-name" name="name" required data-autofocus className={inputClass} />
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
        hint={`De ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_BYTES} caracteres. Passe a senha para a pessoa por um canal seguro.`}
      >
        <input
          id="user-password"
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_BYTES}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Adicionar" pendingLabel="Adicionando..." />
    </form>
  );
}
