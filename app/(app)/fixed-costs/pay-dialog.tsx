"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import type { PaymentFormState } from "@/app/(app)/sales/actions";
import { todayISO } from "@/lib/format";
import { Field, FormError, SubmitButton, useFormAction } from "@/components/form";
import { Modal, openModal } from "@/components/modal";
import { PaymentMethodChoice } from "@/components/payment-method";
import { inputClass, modalFormClass, secondaryButtonClass } from "@/components/styles";

// A button that opens the payment of one month of a fixed cost. The amount
// comes filled in and can be changed, for bills that vary.
export function PayDialog({
  title,
  description,
  amount,
  action,
}: {
  title: string;
  // Which month is being paid and when it is due
  description: string;
  amount: string;
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A new key on every close gives the next opening a fresh form
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => openModal(dialogRef.current)}
        className={`${secondaryButtonClass} h-8 px-3 text-[14px]`}
      >
        Pagar
      </button>
      <Modal ref={dialogRef} title={title} onClose={() => setFormKey((key) => key + 1)}>
        <Fragment key={formKey}>
          <p className="-mt-2 mb-6 text-[15px] text-muted tabular-nums">{description}</p>
          <PayForm
            amount={amount}
            action={action}
            onPaid={() => dialogRef.current?.close()}
          />
        </Fragment>
      </Modal>
    </>
  );
}

function PayForm({
  amount,
  action,
  onPaid,
}: {
  amount: string;
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  onPaid: () => void;
}) {
  const [state, formProps, pending] = useFormAction(action);
  // A row can hold this form twice, laid out for phones and for wider screens
  const id = useId();

  useEffect(() => {
    if (state?.paid) onPaid();
  }, [state, onPaid]);

  return (
    <form {...formProps} className={modalFormClass}>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field id={`${id}-amount`} label="Valor pago (R$)">
          <input
            id={`${id}-amount`}
            name="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            required
            data-autofocus
            defaultValue={amount}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field id={`${id}-date`} label="Data do pagamento">
          <input
            id={`${id}-date`}
            name="paidDate"
            type="date"
            required
            defaultValue={todayISO()}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>
      <PaymentMethodChoice />
      <FormError error={state?.error} />
      <SubmitButton pending={pending} label="Registrar pagamento" pendingLabel="Registrando..." />
    </form>
  );
}
