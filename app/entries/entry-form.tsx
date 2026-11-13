"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntryFormState } from "./actions";
import { todayISO } from "@/lib/format";
import type { Category, Entry } from "@/db/schema";
import { useFormAction } from "@/components/form";

export function EntryForm({
  action,
  categories,
  kids,
  entry,
}: {
  action: (state: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  categories: Category[];
  kids: { id: number; name: string }[];
  entry?: Entry;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const [type, setType] = useState(entry?.type ?? "income");

  // Categories closed to manual entries (product sales go through Vendas) are
  // hidden, unless this entry already uses one
  const options = categories.filter(
    (category) => category.allowsManualEntry || category.id === entry?.categoryId
  );
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? options[0]?.id);
  const category = options.find((option) => option.id === categoryId);
  const hiddenCategories = categories.filter((option) => !options.includes(option));

  return (
    <form {...formProps} className="flex max-w-xl flex-col gap-4">
      <fieldset className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="type"
            value="income"
            checked={type === "income"}
            onChange={() => setType("income")}
          />
          Entrada
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="type"
            value="cost"
            checked={type === "cost"}
            onChange={() => setType("cost")}
          />
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
          defaultValue={entry?.amount}
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
          defaultValue={entry?.entryDate ?? todayISO()}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-sm font-medium">
          Categoria
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(Number(event.target.value))}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {hiddenCategories.length > 0 && (
          <p className="text-xs text-zinc-500">
            {hiddenCategories.map((option) => option.name).join(", ")}:
            registre pela tela{" "}
            <Link href="/sales/new" className="underline underline-offset-2">
              Nova venda
            </Link>
            , que também atualiza o estoque.
          </p>
        )}
      </div>

      {category?.requiresKid ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="kidId" className="text-sm font-medium">
            Bandeirante
          </label>
          {kids.length > 0 ? (
            <select
              id="kidId"
              name="kidId"
              required
              defaultValue={entry?.kidId ?? ""}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="" disabled>
                Selecione
              </option>
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-zinc-500">
              Nenhum bandeirante cadastrado.{" "}
              <Link href="/kids/new" className="underline underline-offset-2">
                Cadastrar bandeirante
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor="counterparty" className="text-sm font-medium">
            {type === "income" ? "Quem pagou" : "Fornecedor"} (opcional)
          </label>
          <input
            id="counterparty"
            name="counterparty"
            type="text"
            placeholder={
              type === "income"
                ? "Ex.: nome do doador ou do cliente da cantina"
                : "Ex.: nome da loja ou da pessoa que recebeu"
            }
            defaultValue={entry?.counterparty ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="note" className="text-sm font-medium">
          Nota (opcional)
        </label>
        <input
          id="note"
          name="note"
          type="text"
          defaultValue={entry?.note ?? ""}
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
