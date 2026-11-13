"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  entries,
  installments,
  items,
  kids,
  sales,
  stockMovements,
} from "@/db/schema";
import {
  NEW_KID,
  parseForm,
  paymentFormSchema,
  saleBuyerSchema,
  saleFormSchema,
} from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { fromCents, planInstallments, toCents } from "@/lib/installments";

export type SaleFormState = { error: string } | undefined;
export type PaymentFormState = { error: string } | undefined;

type Outcome<T> = { error: string } | T;

// Thrown inside a transaction to undo everything it wrote and show the message
class SaleError extends Error {}

function revalidateSales() {
  revalidatePath("/sales");
  revalidatePath("/kids");
  revalidatePath("/inventory");
  revalidatePath("/entries");
  revalidatePath("/dashboard");
}

export async function createSale(
  _prevState: SaleFormState,
  formData: FormData
): Promise<SaleFormState> {
  const session = await requireSession();
  const userId = Number(session.user.id);

  const kidChoice = formData.get("kidId");
  const buyer = parseForm(
    saleBuyerSchema,
    kidChoice === NEW_KID
      ? {
          kind: "new",
          name: formData.get("newKidName") ?? "",
          contact: formData.get("newKidContact") ?? undefined,
        }
      : { kind: "existing", kidId: kidChoice }
  );
  if (!buyer.ok) return { error: buyer.error };

  const result = parseForm(saleFormSchema, {
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    installmentCount: formData.get("installmentCount"),
    saleDate: formData.get("saleDate"),
    firstDueDate: formData.get("firstDueDate"),
    note: formData.get("note"),
  });
  if (!result.ok) return { error: result.error };

  const {
    itemId,
    quantity,
    unitPrice,
    installmentCount,
    saleDate,
    firstDueDate,
    note,
  } = result.data;
  const totalCents = toCents(unitPrice) * quantity;
  if (totalCents < installmentCount) {
    return { error: "Cada parcela precisa ter pelo menos R$ 0,01." };
  }

  let saleId: number;
  try {
    saleId = await db.transaction(async (tx) => {
      // Locking the item makes concurrent sales of the last units wait for each other
      const [item] = await tx
        .select({ id: items.id, name: items.name, tracksStock: items.tracksStock })
        .from(items)
        .where(eq(items.id, itemId))
        .for("update");
      if (!item) throw new SaleError("Este item não existe mais.");

      if (item.tracksStock) {
        const [{ stock }] = await tx
          .select({
            stock: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)::int`,
          })
          .from(stockMovements)
          .where(eq(stockMovements.itemId, itemId));
        if (quantity > stock) {
          throw new SaleError(
            `Estoque insuficiente: só há ${stock} ${stock === 1 ? "unidade" : "unidades"} de ${item.name}.`
          );
        }
      }

      const kidId = await resolveBuyer(tx, buyer.data);

      const [sale] = await tx
        .insert(sales)
        .values({
          kidId,
          itemId,
          quantity,
          unitPrice: unitPrice.toFixed(2),
          total: fromCents(totalCents),
          saleDate,
          note: note ? note : null,
          createdById: userId,
        })
        .returning({ id: sales.id });

      if (item.tracksStock) {
        await tx.insert(stockMovements).values({
          itemId,
          quantity: -quantity,
          reason: "sale",
          saleId: sale.id,
          movementDate: saleDate,
          createdById: userId,
        });
      }

      await tx.insert(installments).values(
        planInstallments(totalCents, installmentCount, firstDueDate).map(
          (installment) => ({
            saleId: sale.id,
            number: installment.number,
            amount: fromCents(installment.amountCents),
            dueDate: installment.dueDate,
          })
        )
      );

      return sale.id;
    });
  } catch (error) {
    if (error instanceof SaleError) return { error: error.message };
    throw error;
  }

  revalidateSales();
  redirect(`/sales/${saleId}`);
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// The kid of the sale: an existing one, or a new one registered in the same
// transaction, so a failed sale leaves no half-registered bandeirante behind
async function resolveBuyer(
  tx: Transaction,
  buyer: z.infer<typeof saleBuyerSchema>
) {
  if (buyer.kind === "existing") {
    const [kid] = await tx
      .select({ id: kids.id })
      .from(kids)
      .where(eq(kids.id, buyer.kidId));
    if (!kid) throw new SaleError("Este bandeirante não existe mais.");
    return kid.id;
  }

  const [existing] = await tx
    .select({ id: kids.id })
    .from(kids)
    .where(sql`lower(${kids.name}) = lower(${buyer.name})`);
  if (existing) {
    throw new SaleError(
      `Já existe um bandeirante chamado ${buyer.name}. Selecione-o na lista.`
    );
  }

  const [kid] = await tx
    .insert(kids)
    .values({ name: buyer.name, contact: buyer.contact ? buyer.contact : null })
    .returning({ id: kids.id });
  return kid.id;
}

// Removes the sale, its installments, the income entries of paid installments
// and gives the units back to the stock
export async function deleteSale(id: number) {
  await requireSession();

  await db.transaction(async (tx) => {
    const paid = await tx
      .select({ entryId: installments.entryId })
      .from(installments)
      .where(and(eq(installments.saleId, id), isNotNull(installments.entryId)));
    const entryIds = paid.map((row) => row.entryId!);
    if (entryIds.length > 0) {
      await tx.delete(entries).where(inArray(entries.id, entryIds));
    }
    await tx.delete(sales).where(eq(sales.id, id));
  });

  revalidateSales();
  redirect("/sales");
}

export async function payInstallment(
  installmentId: number,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const session = await requireSession();

  const result = parseForm(paymentFormSchema, { paidDate: formData.get("paidDate") });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome<{ saleId: number }>> => {
    const [installment] = await tx
      .select({
        id: installments.id,
        saleId: installments.saleId,
        number: installments.number,
        amount: installments.amount,
        entryId: installments.entryId,
        categoryId: items.categoryId,
        itemName: items.name,
        installmentCount: sql<number>`(
          select count(*)::int from installments sibling
          where sibling.sale_id = "installments"."sale_id"
        )`,
      })
      .from(installments)
      .innerJoin(sales, eq(sales.id, installments.saleId))
      .innerJoin(items, eq(items.id, sales.itemId))
      .where(eq(installments.id, installmentId))
      .for("update", { of: installments });
    if (!installment) return { error: "Esta parcela não existe mais." };
    if (installment.entryId) return { error: "Esta parcela já foi paga." };

    const [entry] = await tx
      .insert(entries)
      .values({
        type: "income",
        amount: installment.amount,
        categoryId: installment.categoryId,
        entryDate: result.data.paidDate,
        note: `Parcela ${installment.number}/${installment.installmentCount} - ${installment.itemName}`,
        createdById: Number(session.user.id),
      })
      .returning({ id: entries.id });

    await tx
      .update(installments)
      .set({ entryId: entry.id })
      .where(eq(installments.id, installmentId));

    return { saleId: installment.saleId };
  });

  if ("error" in outcome) return { error: outcome.error };

  revalidateSales();
  revalidatePath(`/sales/${outcome.saleId}`);
}

// Marks an installment as unpaid again by removing the income entry it created
export async function undoPayment(installmentId: number) {
  await requireSession();

  const [installment] = await db
    .select({ saleId: installments.saleId, entryId: installments.entryId })
    .from(installments)
    .where(eq(installments.id, installmentId));
  if (!installment?.entryId) return;

  // The foreign key sets installments.entry_id back to null
  await db.delete(entries).where(eq(entries.id, installment.entryId));

  revalidateSales();
  revalidatePath(`/sales/${installment.saleId}`);
}
