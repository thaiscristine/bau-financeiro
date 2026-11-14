import {
  PAYMENT_METHOD_OPTIONS,
  paymentMethodLabel,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { ChoiceGroup } from "./form";
import { inputClass, labelClass, tableCell } from "./styles";

// Nothing is chosen up front, so a payment is never recorded with a method
// nobody picked
export function PaymentMethodChoice({
  label = "Forma de pagamento",
  defaultValue,
}: {
  label?: string;
  defaultValue?: PaymentMethod | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden className={labelClass}>
        {label}
      </span>
      <ChoiceGroup
        name="paymentMethod"
        legend={label}
        defaultValue={defaultValue ?? undefined}
        options={PAYMENT_METHOD_OPTIONS}
      />
    </div>
  );
}

// The compact version, for forms that sit on a single line
export function PaymentMethodSelect({ className = "" }: { className?: string }) {
  return (
    <select
      name="paymentMethod"
      required
      defaultValue=""
      aria-label="Forma de pagamento"
      className={`${inputClass} pr-9 ${className}`}
    >
      <option value="" disabled>
        Forma de pagamento
      </option>
      {PAYMENT_METHOD_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Entries from before the method was tracked show it muted
export function PaymentMethodCell({ method }: { method: PaymentMethod | null }) {
  return (
    <td className={`${tableCell} whitespace-nowrap ${method ? "" : "text-muted"}`}>
      {paymentMethodLabel(method)}
    </td>
  );
}
