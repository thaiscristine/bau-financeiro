"use client";

import type { PaymentFormState } from "./actions";
import { todayISO } from "@/lib/format";
import { FormError, SubmitButton, useFormAction } from "@/components/form";
import { useCelebrate } from "@/components/confetti";
import { PaymentMethodSelect } from "@/components/payment-method";
import { inputClass, secondaryButtonClass } from "@/components/styles";

export function PaymentForm({
  action,
  incoming = true,
}: {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  // False when the payment is money going out, such as an expense
  incoming?: boolean;
}) {
  // A paid installment is money coming in, so it gets confetti. Fired here
  // rather than in an effect: once paid, this form is swapped for the undo
  // button in the same render.
  const celebrate = useCelebrate();
  const [state, formProps, pending] = useFormAction(
    async (prevState: PaymentFormState, formData: FormData) => {
      const next = await action(prevState, formData);
      if (next?.paid && incoming) celebrate();
      return next;
    }
  );

  return (
    <form {...formProps} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch">
        <input
          name="paidDate"
          type="date"
          required
          defaultValue={todayISO()}
          aria-label="Data do pagamento"
          className={`${inputClass} py-1`}
        />
        <PaymentMethodSelect className="w-auto py-1" />
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
