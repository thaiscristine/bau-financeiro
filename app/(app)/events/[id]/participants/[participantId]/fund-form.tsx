"use client";

import { useState } from "react";
import type { EventFormState } from "../../../actions";
import { NO_FUND_REQUEST, type FundStatus } from "@/lib/fund";
import { formatBRL } from "@/lib/format";
import { FormError, FormSuccess, SubmitButton, useFormAction } from "@/components/form";
import { formCardClass, secondaryButtonClass } from "@/components/styles";
import { FundFields, type FundChoice } from "../../fund-fields";

export function FundForm({
  action,
  status,
  amount,
  maxAmount,
}: {
  action: (state: EventFormState, formData: FormData) => Promise<EventFormState>;
  status: FundStatus | null;
  amount: string | null;
  // The most a grant can be: what is not paid yet
  maxAmount: number;
}) {
  const [state, formProps, pending] = useFormAction(action);
  const [fundStatus, setFundStatus] = useState<FundChoice>(status ?? NO_FUND_REQUEST);
  const [fundAmount, setFundAmount] = useState(amount ?? "");
  // The save the person has edited past, so the confirmation hides once
  // there are unsaved changes again
  const [editedAfter, setEditedAfter] = useState<number>();
  const justSaved = state?.saved !== undefined && state.saved !== editedAfter;

  return (
    <form
      {...formProps}
      onChange={() => setEditedAfter(state?.saved)}
      className={formCardClass}
    >
      <FundFields
        idPrefix="fund"
        statusLabel="Situação"
        status={fundStatus}
        onStatusChange={setFundStatus}
        amount={fundAmount}
        onAmountChange={setFundAmount}
        hint={`No máximo ${formatBRL(maxAmount)}. As parcelas em aberto são recalculadas.`}
      />
      <FormError error={state?.error} />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending} className={secondaryButtonClass} />
        <FormSuccess message={justSaved ? "Fundo Lisah salvo." : undefined} />
      </div>
    </form>
  );
}
