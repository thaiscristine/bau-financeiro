"use client";

import { formatBRL, formatDate } from "@/lib/format";
import { planInstallments } from "@/lib/installments";
import { Field } from "@/components/form";
import { inputClass, panelClass } from "@/components/styles";

// How many monthly installments and when the first is due, with the plan they
// give once there is more than one installment (or always, with showSinglePlan).
// Controlled, so the form around it can keep them while it hides the fields.
export function InstallmentFields({
  idPrefix,
  owedCents,
  count,
  onCountChange,
  firstDueDate,
  onFirstDueDateChange,
  showSinglePlan = false,
}: {
  // Keeps the ids unique when two forms with these fields share a page
  idPrefix: string;
  owedCents: number;
  count: string;
  onCountChange: (count: string) => void;
  firstDueDate: string;
  onFirstDueDateChange: (date: string) => void;
  showSinglePlan?: boolean;
}) {
  const countNumber = Number(count);
  const plan =
    owedCents > 0 &&
    Number.isInteger(countNumber) &&
    countNumber >= 1 &&
    countNumber <= 24 &&
    firstDueDate
      ? planInstallments(owedCents, countNumber, firstDueDate)
      : [];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-installment-count`} label="Parcelas">
          <input
            id={`${idPrefix}-installment-count`}
            name="installmentCount"
            type="number"
            step="1"
            min="1"
            max="24"
            required
            value={count}
            onChange={(event) => onCountChange(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field id={`${idPrefix}-first-due-date`} label="Vencimento da 1ª parcela">
          <input
            id={`${idPrefix}-first-due-date`}
            name="firstDueDate"
            type="date"
            required
            value={firstDueDate}
            onChange={(event) => onFirstDueDateChange(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>

      {(plan.length > 1 || (plan.length === 1 && showSinglePlan)) && (
        <ul className={`${panelClass} gap-1 text-sm text-muted tabular-nums`}>
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
    </>
  );
}
