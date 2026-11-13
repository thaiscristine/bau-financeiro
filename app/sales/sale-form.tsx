"use client";

import { useState } from "react";
import type { SaleFormState } from "./actions";
import { formatBRL, formatDate, todayISO } from "@/lib/format";
import { planInstallments, toCents } from "@/lib/installments";
import { NEW_KID } from "@/lib/validation";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import {
  formCardClass,
  hintClass,
  inputClass,
  panelClass,
} from "@/components/styles";

type KidOption = { id: number; name: string };
type ItemOption = {
  id: number;
  name: string;
  price: string;
  tracksStock: boolean;
  stock: number;
};

export function SaleForm({
  action,
  kids,
  items,
  defaultKidId,
  defaultItemId,
}: {
  action: (state: SaleFormState, formData: FormData) => Promise<SaleFormState>;
  kids: KidOption[];
  items: ItemOption[];
  defaultKidId?: number;
  defaultItemId?: number;
}) {
  const [state, formProps, pending] = useFormAction(action);

  const [kidChoice, setKidChoice] = useState(
    defaultKidId && kids.some((kid) => kid.id === defaultKidId)
      ? String(defaultKidId)
      : kids.length > 0
        ? String(kids[0].id)
        : NEW_KID
  );

  const initialItem = items.find((item) => item.id === defaultItemId) ?? items[0];
  const [itemId, setItemId] = useState<number | undefined>(initialItem?.id);
  const [unitPrice, setUnitPrice] = useState(initialItem?.price ?? "");
  const [quantity, setQuantity] = useState("1");
  const [installmentCount, setInstallmentCount] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(todayISO());

  const item = items.find((option) => option.id === itemId);
  const totalCents = toCents(unitPrice || 0) * (Number(quantity) || 0);
  const count = Number(installmentCount);
  const plan =
    totalCents > 0 && Number.isInteger(count) && count >= 1 && count <= 24 && firstDueDate
      ? planInstallments(totalCents, count, firstDueDate)
      : [];

  return (
    <form {...formProps} className={formCardClass}>
      <Field id="kidId" label="Bandeirante">
        <select
          id="kidId"
          name="kidId"
          required
          value={kidChoice}
          onChange={(event) => setKidChoice(event.target.value)}
          className={inputClass}
        >
          {kids.map((kid) => (
            <option key={kid.id} value={kid.id}>
              {kid.name}
            </option>
          ))}
          <option value={NEW_KID}>Outro (não cadastrado)</option>
        </select>
      </Field>

      {kidChoice === NEW_KID && (
        <div className={`${panelClass} grid grid-cols-1 sm:grid-cols-2`}>
          <Field id="newKidName" label="Nome do novo bandeirante">
            <input id="newKidName" name="newKidName" required className={inputClass} />
          </Field>
          <Field id="newKidContact" label="Telefone (opcional)">
            <input
              id="newKidContact"
              name="newKidContact"
              type="tel"
              className={inputClass}
            />
          </Field>
          <p className={`${hintClass} sm:col-span-2`}>
            O bandeirante é cadastrado junto com a venda.
          </p>
        </div>
      )}

      <Field
        id="itemId"
        label="Item"
        hint={
          item?.tracksStock
            ? `${item.stock} ${item.stock === 1 ? "unidade disponível" : "unidades disponíveis"}`
            : undefined
        }
      >
        <select
          id="itemId"
          name="itemId"
          required
          value={itemId}
          onChange={(event) => {
            const next = items.find((option) => option.id === Number(event.target.value));
            setItemId(next?.id);
            if (next) setUnitPrice(next.price);
          }}
          className={inputClass}
        >
          {items.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="quantity" label="Quantidade">
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="1"
            min="1"
            max={item?.tracksStock ? item.stock : undefined}
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="unitPrice" label="Preço unitário (R$)">
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="saleDate" label="Data da venda">
        <input
          id="saleDate"
          name="saleDate"
          type="date"
          required
          defaultValue={todayISO()}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="installmentCount" label="Parcelas">
          <input
            id="installmentCount"
            name="installmentCount"
            type="number"
            step="1"
            min="1"
            max="24"
            required
            value={installmentCount}
            onChange={(event) => setInstallmentCount(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id="firstDueDate" label="Vencimento da 1ª parcela">
          <input
            id="firstDueDate"
            name="firstDueDate"
            type="date"
            required
            value={firstDueDate}
            onChange={(event) => setFirstDueDate(event.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {plan.length > 0 && (
        <div className={`${panelClass} gap-3 tabular-nums`}>
          <p className="flex items-baseline justify-between">
            <span className="font-mono text-xs tracking-[0.05em] uppercase">Total</span>
            <span className="text-2xl tracking-[-0.02em]">
              {formatBRL(totalCents / 100)}
            </span>
          </p>
          {plan.length > 1 && (
            <ul className="flex flex-col gap-1 border-t border-line pt-3 text-sm text-muted">
              {plan.map((installment) => (
                <li key={installment.number} className="flex justify-between">
                  <span>
                    {installment.number}ª parcela - vence {formatDate(installment.dueDate)}
                  </span>
                  <span>{formatBRL(installment.amountCents / 100)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Field id="note" label="Nota (opcional)">
        <input id="note" name="note" className={inputClass} />
      </Field>

      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Registrar venda" pendingLabel="Registrando..." />
    </form>
  );
}
