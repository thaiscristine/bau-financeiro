// Sample data for the Custos fixos screen while its layout is being decided.
// Nothing here is stored: once the screen is approved this becomes tables
// (the cost and its month-by-month payments, each pointing to a cost entry,
// like contributions do).

import type { PaymentMethod } from "@/lib/payment-methods";

export type FixedCost = {
  id: number;
  name: string;
  supplier: string;
  // Day of the month it is due
  dueDay: number;
  // The usual amount; bills like energy change every month
  amount: number;
  variable: boolean;
};

export type FixedCostMonth = {
  costId: number;
  // First day of the month, YYYY-MM-01
  month: string;
  amount: number;
  paidDate: string | null;
  paymentMethod: PaymentMethod | null;
};

export const SAMPLE_COSTS: FixedCost[] = [
  { id: 1, name: "Aluguel da sede", supplier: "Imobiliária Central", dueDay: 5, amount: 1200, variable: false },
  { id: 2, name: "Internet", supplier: "Vivo Fibra", dueDay: 10, amount: 99.9, variable: false },
  { id: 3, name: "Contador", supplier: "Escritório Contábil Silva", dueDay: 10, amount: 350, variable: false },
  { id: 4, name: "Energia elétrica", supplier: "Enel", dueDay: 15, amount: 180, variable: true },
  { id: 5, name: "Água", supplier: "Sabesp", dueDay: 20, amount: 65, variable: true },
  { id: 6, name: "Seguro do imóvel", supplier: "Porto Seguro", dueDay: 25, amount: 89, variable: false },
];

// Energy and water bills of the last months, oldest first
const VARIABLE_AMOUNTS: Record<number, number[]> = {
  4: [162.4, 171.8, 158.2, 190.35, 204.1, 187.6],
  5: [58.9, 61.2, 66.75, 63.4, 71.05, 68.3],
};

export function monthsUpTo(today: string, count: number) {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(year, month - 1 - (count - 1 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  });
}

function dueDate(month: string, dueDay: number) {
  return `${month.slice(0, 8)}${String(dueDay).padStart(2, "0")}`;
}

// The last six months of every cost. Past months are paid on or around the
// due day, except the water bill in the third month; in the current month
// what was due before today is paid, except the accountant.
export function sampleMonths(today: string): FixedCostMonth[] {
  const months = monthsUpTo(today, 6);
  return months.flatMap((month, index) =>
    SAMPLE_COSTS.map((cost) => {
      const amount = VARIABLE_AMOUNTS[cost.id]?.[index] ?? cost.amount;
      const due = dueDate(month, cost.dueDay);
      const current = index === months.length - 1;
      const paid = current
        ? due < today && cost.id !== 3
        : !(index === 2 && cost.id === 5);
      return {
        costId: cost.id,
        month,
        amount,
        paidDate: paid ? due : null,
        paymentMethod: paid ? (cost.id === 6 ? "debit_card" : "pix") : null,
      };
    })
  );
}

export function isFixedCostLate(month: string, dueDay: number, today: string) {
  return dueDate(month, dueDay) < today;
}

export { dueDate as fixedCostDueDate };
