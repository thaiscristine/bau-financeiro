"use client";

import { useActionState } from "react";
import { createEntry } from "./actions";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/validation";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function EntryForm() {
  const [state, formAction, pending] = useActionState(createEntry, undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <fieldset className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="type" value="income" defaultChecked />
          Entrada
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="type" value="cost" />
          Saída
        </label>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className="text-sm font-medium">
          Valor (R$)
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="entryDate" className="text-sm font-medium">
          Data
        </label>
        <input
          id="entryDate"
          name="entryDate"
          type="date"
          required
          defaultValue={today()}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium">
          Categoria
        </label>
        <select
          id="category"
          name="category"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium">
          Nota (opcional)
        </label>
        <input
          id="note"
          name="note"
          type="text"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
