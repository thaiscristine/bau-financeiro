"use client";

import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass, labelClass } from "@/components/styles";
import { login } from "./actions";

export function LoginForm() {
  const [state, formProps, pending] = useFormAction(login);

  return (
    <form {...formProps} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={state?.email}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={labelClass}>
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className={inputClass}
        />
      </div>
      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Entrar" pendingLabel="Entrando..." />
    </form>
  );
}
