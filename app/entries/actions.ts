"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { entryFormSchema } from "@/lib/validation";
import { requireSession } from "@/lib/dal";

export type EntryFormState = { error: string } | undefined;

function parseEntryForm(formData: FormData) {
  const parsed = entryFormSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    entryDate: formData.get("entryDate"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    } as const;
  }

  const { type, amount, category, entryDate, note } = parsed.data;
  return {
    ok: true,
    values: {
      type,
      amount: amount.toFixed(2),
      category,
      entryDate,
      note: note ? note : null,
    },
  } as const;
}

function revalidateEntries() {
  revalidatePath("/dashboard");
  revalidatePath("/entries");
}

export async function createEntry(
  _prevState: EntryFormState,
  formData: FormData
): Promise<EntryFormState> {
  const session = await requireSession();

  const result = parseEntryForm(formData);
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

  const result = parseEntryForm(formData);
  if (!result.ok) return { error: result.error };

  const updated = await db
    .update(entries)
    .set(result.values)
    .where(eq(entries.id, id))
    .returning({ id: entries.id });
  if (updated.length === 0) {
    return { error: "Este lançamento não existe mais." };
  }

  revalidateEntries();
  redirect("/entries");
}

export async function deleteEntry(id: number) {
  await requireSession();

  await db.delete(entries).where(eq(entries.id, id));

  revalidateEntries();
  redirect("/entries");
}
