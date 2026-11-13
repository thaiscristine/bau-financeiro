"use client";

import { useState } from "react";
import type { ItemFormState } from "./actions";
import type { Category } from "@/db/schema";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass } from "@/components/styles";

type ItemValues = {
  name: string;
  categoryId: number;
  price: string;
  tracksStock: boolean;
};

export function ItemForm({
  action,
  categories,
  item,
}: {
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  categories: Category[];
  item?: ItemValues;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const [tracksStock, setTracksStock] = useState(item?.tracksStock ?? true);

  return (
    <form {...formProps} className="flex max-w-xl flex-col gap-4">
      <Field id="name" label="Nome">
        <input
          id="name"
          name="name"
          required
          placeholder="Ex.: Boné, Camiseta P, Aluguel da van"
          defaultValue={item?.name}
          className={inputClass}
        />
      </Field>

      <Field id="categoryId" label="Categoria" hint="De onde vem o valor deste item.">
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={item?.categoryId}
          className={inputClass}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </Field>

      <Field id="price" label="Preço (R$)">
        <input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={item?.price}
          className={inputClass}
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="tracksStock"
          checked={tracksStock}
          onChange={(event) => setTracksStock(event.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="font-medium">Controlar estoque</span>
          <span className="block text-xs text-zinc-500">
            Desmarque para serviços, como o aluguel da van, que não têm quantidade
            guardada.
          </span>
        </span>
      </label>

      {!item && tracksStock && (
        <Field id="initialStock" label="Quantidade inicial em estoque">
          <input
            id="initialStock"
            name="initialStock"
            type="number"
            step="1"
            min="0"
            defaultValue={0}
            className={inputClass}
          />
        </Field>
      )}

      <FormError error={state?.error} />
      <SubmitButton pending={pending} />
    </form>
  );
}
