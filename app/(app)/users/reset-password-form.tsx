"use client";

import { useEffect, useRef } from "react";
import type { PasswordResetState } from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  useFormAction,
} from "@/components/form";
import { formCardClass, inputClass } from "@/components/styles";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "@/lib/validation";

export function ResetPasswordForm({
  action,
  teammates,
}: {
  action: (
    state: PasswordResetState,
    formData: FormData
  ) => Promise<PasswordResetState>;
  teammates: { id: number; name: string }[];
}) {
  const [state, formProps, pending] = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.saved) formRef.current?.reset();
  }, [state?.saved]);

  return (
    <form ref={formRef} {...formProps} className={`${formCardClass} flex-1`}>
      <Field id="reset-user" label="Pessoa">
        <select
          id="reset-user"
          name="userId"
          required
          defaultValue=""
          className={`${inputClass} pr-9`}
        >
          <option value="" disabled>
            Selecione
          </option>
          {teammates.map((teammate) => (
            <option key={teammate.id} value={teammate.id}>
              {teammate.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="reset-new-password"
        label="Nova senha da pessoa"
        hint={`De ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_BYTES} caracteres. Passe a senha para a pessoa por um canal seguro.`}
      >
        <input
          id="reset-new-password"
          name="newPassword"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_BYTES}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <Field
        id="reset-own-password"
        label="A sua senha"
        hint="Confirma que é você quem está redefinindo."
      >
        <input
          id="reset-own-password"
          name="ownPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      {/* Pinned to the bottom so it lines up with the card beside it */}
      <div className="mt-auto flex flex-col gap-6">
        <FormError error={state?.error} />
        {state?.saved && (
          <FormSuccess message="Senha redefinida. A pessoa foi desconectada de todos os navegadores e já pode entrar com a nova senha." />
        )}
        <SubmitButton pending={pending} label="Redefinir senha" pendingLabel="Redefinindo..." />
      </div>
    </form>
  );
}
