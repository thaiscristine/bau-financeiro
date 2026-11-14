"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contributions, entries } from "@/db/schema";
import { contributionCategoryId } from "@/lib/contributions";
import { formatMonth } from "@/lib/format";
import {
  contributionLinkFormSchema,
  parseForm,
  paymentFormSchema,
} from "@/lib/validation";
import { requireSession } from "@/lib/dal";

// paid tells the payment form to celebrate, like a paid installment
export type ContributionFormState = { error?: string; paid?: boolean } | undefined;

type Outcome = { error: string } | { kidId: number };

function revalidateContributions(kidId: number) {
  revalidatePath(`/kids/${kidId}`);
  revalidatePath("/entries");
  revalidatePath("/dashboard");
}

// Records the income entry for a month, like paying an installment
export async function payContribution(
  contributionId: number,
  _prevState: ContributionFormState,
  formData: FormData
): Promise<ContributionFormState> {
  const session = await requireSession();

  const result = parseForm(paymentFormSchema, { paidDate: formData.get("paidDate") });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome> => {
    const [contribution] = await tx
      .select()
      .from(contributions)
      .where(eq(contributions.id, contributionId))
      .for("update");
    if (!contribution) return { error: "Este mês não existe mais." };
    if (contribution.entryId) return { error: "Este mês já foi pago." };
    if (!contribution.due) return { error: "Este mês não está sendo cobrado." };

    const categoryId = await contributionCategoryId(tx);
    if (!categoryId) {
      return {
        error: "Marque uma categoria como \"exige bandeirante\" em Categorias para registrar contribuições.",
      };
    }

    const [entry] = await tx
      .insert(entries)
      .values({
        type: "income",
        amount: contribution.amount,
        categoryId,
        kidId: contribution.kidId,
        entryDate: result.data.paidDate,
        note: `Contribuição de ${formatMonth(contribution.month.slice(0, 7)).toLowerCase()}`,
        createdById: Number(session.user.id),
      })
      .returning({ id: entries.id });

    await tx
      .update(contributions)
      .set({ entryId: entry.id, linkedEntry: false })
      .where(eq(contributions.id, contributionId));

    return { kidId: contribution.kidId };
  });

  if ("error" in outcome) return { error: outcome.error };
  revalidateContributions(outcome.kidId);
  return { paid: true };
}

// Marks a month as unpaid again. The entry the payment created is removed; an
// entry that was linked by hand stays, back among the unlinked ones.
export async function undoContribution(contributionId: number) {
  await requireSession();

  const kidId = await db.transaction(async (tx) => {
    const [contribution] = await tx
      .select()
      .from(contributions)
      .where(eq(contributions.id, contributionId))
      .for("update");
    if (!contribution?.entryId) return contribution?.kidId;

    if (contribution.linkedEntry) {
      await tx
        .update(contributions)
        .set({ entryId: null, linkedEntry: false })
        .where(eq(contributions.id, contributionId));
    } else {
      // The foreign key sets contributions.entry_id back to null
      await tx.delete(entries).where(eq(entries.id, contribution.entryId));
    }
    return contribution.kidId;
  });

  if (kidId) revalidateContributions(kidId);
}

// Charges a month or lets the kid off it, in exceptional cases. Paid months
// stay as they are.
export async function setContributionDue(contributionId: number, due: boolean) {
  await requireSession();

  const [row] = await db
    .update(contributions)
    .set({ due })
    .where(and(eq(contributions.id, contributionId), isNull(contributions.entryId)))
    .returning({ kidId: contributions.kidId });

  if (row) revalidateContributions(row.kidId);
}

// Says which month an existing contribution entry paid
export async function linkContributionEntry(
  entryId: number,
  _prevState: ContributionFormState,
  formData: FormData
): Promise<ContributionFormState> {
  await requireSession();

  const result = parseForm(contributionLinkFormSchema, {
    contributionId: formData.get("contributionId"),
  });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome> => {
    const [entry] = await tx
      .select({ kidId: entries.kidId })
      .from(entries)
      .where(eq(entries.id, entryId));
    if (!entry?.kidId) return { error: "Esta contribuição não existe mais." };

    const [linked] = await tx
      .select({ id: contributions.id })
      .from(contributions)
      .where(eq(contributions.entryId, entryId));
    if (linked) return { error: "Esta contribuição já está ligada a um mês." };

    const [contribution] = await tx
      .select()
      .from(contributions)
      .where(eq(contributions.id, result.data.contributionId))
      .for("update");
    if (!contribution || contribution.kidId !== entry.kidId) {
      return { error: "Este mês não existe mais." };
    }
    if (contribution.entryId) return { error: "Este mês já foi pago." };

    await tx
      .update(contributions)
      .set({ entryId, linkedEntry: true, due: true })
      .where(eq(contributions.id, contribution.id));

    return { kidId: entry.kidId };
  });

  if ("error" in outcome) return { error: outcome.error };
  revalidateContributions(outcome.kidId);
}
