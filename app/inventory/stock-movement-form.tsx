"use client";

import { useEffect, useRef, useState } from "react";
import type { StockMovementFormState } from "./actions";
import type { Category } from "@/db/schema";
import { todayISO } from "@/lib/format";
import {
  ChoiceGroup,
  Field,
  FormError,
  SubmitButton,
  useFormAction,
} from "@/components/form";
import {
  formCardClass,
  hintClass,
  inputClass,
  panelClass,
} from "@/components/styles";

export function StockMovementForm({
  action,
  categories,
}: {
  action: (
    state: StockMovementFormState,
    formData: FormData
  ) => Promise<StockMovementFormState>;
  categories: Category[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [reason, setReason] = useState<"restock" | "adjustment">("restock");
  const [state, formProps, pending] = useFormAction(
    async (prevState: StockMovementFormState, formData: FormData) => {
      const result = await action(prevState, formData);
      if (result?.saved) setReason("restock");
      return result;
    }
  );

  useEffect(() => {
    if (state?.saved) formRef.current?.reset();
  }, [state?.saved]);

  const defaultCostCategory =
    categories.find((category) => category.name === "Fornecedores") ??
    categories[0];

  return (
    <form ref={formRef} {...formProps} className={formCardClass}>
      <ChoiceGroup
        name="reason"
        legend="Motivo"
        value={reason}
        onChange={setReason}
        options={[
          { value: "restock", label: "Reposição" },
          { value: "adjustment", label: "Ajuste" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="quantity"
          label="Quantidade"
          hint="Em um ajuste, use número negativo para retirar (ex.: -2 perdidos)."
        >
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="1"
            required
            className={inputClass}
          />
        </Field>
        <Field id="movementDate" label="Data">
          <input
            id="movementDate"
            name="movementDate"
            type="date"
            required
            defaultValue={todayISO()}
            className={inputClass}
          />
        </Field>
      </div>

      {reason === "restock" && (
        <div className={panelClass}>
          <p className={hintClass}>
            Se a organização pagou por estes itens, informe o valor: a saída é
            registrada nos lançamentos. Deixe em branco para itens doados.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="cost" label="Valor pago (R$)">
              <input
                id="cost"
                name="cost"
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
              />
            </Field>
            <Field id="supplier" label="Fornecedor">
              <input id="supplier" name="supplier" className={inputClass} />
            </Field>
          </div>
          <Field id="costCategoryId" label="Categoria da saída">
            <select
              id="costCategoryId"
              name="costCategoryId"
              defaultValue={defaultCostCategory?.id}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      <Field id="movementNote" label="Nota (opcional)">
        <input id="movementNote" name="note" className={inputClass} />
      </Field>

      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Registrar" pendingLabel="Registrando..." />
    </form>
  );
}
