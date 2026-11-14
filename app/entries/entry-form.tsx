"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntryFormState } from "./actions";
import { todayISO } from "@/lib/format";
import type { Category, Entry } from "@/db/schema";
import {
  ChoiceGroup,
  Field,
  FormError,
  SubmitButton,
  useFormAction,
} from "@/components/form";
import { useFormDialog } from "@/components/form-dialog";
import { useCelebrate } from "@/components/confetti";
import { formCardClass, hintClass, inputClass, modalFormClass } from "@/components/styles";

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
  // Money coming in is good news for the group, so a new income gets confetti
  const celebrate = useCelebrate();
  const [state, formProps, pending] = useFormAction(
    async (prevState: EntryFormState, formData: FormData) => {
      const next = await action(prevState, formData);
      if (next?.savedType === "income") celebrate();
      return next;
    }
  );
  const inDialog = useFormDialog(state?.saved);
  const [type, setType] = useState(entry?.type ?? "income");

  // Categories closed to manual entries (product sales go through Lojinha) and
  // the monthly contribution (paid month by month on the bandeirante page) are
  // hidden, unless this entry already uses one
  const options = categories.filter(
    (category) =>
      (category.allowsManualEntry && !category.requiresKid) ||
      category.id === entry?.categoryId
  );
  const [categoryId, setCategoryId] = useState(entry?.categoryId ?? options[0]?.id);
  const category = options.find((option) => option.id === categoryId);
  const hiddenShopCategories = categories.filter(
    (option) => !options.includes(option) && !option.allowsManualEntry
  );
  const hiddenContributionCategories = categories.filter(
    (option) => !options.includes(option) && option.allowsManualEntry
  );

  return (
    <form {...formProps} className={inDialog ? modalFormClass : formCardClass}>
      <ChoiceGroup
        name="type"
        legend="Tipo"
        value={type}
        onChange={setType}
        options={[
          { value: "income", label: "Entrada", tone: "blue" },
          { value: "cost", label: "Saída", tone: "orange" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field id="amount" label="Valor (R$)">
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            data-autofocus
            defaultValue={entry?.amount}
            className={`${inputClass} tabular-nums`}
          />
        </Field>

        <Field id="entryDate" label="Data">
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={entry?.entryDate ?? todayISO()}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      <Field id="categoryId" label="Categoria">
        <select
          id="categoryId"
          name="categoryId"
          required
          value={categoryId}
          onChange={(event) => setCategoryId(Number(event.target.value))}
          className={`${inputClass} pr-9`}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        {hiddenContributionCategories.length > 0 && (
          <p className={hintClass}>
            {hiddenContributionCategories.map((option) => option.name).join(", ")}:
            registre na página do{" "}
            <Link href="/kids" className="text-ink underline underline-offset-2">
              bandeirante
            </Link>
            , mês a mês.
          </p>
        )}
        {hiddenShopCategories.length > 0 && (
          <p className={hintClass}>
            {hiddenShopCategories.map((option) => option.name).join(", ")}:
            registre pela tela{" "}
            <Link href="/sales" className="text-ink underline underline-offset-2">
              Lojinha
            </Link>
            , que também atualiza o estoque.
          </p>
        )}
      </Field>

      {category?.requiresKid ? (
        <Field id="kidId" label="Bandeirante">
          {kids.length > 0 ? (
            <select
              id="kidId"
              name="kidId"
              required
              defaultValue={entry?.kidId ?? ""}
              className={`${inputClass} pr-9`}
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
            <p className="font-serif text-[15px] text-muted">
              Nenhum bandeirante cadastrado.{" "}
              <Link href="/kids" className="text-ink underline underline-offset-2">
                Cadastrar bandeirante
              </Link>
            </p>
          )}
        </Field>
      ) : (
        <Field
          id="counterparty"
          label={`${type === "income" ? "Quem pagou" : "Fornecedor"} (opcional)`}
        >
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
            className={inputClass}
          />
        </Field>
      )}

      <Field id="note" label="Nota (opcional)">
        <input
          id="note"
          name="note"
          type="text"
          defaultValue={entry?.note ?? ""}
          className={inputClass}
        />
      </Field>

      <FormError error={state?.error} />
      {entry ? (
        <SubmitButton pending={pending} />
      ) : (
        <SubmitButton pending={pending} label="Adicionar" pendingLabel="Adicionando..." />
      )}
    </form>
  );
}
