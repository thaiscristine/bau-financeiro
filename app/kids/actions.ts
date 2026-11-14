"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, kids, sales } from "@/db/schema";
import { kidFormSchema, parseForm } from "@/lib/validation";
import { requireSession } from "@/lib/dal";

export type KidFormState = { error: string } | undefined;

function parseKidForm(formData: FormData) {
  const result = parseForm(kidFormSchema, {
    name: formData.get("name"),
    contact: formData.get("contact"),
    isMinor: formData.get("isMinor") === "on",
    // The form only renders these when the box is ticked, so they can be missing
    guardianName: formData.get("guardianName") ?? undefined,
    guardianPhone: formData.get("guardianPhone") ?? undefined,
  });
  if (!result.ok) return result;
  const { name, contact, isMinor, guardianName, guardianPhone } = result.data;
  return {
    ok: true,
    values: {
      name,
      contact: contact ? contact : null,
      isMinor,
      // An adult has no responsible person on file
      guardianName: isMinor ? guardianName! : null,
      guardianPhone: isMinor ? guardianPhone! : null,
    },
  } as const;
}

export async function createKid(
  _prevState: KidFormState,
  formData: FormData
): Promise<KidFormState> {
  await requireSession();

  const result = parseKidForm(formData);
  if (!result.ok) return { error: result.error };

  await db.insert(kids).values(result.values);

  revalidatePath("/kids");
  redirect("/kids");
}

export async function updateKid(
  id: number,
  _prevState: KidFormState,
  formData: FormData
): Promise<KidFormState> {
  await requireSession();

  const result = parseKidForm(formData);
  if (!result.ok) return { error: result.error };

  const updated = await db
    .update(kids)
    .set(result.values)
    .where(eq(kids.id, id))
    .returning({ id: kids.id });
  if (updated.length === 0) return { error: "Este bandeirante não existe mais." };

  revalidatePath("/kids");
  revalidatePath("/sales");
  redirect(`/kids/${id}`);
}

export async function deleteKid(id: number) {
  await requireSession();

  const [[sale], [entry]] = await Promise.all([
    db.select({ id: sales.id }).from(sales).where(eq(sales.kidId, id)).limit(1),
    db.select({ id: entries.id }).from(entries).where(eq(entries.kidId, id)).limit(1),
  ]);
  if (sale || entry) {
    throw new Error(
      "Este bandeirante tem vendas ou contribuições registradas e não pode ser excluído."
    );
  }

  await db.delete(kids).where(eq(kids.id, id));

  revalidatePath("/kids");
  redirect("/kids");
}
