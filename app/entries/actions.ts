"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  entries,
  installments,
  kids,
  stockMovements,
} from "@/db/schema";
import { entryFormSchema, parseForm } from "@/lib/validation";
import { requireSession } from "@/lib/dal";

export type EntryFormState = { error: string } | undefined;

const MANAGED_ELSEWHERE =
  "Este lançamento foi criado por uma venda ou reposição de estoque. Altere-o por lá.";

// Validates the form and the rules of the chosen category. An entry that already
// had a category closed to manual entries may keep it when edited.
async function parseEntryForm(formData: FormData, currentCategoryId?: number) {
  const result = parseForm(entryFormSchema, {
    type: formData.get("type"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    counterparty: formData.get("counterparty") ?? undefined,
    kidId: formData.get("kidId") || undefined,
    entryDate: formData.get("entryDate"),
    note: formData.get("note"),
  });
  if (!result.ok) return result;

  const { type, amount, categoryId, counterparty, kidId, entryDate, note } =
    result.data;

  const [category] = await db
    .select({
      name: categories.name,
      requiresKid: categories.requiresKid,
      allowsManualEntry: categories.allowsManualEntry,
    })
    .from(categories)
    .where(eq(categories.id, categoryId));
  if (!category) return { ok: false, error: "Esta categoria não existe mais." } as const;

  if (!category.allowsManualEntry && categoryId !== currentCategoryId) {
    return {
      ok: false,
      error: `${category.name} é registrada pela tela Vendas, para o estoque ser atualizado.`,
    } as const;
  }

  if (category.requiresKid) {
    if (!kidId) {
      return { ok: false, error: `Selecione o bandeirante da ${category.name.toLowerCase()}.` } as const;
    }
    const [kid] = await db.select({ id: kids.id }).from(kids).where(eq(kids.id, kidId));
    if (!kid) return { ok: false, error: "Este bandeirante não existe mais." } as const;
  }

  return {
    ok: true,
    values: {
      type,
      amount: amount.toFixed(2),
      categoryId,
      // A kid replaces the typed name; other categories don't link a kid
      kidId: category.requiresKid ? kidId! : null,
      counterparty: !category.requiresKid && counterparty ? counterparty : null,
      entryDate,
      note: note ? note : null,
    },
  } as const;
}

// Installment payments and restock purchases are changed from where they were created
async function isManagedElsewhere(id: number) {
  const [[installment], [movement]] = await Promise.all([
    db
      .select({ id: installments.id })
      .from(installments)
      .where(eq(installments.entryId, id))
      .limit(1),
    db
      .select({ id: stockMovements.id })
      .from(stockMovements)
      .where(eq(stockMovements.entryId, id))
      .limit(1),
  ]);
  return Boolean(installment || movement);
}

function revalidateEntries() {
  revalidatePath("/dashboard");
  revalidatePath("/entries");
  revalidatePath("/kids");
}

export async function createEntry(
  _prevState: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  const session = await requireSession();

  const result = await parseEntryForm(formData);
  if (!result.ok) return { error: result.error };

  await db.insert(entries).values({
    ...result.values,
    createdById: Number(session.user.id),
  });

  revalidateEntries();
  redirect("/entries");
}

export async function updateEntry(
  id: number,
  _prevState: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  await requireSession();

  const [current] = await db
    .select({ categoryId: entries.categoryId })
    .from(entries)
    .where(eq(entries.id, id));
  if (!current) return { error: "Este lançamento não existe mais." };

  if (await isManagedElsewhere(id)) return { error: MANAGED_ELSEWHERE };

  const result = await parseEntryForm(formData, current.categoryId);
  if (!result.ok) return { error: result.error };

  await db.update(entries).set(result.values).where(eq(entries.id, id));

  revalidateEntries();
  redirect("/entries");
}

export async function deleteEntry(id: number) {
  await requireSession();

  if (await isManagedElsewhere(id)) throw new Error(MANAGED_ELSEWHERE);

  await db.delete(entries).where(eq(entries.id, id));

  revalidateEntries();
  redirect("/entries");
}
