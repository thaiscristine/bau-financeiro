// How money was paid or received. Stored as a Postgres enum, so adding one
// needs a migration.
export const PAYMENT_METHODS = ["cash", "pix", "debit_card", "credit_card"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit_card: "Débito",
  credit_card: "Crédito",
};

export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
}));

// Entries recorded before the payment method was tracked have none
export function paymentMethodLabel(method: PaymentMethod | null) {
  return method ? PAYMENT_METHOD_LABELS[method] : "Não informada";
}
