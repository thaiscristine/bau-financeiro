"use client";

import { useEffect, useRef } from "react";
import type { PasswordChangeState } from "./actions";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  useFormAction,
} from "@/components/form";
import { formCardClass, inputClass } from "@/components/styles";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "@/lib/validation";

export function ChangePasswordForm({
  action,
}: {
  action: (
    state: PasswordChangeState,
    formData: FormData
  ) => Promise<PasswordChangeState>;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.saved) formRef.current?.reset();
  }, [state?.saved]);

  return (
    <form ref={formRef} {...formProps} className={`${formCardClass} flex-1`}>
      <Field id="current-password" label="Senha atual">
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <Field
        id="new-password"
        label="Nova senha"
        hint={`De ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_BYTES} caracteres.`}
      >
        <input
          id="new-password"
          name="newPassword"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_BYTES}
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <Field id="confirm-password" label="Confirmar nova senha">
        <input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      {/* Pinned to the bottom so it lines up with the card beside it */}
      <div className="mt-auto flex flex-col gap-6">
        <FormError error={state?.error} />
        {state?.saved && !state.error && (
          <FormSuccess message="Senha trocada. Os outros navegadores onde você estava logado foram desconectados." />
        )}
        <SubmitButton pending={pending} label="Trocar senha" pendingLabel="Trocando..." />
      </div>
    </form>
  );
}
