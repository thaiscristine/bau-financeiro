"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { and, eq, gt, gte, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { entries, fixedCostMonths, fixedCosts } from "@/db/schema";
import {
  fixedCostFormSchema,
  fixedCostPaymentFormSchema,
  fixedCostStartSchema,
  parseForm,
} from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { fixedCostsCategoryId } from "@/lib/categories";
import { currentMonth, ensureFixedCostMonths } from "@/lib/fixed-costs";
import { formatMonth, todayISO } from "@/lib/format";
import type { PaymentFormState } from "@/app/(app)/sales/actions";

export type FixedCostFormState = { error?: string; saved?: number } | undefined;

type Outcome = { error: string } | { costId: number };

// Every fixed cost screen, and the ones that show the entries they record
function revalidateFixedCosts() {
  revalidatePath("/fixed-costs", "layout");
  revalidatePath("/entries");
  revalidatePath("/dashboard");
}

function parseFixedCostForm(formData: FormData) {
  return parseForm(fixedCostFormSchema, {
    name: formData.get("name"),
    supplier: formData.get("supplier"),
    dueDay: formData.get("dueDay"),
    amount: formData.get("amount"),
    variable: formData.get("variable"),
  });
}

function fixedCostValues({ name, supplier, dueDay, amount, variable }: z.infer<typeof fixedCostFormSchema>) {
  return { name, supplier: supplier ? supplier : null, dueDay, amount: amount.toFixed(2), variable };
}

export async function createFixedCost(
  _prevState: FixedCostFormState,
  formData: FormData
): Promise<FixedCostFormState> {
  await requireSession();

  const result = parseFixedCostForm(formData);
  if (!result.ok) return { error: result.error };
  const start = parseForm(fixedCostStartSchema, { startMonth: formData.get("startMonth") });
  if (!start.ok) return { error: start.error };

  const today = todayISO();
  const startMonth = `${start.data.startMonth}-01`;
  if (startMonth > currentMonth(today)) {
    return { error: "O primeiro pagamento não pode ser num mês que ainda não chegou." };
  }

  await db.insert(fixedCosts).values({ ...fixedCostValues(result.data), startMonth });
  await ensureFixedCostMonths(today);

  revalidateFixedCosts();
  return { saved: Date.now() };
}

// The new amount applies to the unpaid months from the current one on; the
// past stays as it was charged
export async function updateFixedCost(
  id: number,
  _prevState: FixedCostFormState,
  formData: FormData
): Promise<FixedCostFormState> {
  await requireSession();

  const result = parseFixedCostForm(formData);
  if (!result.ok) return { error: result.error };
  const values = fixedCostValues(result.data);

  const outcome = await db.transaction(async (tx): Promise<Outcome> => {
    const updated = await tx
      .update(fixedCosts)
      .set(values)
      .where(eq(fixedCosts.id, id))
      .returning({ id: fixedCosts.id });
    if (updated.length === 0) return { error: "Este custo fixo não existe mais." };

    await tx
      .update(fixedCostMonths)
      .set({ amount: values.amount })
      .where(
        and(
          eq(fixedCostMonths.fixedCostId, id),
          isNull(fixedCostMonths.entryId),
          gte(fixedCostMonths.month, currentMonth(todayISO()))
        )
      );
    return { costId: id };
  });
  if ("error" in outcome) return { error: outcome.error };

  revalidateFixedCosts();
  return { saved: Date.now() };
}

// Stops charging after the current month, which is still charged. Reopening
// is only for a cost ended this month, by mistake: later, the months in
// between would be charged, so the cost is registered again instead.
export async function setFixedCostEnded(id: number, ended: boolean) {
  await requireSession();
  const month = currentMonth(todayISO());

  await db.transaction(async (tx) => {
    if (ended) {
      await tx
        .update(fixedCosts)
        .set({ endMonth: month })
        .where(and(eq(fixedCosts.id, id), isNull(fixedCosts.endMonth)));
      await tx
        .delete(fixedCostMonths)
        .where(
          and(
            eq(fixedCostMonths.fixedCostId, id),
            isNull(fixedCostMonths.entryId),
            gt(fixedCostMonths.month, month)
          )
        );
    } else {
      await tx
        .update(fixedCosts)
        .set({ endMonth: null })
        .where(and(eq(fixedCosts.id, id), eq(fixedCosts.endMonth, month)));
    }
  });

  revalidateFixedCosts();
}

// Only a cost that was never paid can go; one with payments is ended instead,
// so its entries keep pointing to it
export async function deleteFixedCost(id: number) {
  await requireSession();

  const [paid] = await db
    .select({ id: fixedCostMonths.id })
    .from(fixedCostMonths)
    .where(and(eq(fixedCostMonths.fixedCostId, id), isNotNull(fixedCostMonths.entryId)))
    .limit(1);
  if (!paid) await db.delete(fixedCosts).where(eq(fixedCosts.id, id));

  revalidateFixedCosts();
  redirect("/fixed-costs");
}

// Records the cost entry for a month, at the amount actually paid
export async function payFixedCostMonth(
  monthId: number,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const session = await requireSession();

  const result = parseForm(fixedCostPaymentFormSchema, {
    paidDate: formData.get("paidDate"),
    paymentMethod: formData.get("paymentMethod"),
    amount: formData.get("amount"),
  });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome> => {
    const [row] = await tx
      .select({
        entryId: fixedCostMonths.entryId,
        month: fixedCostMonths.month,
        costId: fixedCosts.id,
        name: fixedCosts.name,
        supplier: fixedCosts.supplier,
      })
      .from(fixedCostMonths)
      .innerJoin(fixedCosts, eq(fixedCosts.id, fixedCostMonths.fixedCostId))
      .where(eq(fixedCostMonths.id, monthId))
      .for("update", { of: fixedCostMonths });
    if (!row) return { error: "Este mês não existe mais." };
    if (row.entryId) return { error: "Este mês já foi pago." };

    const amount = result.data.amount.toFixed(2);
    const [entry] = await tx
      .insert(entries)
      .values({
        type: "cost",
        amount,
        categoryId: await fixedCostsCategoryId(tx),
        counterparty: row.supplier,
        paymentMethod: result.data.paymentMethod,
        entryDate: result.data.paidDate,
        note: `${row.name} de ${formatMonth(row.month.slice(0, 7)).toLowerCase()}`,
        createdById: Number(session.user.id),
      })
      .returning({ id: entries.id });

    await tx
      .update(fixedCostMonths)
      .set({ entryId: entry.id, amount })
      .where(eq(fixedCostMonths.id, monthId));
    return { costId: row.costId };
  });

  if ("error" in outcome) return { error: outcome.error };
  revalidateFixedCosts();
  return { paid: true };
}

// Back to unpaid, removing the cost entry the payment created
export async function undoFixedCostMonth(monthId: number) {
  await requireSession();

  const [row] = await db
    .select({ entryId: fixedCostMonths.entryId })
    .from(fixedCostMonths)
    .where(eq(fixedCostMonths.id, monthId));
  if (!row?.entryId) return;

  // The foreign key sets fixed_cost_months.entry_id back to null
  await db.delete(entries).where(eq(entries.id, row.entryId));

  revalidateFixedCosts();
}
