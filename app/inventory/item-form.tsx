"use client";

import { useState } from "react";
import type { ItemFormState } from "./actions";
import type { Category } from "@/db/schema";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import {
  checkboxClass,
  formCardClass,
  hintClass,
  inputClass,
} from "@/components/styles";
import { RestockCostFields } from "./restock-cost-fields";

type ItemValues = {
  name: string;
  price: string;
  tracksStock: boolean;
};

export function ItemForm({
  action,
  costCategories = [],
  item,
}: {
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  // Only needed when creating, for what was paid for the initial stock
  costCategories?: Category[];
  item?: ItemValues;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const [tracksStock, setTracksStock] = useState(item?.tracksStock ?? true);

  return (
    <form {...formProps} className={formCardClass}>
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


      <Field id="price" label="Preço de venda (R$)">
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

      <label className="flex cursor-pointer items-start gap-3 border border-line bg-canvas p-4">
        <input
          type="checkbox"
          name="tracksStock"
          checked={tracksStock}
          onChange={(event) => setTracksStock(event.target.checked)}
          className={`mt-0.5 ${checkboxClass}`}
        />
        <span className="flex flex-col gap-1">
          <span className="text-[15px]">Controlar estoque</span>
          <span className={hintClass}>
            Desmarque para serviços, como o aluguel da van, que não têm quantidade
            guardada.
          </span>
        </span>
      </label>

      {!item && tracksStock && (
        <>
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
          <RestockCostFields
            categories={costCategories}
            costLabel="Valor da mercadoria (R$)"
          />
        </>
      )}

      <FormError error={state?.error} />
      <SubmitButton pending={pending} />
    </form>
  );
}
