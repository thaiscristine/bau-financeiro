"use client";

import { FUND_NAME, FUND_STATUS_LABELS, FUND_STATUSES, NO_FUND_REQUEST, type FundStatus } from "@/lib/fund";
import { Field } from "@/components/form";
import { inputClass } from "@/components/styles";

export type FundChoice = FundStatus | typeof NO_FUND_REQUEST;

// The Fundo Lisah situation, and the amount granted once it is. Controlled, so
// the form around it can take the grant off what is left to pay.
export function FundFields({
  idPrefix,
  status,
  onStatusChange,
  amount,
  onAmountChange,
  statusLabel = FUND_NAME,
  hint,
}: {
  // Keeps the ids unique when two forms with these fields share a page
  idPrefix: string;
  status: FundChoice;
  onStatusChange: (status: FundChoice) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  // Under a Fundo Lisah heading the field needs no name of its own
  statusLabel?: string;
  hint?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field id={`${idPrefix}-fund-status`} label={statusLabel}>
        <select
          id={`${idPrefix}-fund-status`}
          name="fundStatus"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as FundChoice)}
          className={`${inputClass} pr-9`}
        >
          <option value={NO_FUND_REQUEST}>Não pediu</option>
          {FUND_STATUSES.map((option) => (
            <option key={option} value={option}>
              {FUND_STATUS_LABELS[option]}
            </option>
          ))}
        </select>
      </Field>
      {/* Not rendered unless granted, so no amount is saved for a request or a refusal */}
      {status === "granted" && (
        <Field id={`${idPrefix}-fund-amount`} label="Valor concedido (R$)" hint={hint}>
          <input
            id={`${idPrefix}-fund-amount`}
            name="fundAmount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      )}
    </div>
  );
}
