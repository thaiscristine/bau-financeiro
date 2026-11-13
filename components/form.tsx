"use client";

import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { primaryButtonClass } from "./styles";

// Like useActionState, but keeps what the person typed when the action returns
// an error. React resets a form after its action runs; submitting through a
// transition skips that. The native action stays as the no-JavaScript fallback.
export function useFormAction<State>(
  action: (state: State | undefined, formData: FormData) => Promise<State | undefined>
) {
  const [state, dispatch, pending] = useActionState(action, undefined);

  const formProps = {
    action: dispatch,
    onSubmit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(() => dispatch(formData));
    },
  };

  return [state, formProps, pending] as const;
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600">{error}</p>;
}

export function SubmitButton({
  pending,
  label = "Salvar",
  pendingLabel = "Salvando...",
  className = `mt-2 ${primaryButtonClass}`,
}: {
  pending?: boolean;
  label?: string;
  pendingLabel?: string;
  className?: string;
}) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <button type="submit" disabled={busy} className={className}>
      {busy ? pendingLabel : label}
    </button>
  );
}
