"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import type { CategoryFormState } from "./actions";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass, linkClass, primaryButtonClass } from "@/components/styles";

type CategoryAction = (
  state: CategoryFormState,
  formData: FormData
) => Promise<CategoryFormState>;

export function NewCategoryForm({ action }: { action: CategoryAction }) {
  const [state, formProps, pending] = useFormAction(action);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.saved) formRef.current?.reset();
  }, [state?.saved]);

  return (
    <form ref={formRef} {...formProps} className="flex max-w-xl flex-col gap-2">
      <label htmlFor="new-category" className="text-sm font-medium">
        Nova categoria
      </label>
      <div className="flex gap-2">
        <input
          id="new-category"
          name="name"
          required
          placeholder="Ex.: Rifa, Evento beneficente"
          className={`${inputClass} flex-1`}
        />
        <SubmitButton
          pending={pending}
          label="Adicionar"
          pendingLabel="Adicionando..."
          className={primaryButtonClass}
        />
      </div>
      <FormError error={state?.error} />
    </form>
  );
}

export function RenameCategoryForm({
  action,
  name,
}: {
  action: CategoryAction;
  name: string;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formProps, pending] = useFormAction(
    async (prevState: CategoryFormState, formData: FormData) => {
      const result = await action(prevState, formData);
      if (result?.saved) setEditing(false);
      return result;
    }
  );

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span>{name}</span>
        <button type="button" onClick={() => setEditing(true)} className={linkClass}>
          Renomear
        </button>
      </div>
    );
  }

  return (
    <form {...formProps} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input
          name="name"
          required
          autoFocus
          defaultValue={name}
          aria-label="Nome da categoria"
          className={`${inputClass} flex-1 py-1`}
        />
        <SubmitButton
          pending={pending}
          className={`${primaryButtonClass} py-1`}
        />
        <button type="button" onClick={() => setEditing(false)} className={linkClass}>
          Cancelar
        </button>
      </div>
      <FormError error={state?.error} />
    </form>
  );
}

// A checkbox that saves as soon as it changes, showing the new state right away.
// It calls the action directly: a <form> would be reset by React after the
// action, putting the checkbox back to its initial state.
export function RuleToggle({
  action,
  checked,
  label,
}: {
  action: () => Promise<void>;
  checked: boolean;
  label: string;
}) {
  const [optimisticChecked, setOptimisticChecked] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      aria-label={label}
      aria-busy={pending}
      checked={optimisticChecked}
      onChange={() =>
        startTransition(async () => {
          setOptimisticChecked(!checked);
          await action();
        })
      }
      className="h-4 w-4"
    />
  );
}
