"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne, TransactionRollbackError } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { categories, entries, items, sales, stockMovements } from "@/db/schema";
import {
  itemFormSchema,
  parseForm,
  stockMovementFormSchema,
} from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { todayISO } from "@/lib/format";
import { getShopCategoryId } from "@/lib/categories";

export type ItemFormState = { error: string } | undefined;
export type StockMovementFormState = { error?: string; saved?: number } | undefined;

function parseItemForm(formData: FormData) {
  const result = parseForm(itemFormSchema, {
    name: formData.get("name"),
    price: formData.get("price"),
    tracksStock: formData.get("tracksStock") === "on",
  });
  if (!result.ok) return result;
  const { name, price, tracksStock } = result.data;
  return {
    ok: true,
    values: { name, price: price.toFixed(2), tracksStock },
  } as const;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Inserts a stock movement and, when something was paid for it, the matching
// cost entry
async function recordStockMovement(
  tx: Transaction,
  {
    itemId,
    itemName,
    userId,
    reason,
    quantity,
    movementDate,
    note,
    cost,
    supplier,
    costCategoryId,
  }: z.infer<typeof stockMovementFormSchema> & {
    itemId: number;
    itemName: string;
    userId: number;
  }
): Promise<{ error?: string }> {
  let entryId: number | null = null;
  if (cost !== undefined && costCategoryId !== undefined) {
    const [category] = await tx
      .select({
        requiresKid: categories.requiresKid,
        allowsManualEntry: categories.allowsManualEntry,
      })
      .from(categories)
      .where(eq(categories.id, costCategoryId));
    if (!category?.allowsManualEntry || category.requiresKid) {
      return { error: "Escolha outra categoria para a saída." };
    }

    const [entry] = await tx
      .insert(entries)
      .values({
        type: "cost",
        amount: cost.toFixed(2),
        categoryId: costCategoryId,
        counterparty: supplier ? supplier : null,
        entryDate: movementDate,
        note: `Reposição: ${quantity} × ${itemName}`,
        createdById: userId,
      })
      .returning({ id: entries.id });
    entryId = entry.id;
  }

  await tx.insert(stockMovements).values({
    itemId,
    reason,
    quantity,
    movementDate,
    entryId,
    note: note ? note : null,
    createdById: userId,
  });
  return {};
}

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/categories");
  revalidatePath("/sales");
}

export async function createItem(
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const session = await requireSession();

  const result = parseItemForm(formData);
  if (!result.ok) return { error: result.error };

  const initialStock = Number(formData.get("initialStock") || 0);
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    return { error: "A quantidade inicial deve ser um número inteiro." };
  }

  // The initial stock is a restock, so what was paid for it is validated and
  // recorded the same way
  const hasInitialStock = result.values.tracksStock && initialStock > 0;
  if (!hasInitialStock && formData.get("cost")) {
    return { error: "Informe a quantidade inicial que foi paga." };
  }
  const restock = hasInitialStock
    ? parseForm(stockMovementFormSchema, {
        reason: "restock",
        quantity: initialStock,
        movementDate: todayISO(),
        note: "Estoque inicial",
        cost: formData.get("cost") ?? undefined,
        supplier: formData.get("supplier") ?? undefined,
        costCategoryId: formData.get("costCategoryId") ?? undefined,
      })
    : undefined;
  if (restock && !restock.ok) return { error: restock.error };

  const categoryId = await getShopCategoryId();
  if (!categoryId) return { error: "A categoria Lojinha não existe mais." };

  let error: string | undefined;
  await db
    .transaction(async (tx) => {
      const [item] = await tx
        .insert(items)
        .values({ ...result.values, categoryId })
        .returning({ id: items.id });

      if (restock) {
        ({ error } = await recordStockMovement(tx, {
          ...restock.data,
          itemId: item.id,
          itemName: result.values.name,
          userId: Number(session.user.id),
        }));
        // Drops the new item too
        if (error) tx.rollback();
      }
    })
    .catch((reason) => {
      if (!(reason instanceof TransactionRollbackError)) throw reason;
    });
  if (error) return { error };

  if (restock?.data.cost !== undefined) {
    revalidatePath("/entries");
    revalidatePath("/dashboard");
  }
  revalidateInventory();
  redirect("/inventory");
}

export async function updateItem(
  id: number,
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  await requireSession();

  const result = parseItemForm(formData);
  if (!result.ok) return { error: result.error };

  const updated = await db
    .update(items)
    .set(result.values)
    .where(eq(items.id, id))
    .returning({ id: items.id });
  if (updated.length === 0) return { error: "Este item não existe mais." };

  revalidateInventory();
  redirect("/inventory");
}

export async function deleteItem(id: number) {
  await requireSession();

  const [sale] = await db
    .select({ id: sales.id })
    .from(sales)
    .where(eq(sales.itemId, id))
    .limit(1);
  if (sale) {
    throw new Error("Este item tem vendas registradas e não pode ser excluído.");
  }

  await db.delete(items).where(eq(items.id, id));

  revalidateInventory();
  redirect("/inventory");
}

export async function addStockMovement(
  itemId: number,
  _prevState: StockMovementFormState,
  formData: FormData
): Promise<StockMovementFormState> {
  const session = await requireSession();
  const userId = Number(session.user.id);

  // Cost fields only exist on the form for restocks
  const result = parseForm(stockMovementFormSchema, {
    reason: formData.get("reason"),
    quantity: formData.get("quantity"),
    movementDate: formData.get("movementDate"),
    note: formData.get("note"),
    cost: formData.get("cost") ?? undefined,
    supplier: formData.get("supplier") ?? undefined,
    costCategoryId: formData.get("costCategoryId") ?? undefined,
  });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx) => {
    const [item] = await tx
      .select({ name: items.name })
      .from(items)
      .where(eq(items.id, itemId));
    if (!item) return { error: "Este item não existe mais." };

    return recordStockMovement(tx, {
      ...result.data,
      itemId,
      itemName: item.name,
      userId,
    });
  });
  if (outcome.error) return { error: outcome.error };

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  return { saved: Date.now() };
}

// Fixes a mistaken restock or adjustment. Sale movements go away with their sale.
export async function deleteStockMovement(id: number) {
  await requireSession();

  const [movement] = await db.transaction(async (tx) => {
    const deleted = await tx
      .delete(stockMovements)
      .where(and(eq(stockMovements.id, id), ne(stockMovements.reason, "sale")))
      .returning({
        itemId: stockMovements.itemId,
        entryId: stockMovements.entryId,
      });
    if (deleted[0]?.entryId) {
      await tx.delete(entries).where(eq(entries.id, deleted[0].entryId));
    }
    return deleted;
  });
  if (!movement) return;

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${movement.itemId}`);
  revalidatePath("/entries");
  revalidatePath("/dashboard");
}
