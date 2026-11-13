"use client";

import { startTransition, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { hintClass, labelClass, primaryButtonClass } from "./styles";

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
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  );
}

const SQUARE_TONES = {
  blue: "bg-blue",
  orange: "bg-orange",
  ink: "bg-ink",
};

// Radio buttons drawn as a segmented control
export function ChoiceGroup<Value extends string>({
  name,
  legend,
  value,
  onChange,
  options,
}: {
  name: string;
  legend: string;
  value: Value;
  onChange: (value: Value) => void;
  options: { value: Value; label: string; tone?: keyof typeof SQUARE_TONES }[];
}) {
  return (
    <fieldset
      className="grid border border-line"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex h-10 cursor-pointer items-center justify-center gap-2 font-mono text-xs tracking-[0.05em] text-muted uppercase transition-colors not-last:border-r not-last:border-line hover:text-ink has-checked:bg-ink has-checked:text-canvas has-focus-visible:ring-2 has-focus-visible:ring-blue"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.tone && (
            <span aria-hidden className={`size-2 ${SQUARE_TONES[option.tone]}`} />
          )}
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="font-serif text-[15px] text-cost">{error}</p>;
}

export function SubmitButton({
  pending,
  label = "Salvar",
  pendingLabel = "Salvando...",
  className = `${primaryButtonClass} h-11`,
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
