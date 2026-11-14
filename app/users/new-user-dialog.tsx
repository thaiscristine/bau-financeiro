"use client";

import { useEffect, useRef, useState } from "react";
import type { UserFormState } from "./actions";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { Modal, openModal } from "@/components/modal";
import { inputClass, primaryButtonClass } from "@/components/styles";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "@/lib/validation";

type UserAction = (state: UserFormState, formData: FormData) => Promise<UserFormState>;

export function NewUserDialog({ action }: { action: UserAction }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A new key on every close gives the next opening an empty form, without
  // what was typed or an old error
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => openModal(dialogRef.current)}
        className={primaryButtonClass}
      >
        Novo usuário
      </button>
      <Modal
        ref={dialogRef}
        title="Novo usuário"
        onClose={() => setFormKey((key) => key + 1)}
      >
        <NewUserForm
          key={formKey}
          action={action}
          onSaved={() => dialogRef.current?.close()}
        />
      </Modal>
    </>
  );
}

function NewUserForm({
  action,
  onSaved,
}: {
  action: UserAction;
  onSaved: () => void;
}) {
  const [state, formProps, pending] = useFormAction(action);

  useEffect(() => {
    if (state?.saved) onSaved();
  }, [state?.saved, onSaved]);

  return (
    <form {...formProps} className="flex flex-col gap-6">
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
