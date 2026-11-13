"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { entries } from "@/db/schema";
import { entryFormSchema } from "@/lib/validation";
import { requireSession } from "@/lib/dal";

export type CreateEntryState = { error: string } | undefined;

export async function createEntry(
  _prevState: CreateEntryState,
  formData: FormData
): Promise<CreateEntryState> {
  const session = await requireSession();

  const parsed = entryFormSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    entryDate: formData.get("entryDate"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { type, amount, category, entryDate, note } = parsed.data;

  await db.insert(entries).values({
    type,
    amount: amount.toFixed(2),
    category,
    entryDate,
    note: note ? note : null,
    createdById: Number(session.user.id),
  });

  revalidatePath("/dashboard");
  revalidatePath("/entries");
  redirect("/entries");
}
