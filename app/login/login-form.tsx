"use client";

import { useEffect, useState } from "react";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass, labelClass } from "@/components/styles";
import { login } from "./actions";

export function LoginForm() {
  const [state, formProps, pending] = useFormAction(login);
  const lockout = state?.lockout;

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
      {lockout ? (
        // A new key restarts the countdown when another lockout comes back
        <LockedOut
          key={lockout.issuedAt}
          retryAfterSeconds={lockout.retryAfterSeconds}
          pending={pending}
        />
      ) : (
        <>
          <FormError error={state?.error} />
          <LoginButton pending={pending} />
        </>
      )}
    </form>
  );
}

function LoginButton({
  pending,
  disabled,
}: {
  pending: boolean;
  disabled?: boolean;
}) {
  return (
    <SubmitButton
      pending={pending}
      disabled={disabled}
      label="Entrar"
      pendingLabel="Entrando..."
    />
  );
}

// Keeps the button off until the server will take attempts again
function LockedOut({
  retryAfterSeconds,
  pending,
}: {
  retryAfterSeconds: number;
  pending: boolean;
}) {
  const secondsLeft = useSecondsLeft(retryAfterSeconds);

  if (secondsLeft === 0) return <LoginButton pending={pending} />;

  return (
    <>
      <FormError
        error={`Muitas tentativas de login. Tente novamente em ${formatWait(secondsLeft)}.`}
      />
      <LoginButton pending={pending} disabled />
    </>
  );
}

function useSecondsLeft(totalSeconds: number) {
  const [deadline] = useState(() => Date.now() + totalSeconds * 1000);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const done = secondsLeft === 0;

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, done]);

  return secondsLeft;
}

function formatWait(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
