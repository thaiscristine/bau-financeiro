"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { entries, kids, sales } from "@/db/schema";
import { kidFormSchema, parseForm } from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { paysMonthlyFee } from "@/lib/age-groups";
import { syncKidContributions } from "@/lib/contributions";
import { todayISO } from "@/lib/format";

export type KidFormState = { error?: string; saved?: number } | undefined;

function parseKidForm(formData: FormData) {
  const result = parseForm(kidFormSchema, {
    name: formData.get("name"),
    contact: formData.get("contact"),
    ageGroup: formData.get("ageGroup"),
    // Only rendered for the age groups that pay one
    monthlyFee: formData.get("monthlyFee") ?? undefined,
    isMinor: formData.get("isMinor") === "on",
    // The form only renders these when the box is ticked, so they can be missing
    guardianName: formData.get("guardianName") ?? undefined,
    guardianPhone: formData.get("guardianPhone") ?? undefined,
  });
  if (!result.ok) return result;
  const { name, contact, ageGroup, monthlyFee, isMinor, guardianName, guardianPhone } =
    result.data;
  return {
    ok: true,
    values: {
      name,
      contact: contact ? contact : null,
      ageGroup: ageGroup ?? null,
      monthlyFee:
        monthlyFee !== undefined && paysMonthlyFee(ageGroup) ? monthlyFee.toFixed(2) : null,
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

  await db.transaction(async (tx) => {
    const [kid] = await tx.insert(kids).values(result.values).returning({ id: kids.id });
    await syncKidContributions(tx, kid.id, null, result.values, todayISO());
  });

  revalidatePath("/kids");
  revalidatePath("/dashboard");
  return { saved: Date.now() };
}

export async function updateKid(
  id: number,
  _prevState: KidFormState,
  formData: FormData
): Promise<KidFormState> {
  await requireSession();

  const result = parseKidForm(formData);
  if (!result.ok) return { error: result.error };

  const found = await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ ageGroup: kids.ageGroup, monthlyFee: kids.monthlyFee })
      .from(kids)
      .where(eq(kids.id, id))
      .for("update");
    if (!before) return false;
    await tx.update(kids).set(result.values).where(eq(kids.id, id));
    await syncKidContributions(tx, id, before, result.values, todayISO());
    return true;
  });
  if (!found) return { error: "Este bandeirante não existe mais." };

  revalidatePath("/kids");
  revalidatePath(`/kids/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  // The form stays on this page and confirms the save. A new value each save
  // shows the confirmation again after further edits.
  return { saved: Date.now() };
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
