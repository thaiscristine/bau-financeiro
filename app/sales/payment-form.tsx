"use client";

import type { PaymentFormState } from "./actions";
import { todayISO } from "@/lib/format";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { inputClass, secondaryButtonClass } from "@/components/styles";

export function PaymentForm({
  action,
}: {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
}) {
  const [state, formProps, pending] = useFormAction(action);

  return (
    <form {...formProps} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <input
          name="paidDate"
          type="date"
          required
          defaultValue={todayISO()}
          aria-label="Data do pagamento"
          className={`${inputClass} py-1`}
        />
        <SubmitButton
          pending={pending}
          label="Marcar como paga"
          pendingLabel="Salvando..."
          className={`${secondaryButtonClass} whitespace-nowrap`}
        />
      </div>
      <FormError error={state?.error} />
    </form>
  );
}
