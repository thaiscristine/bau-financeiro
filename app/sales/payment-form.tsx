"use client";

import type { PaymentFormState } from "./actions";
import { todayISO } from "@/lib/format";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { useCelebrate } from "@/components/confetti";
import { inputClass, secondaryButtonClass } from "@/components/styles";

export function PaymentForm({
  action,
}: {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
}) {
  // A paid installment is money coming in, so it gets confetti. Fired here
  // rather than in an effect: once paid, this form is swapped for the undo
  // button in the same render.
  const celebrate = useCelebrate();
  const [state, formProps, pending] = useFormAction(
    async (prevState: PaymentFormState, formData: FormData) => {
      const next = await action(prevState, formData);
      if (next?.paid) celebrate();
      return next;
    }
  );

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
