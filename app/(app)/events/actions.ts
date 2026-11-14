"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  entries,
  eventCharges,
  eventExpenses,
  eventInstallments,
  eventParticipants,
  events,
  kids,
} from "@/db/schema";
import {
  chargeSignUpFormSchema,
  eventChargeFormSchema,
  eventExpenseFormSchema,
  eventFormSchema,
  GUEST,
  parseForm,
  participantFormSchema,
  participantFundFormSchema,
  participantSchema,
  paymentFormSchema,
} from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { eventsCategoryId } from "@/lib/categories";
import { fromCents, planInstallments, replanUnpaid, toCents } from "@/lib/installments";
import { formatBRL, todayISO } from "@/lib/format";
import { FUND_NAME } from "@/lib/fund";
import { pgErrorCode, PG_UNIQUE_VIOLATION } from "@/lib/db-errors";
import type { PaymentFormState } from "@/app/(app)/sales/actions";

export type EventFormState = { error?: string; saved?: number } | undefined;

type Outcome<T> = { error: string } | T;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Every event screen, and the ones that show the entries events record
function revalidateEvents() {
  revalidatePath("/events", "layout");
  revalidatePath("/entries");
  revalidatePath("/dashboard");
  revalidatePath("/kids", "layout");
}

function parseEventForm(formData: FormData) {
  return parseForm(eventFormSchema, {
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    price: formData.get("price"),
    note: formData.get("note"),
  });
}

function eventValues({ name, startDate, endDate, price, note }: z.infer<typeof eventFormSchema>) {
  return {
    name,
    startDate,
    endDate: endDate ?? null,
    price: price.toFixed(2),
    note: note ? note : null,
  };
}

export async function createEvent(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const result = parseEventForm(formData);
  if (!result.ok) return { error: result.error };

  const [event] = await db
    .insert(events)
    .values(eventValues(result.data))
    .returning({ id: events.id });

  revalidateEvents();
  redirect(`/events/${event.id}`);
}

// Changing the price only affects people signed up from now on
export async function updateEvent(
  id: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const result = parseEventForm(formData);
  if (!result.ok) return { error: result.error };

  const updated = await db
    .update(events)
    .set(eventValues(result.data))
    .where(eq(events.id, id))
    .returning({ id: events.id });
  if (updated.length === 0) return { error: "Este evento não existe mais." };

  revalidateEvents();
  return { saved: Date.now() };
}

// The income entries of paid installments and the cost entries of paid
// expenses go with the event; the rest cascades
export async function deleteEvent(id: number) {
  await requireSession();

  await db.transaction(async (tx) => {
    const paidInstallments = await tx
      .select({ entryId: eventInstallments.entryId })
      .from(eventInstallments)
      .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
      .where(and(eq(eventParticipants.eventId, id), isNotNull(eventInstallments.entryId)));
    const paidExpenses = await tx
      .select({ entryId: eventExpenses.entryId })
      .from(eventExpenses)
      .where(and(eq(eventExpenses.eventId, id), isNotNull(eventExpenses.entryId)));
    await deleteEntries(tx, [...paidInstallments, ...paidExpenses]);
    await tx.delete(events).where(eq(events.id, id));
  });

  revalidateEvents();
  redirect("/events");
}

async function deleteEntries(tx: Transaction, rows: { entryId: number | null }[]) {
  const entryIds = rows.map((row) => row.entryId!);
  if (entryIds.length > 0) {
    await tx.delete(entries).where(inArray(entries.id, entryIds));
  }
}

export async function signUpParticipant(
  eventId: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const choice = formData.get("kidId");
  const who = parseForm(
    participantSchema,
    choice === GUEST
      ? { kind: "guest", guestName: formData.get("guestName") ?? "" }
      : { kind: "kid", kidId: choice }
  );
  if (!who.ok) return { error: who.error };

  const result = parseForm(participantFormSchema, {
    total: formData.get("total"),
    installmentCount: formData.get("installmentCount"),
    firstDueDate: formData.get("firstDueDate"),
    note: formData.get("note"),
    fundStatus: formData.get("fundStatus"),
    fundAmount: formData.get("fundAmount"),
  });
  if (!result.ok) return { error: result.error };

  const { total, installmentCount, firstDueDate, note, fundStatus } = result.data;
  const totalCents = toCents(total);
  const grantCents = fundStatus === "granted" ? toCents(result.data.fundAmount!) : 0;
  if (grantCents > totalCents) {
    return { error: `O ${FUND_NAME} não pode conceder mais que o valor (${formatBRL(total)}).` };
  }
  // What the participant pays; nothing when the fund covers the whole fee
  const owedCents = totalCents - grantCents;
  if (owedCents > 0 && owedCents < installmentCount) {
    return { error: "Cada parcela precisa ter pelo menos R$ 0,01." };
  }

  try {
    const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
      const [event] = await tx
        .select({ id: events.id })
        .from(events)
        .where(eq(events.id, eventId));
      if (!event) return { error: "Este evento não existe mais." };

      if (who.data.kind === "kid") {
        const [kid] = await tx
          .select({ id: kids.id })
          .from(kids)
          .where(eq(kids.id, who.data.kidId));
        if (!kid) return { error: "Este bandeirante não existe mais." };
      }

      const [participant] = await tx
        .insert(eventParticipants)
        .values({
          eventId,
          kidId: who.data.kind === "kid" ? who.data.kidId : null,
          guestName: who.data.kind === "guest" ? who.data.guestName : null,
          total: fromCents(totalCents),
          fundStatus: fundStatus ?? null,
          fundAmount: grantCents > 0 ? fromCents(grantCents) : null,
          note: note ? note : null,
        })
        .returning({ id: eventParticipants.id });

      if (owedCents > 0) {
        await tx.insert(eventInstallments).values(
          planInstallments(owedCents, installmentCount, firstDueDate).map((installment) => ({
            participantId: participant.id,
            number: installment.number,
            amount: fromCents(installment.amountCents),
            dueDate: installment.dueDate,
          }))
        );
      }
      return null;
    });
    if (outcome) return outcome;
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return { error: "Este bandeirante já está inscrito no evento." };
    }
    throw error;
  }

  revalidateEvents();
  return { saved: Date.now() };
}

// Records the Fundo Lisah request or decision. A grant comes off what is still
// to pay: the unpaid installments are re-planned around it, keeping their due
// dates, and the paid ones stay as they were.
export async function updateParticipantFund(
  participantId: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const result = parseForm(participantFundFormSchema, {
    fundStatus: formData.get("fundStatus"),
    fundAmount: formData.get("fundAmount"),
  });
  if (!result.ok) return { error: result.error };
  const { fundStatus } = result.data;
  const grantCents = fundStatus === "granted" ? toCents(result.data.fundAmount!) : 0;

  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    // Locked so a payment of one of its installments waits for the re-plan
    const [participant] = await tx
      .select({ total: eventParticipants.total })
      .from(eventParticipants)
      .where(eq(eventParticipants.id, participantId))
      .for("update");
    if (!participant) return { error: "Esta inscrição não existe mais." };

    const rows = await tx
      .select({
        id: eventInstallments.id,
        number: eventInstallments.number,
        amount: eventInstallments.amount,
        entryId: eventInstallments.entryId,
      })
      .from(eventInstallments)
      // The fee's; the fund does not cover the extra charges
      .where(
        and(eq(eventInstallments.participantId, participantId), isNull(eventInstallments.chargeId))
      )
      .orderBy(asc(eventInstallments.number))
      .for("update");

    const totalCents = toCents(participant.total);
    const paidCents = rows
      .filter((row) => row.entryId !== null)
      .reduce((sum, row) => sum + toCents(row.amount), 0);
    const remainingCents = totalCents - grantCents - paidCents;
    if (remainingCents < 0) {
      return {
        error: `O ${FUND_NAME} pode cobrir no máximo ${formatBRL((totalCents - paidCents) / 100)}, o que ainda falta pagar.`,
      };
    }

    const plan = replanUnpaid(
      remainingCents,
      rows.filter((row) => row.entryId === null).map((row) => row.id)
    );
    for (const { id, amountCents } of plan.update) {
      await tx
        .update(eventInstallments)
        .set({ amount: fromCents(amountCents) })
        .where(eq(eventInstallments.id, id));
    }
    if (plan.remove.length > 0) {
      await tx.delete(eventInstallments).where(inArray(eventInstallments.id, plan.remove));
    }
    if (plan.addCents > 0) {
      await tx.insert(eventInstallments).values({
        participantId,
        number: Math.max(0, ...rows.map((row) => row.number)) + 1,
        amount: fromCents(plan.addCents),
        dueDate: todayISO(),
      });
    }

    await tx
      .update(eventParticipants)
      .set({
        fundStatus: fundStatus ?? null,
        fundAmount: grantCents > 0 ? fromCents(grantCents) : null,
      })
      .where(eq(eventParticipants.id, participantId));
    return null;
  });

  if (outcome) return outcome;

  revalidateEvents();
  return { saved: Date.now() };
}

// Removes the sign-up with its installments and the income entries of the paid ones
export async function deleteParticipant(id: number) {
  await requireSession();

  const eventId = await db.transaction(async (tx) => {
    const [participant] = await tx
      .select({ eventId: eventParticipants.eventId })
      .from(eventParticipants)
      .where(eq(eventParticipants.id, id));
    if (!participant) return null;

    const paid = await tx
      .select({ entryId: eventInstallments.entryId })
      .from(eventInstallments)
      .where(and(eq(eventInstallments.participantId, id), isNotNull(eventInstallments.entryId)));
    await deleteEntries(tx, paid);
    await tx.delete(eventParticipants).where(eq(eventParticipants.id, id));
    return participant.eventId;
  });

  revalidateEvents();
  redirect(eventId ? `/events/${eventId}` : "/events");
}

export async function payEventInstallment(
  installmentId: number,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const session = await requireSession();

  const result = parseForm(paymentFormSchema, {
    paidDate: formData.get("paidDate"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const [installment] = await tx
      .select({
        number: eventInstallments.number,
        amount: eventInstallments.amount,
        entryId: eventInstallments.entryId,
        eventName: events.name,
        chargeName: eventCharges.name,
        // Of the same fee or extra charge
        installmentCount: sql<number>`(
          select count(*)::int from event_installments sibling
          where sibling.participant_id = "event_installments"."participant_id"
          and sibling.charge_id is not distinct from "event_installments"."charge_id"
        )`,
      })
      .from(eventInstallments)
      .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
      .innerJoin(events, eq(events.id, eventParticipants.eventId))
      .leftJoin(eventCharges, eq(eventCharges.id, eventInstallments.chargeId))
      .where(eq(eventInstallments.id, installmentId))
      .for("update", { of: eventInstallments });
    if (!installment) return { error: "Esta parcela não existe mais." };
    if (installment.entryId) return { error: "Esta parcela já foi paga." };

    const [entry] = await tx
      .insert(entries)
      .values({
        type: "income",
        amount: installment.amount,
        categoryId: await eventsCategoryId(tx),
        paymentMethod: result.data.paymentMethod,
        entryDate: result.data.paidDate,
        note: [
          `Parcela ${installment.number}/${installment.installmentCount}`,
          installment.chargeName,
          installment.eventName,
        ]
          .filter(Boolean)
          .join(" - "),
        createdById: Number(session.user.id),
      })
      .returning({ id: entries.id });

    await tx
      .update(eventInstallments)
      .set({ entryId: entry.id })
      .where(eq(eventInstallments.id, installmentId));
    return null;
  });

  if (outcome) return outcome;

  revalidateEvents();
  return { paid: true };
}

// Marks an installment as unpaid again by removing the income entry it created
export async function undoEventPayment(installmentId: number) {
  await requireSession();

  const [installment] = await db
    .select({ entryId: eventInstallments.entryId })
    .from(eventInstallments)
    .where(eq(eventInstallments.id, installmentId));
  if (!installment?.entryId) return;

  // The foreign key sets event_installments.entry_id back to null
  await db.delete(entries).where(eq(entries.id, installment.entryId));

  revalidateEvents();
}

function parseChargeForm(formData: FormData) {
  return parseForm(eventChargeFormSchema, {
    name: formData.get("name"),
    price: formData.get("price"),
  });
}

export async function createCharge(
  eventId: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const result = parseChargeForm(formData);
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const [event] = await tx.select({ id: events.id }).from(events).where(eq(events.id, eventId));
    if (!event) return { error: "Este evento não existe mais." };

    await tx.insert(eventCharges).values({
      eventId,
      name: result.data.name,
      price: result.data.price.toFixed(2),
    });
    return null;
  });

  if (outcome) return outcome;

  revalidateEvents();
  return { saved: Date.now() };
}

// Like the event's price, a new price only affects people added from now on
export async function updateCharge(
  chargeId: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const result = parseChargeForm(formData);
  if (!result.ok) return { error: result.error };

  const updated = await db
    .update(eventCharges)
    .set({ name: result.data.name, price: result.data.price.toFixed(2) })
    .where(eq(eventCharges.id, chargeId))
    .returning({ id: eventCharges.id });
  if (updated.length === 0) return { error: "Esta cobrança não existe mais." };

  revalidateEvents();
  return { saved: Date.now() };
}

// The income entries of its paid installments go with it; the rest cascades
export async function deleteCharge(chargeId: number) {
  await requireSession();

  await db.transaction(async (tx) => {
    const paid = await tx
      .select({ entryId: eventInstallments.entryId })
      .from(eventInstallments)
      .where(and(eq(eventInstallments.chargeId, chargeId), isNotNull(eventInstallments.entryId)));
    await deleteEntries(tx, paid);
    await tx.delete(eventCharges).where(eq(eventCharges.id, chargeId));
  });

  revalidateEvents();
}

// Adds a participant of the event to the charge, with what they owe for it
// split in monthly installments
export async function signUpForCharge(
  chargeId: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  await requireSession();

  const result = parseForm(chargeSignUpFormSchema, {
    participantId: formData.get("participantId"),
    total: formData.get("total"),
    installmentCount: formData.get("installmentCount"),
    firstDueDate: formData.get("firstDueDate"),
  });
  if (!result.ok) return { error: result.error };

  const { participantId, total, installmentCount, firstDueDate } = result.data;
  const totalCents = toCents(total);
  if (totalCents < installmentCount) {
    return { error: "Cada parcela precisa ter pelo menos R$ 0,01." };
  }

  try {
    const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
      const [charge] = await tx
        .select({ eventId: eventCharges.eventId })
        .from(eventCharges)
        .where(eq(eventCharges.id, chargeId));
      if (!charge) return { error: "Esta cobrança não existe mais." };

      const [participant] = await tx
        .select({ eventId: eventParticipants.eventId })
        .from(eventParticipants)
        .where(eq(eventParticipants.id, participantId));
      if (!participant || participant.eventId !== charge.eventId) {
        return { error: "Esta inscrição não existe mais." };
      }

      await tx.insert(eventInstallments).values(
        planInstallments(totalCents, installmentCount, firstDueDate).map((installment) => ({
          participantId,
          chargeId,
          number: installment.number,
          amount: fromCents(installment.amountCents),
          dueDate: installment.dueDate,
        }))
      );
      return null;
    });
    if (outcome) return outcome;
  } catch (error) {
    // Their 1st installment of the charge already exists
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return { error: "Este participante já está nesta cobrança." };
    }
    throw error;
  }

  revalidateEvents();
  return { saved: Date.now() };
}

// Takes the participant out of the charge, with the income entries of what they paid for it
export async function leaveCharge(chargeId: number, participantId: number) {
  await requireSession();

  await db.transaction(async (tx) => {
    const forCharge = and(
      eq(eventInstallments.chargeId, chargeId),
      eq(eventInstallments.participantId, participantId)
    );
    const paid = await tx
      .select({ entryId: eventInstallments.entryId })
      .from(eventInstallments)
      .where(and(forCharge, isNotNull(eventInstallments.entryId)));
    await tx.delete(eventInstallments).where(forCharge);
    await deleteEntries(tx, paid);
  });

  revalidateEvents();
}

export async function createExpense(
  eventId: number,
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const session = await requireSession();
  const userId = Number(session.user.id);

  const result = parseForm(eventExpenseFormSchema, {
    description: formData.get("description"),
    kind: formData.get("kind") ?? undefined,
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    supplier: formData.get("supplier") ?? undefined,
    note: formData.get("note"),
    status: formData.get("status"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!result.ok) return { error: result.error };

  const { description, kind, amount, expenseDate, supplier, note, status, paymentMethod } =
    result.data;

  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const [event] = await tx
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, eventId));
    if (!event) return { error: "Este evento não existe mais." };

    // Paid on the day it was bought; one still to pay gets its entry when paid
    const entryId =
      status === "paid"
        ? await insertExpenseEntry(tx, {
            eventName: event.name,
            description,
            amount: amount.toFixed(2),
            supplier: supplier ? supplier : null,
            paymentMethod: paymentMethod!,
            paidDate: expenseDate,
            userId,
          })
        : null;

    await tx.insert(eventExpenses).values({
      eventId,
      description,
      kind: kind ? kind : null,
      amount: amount.toFixed(2),
      expenseDate,
      supplier: supplier ? supplier : null,
      note: note ? note : null,
      entryId,
      createdById: userId,
    });
    return null;
  });

  if (outcome) return outcome;

  revalidateEvents();
  return { saved: Date.now() };
}

async function insertExpenseEntry(
  tx: Transaction,
  expense: {
    eventName: string;
    description: string;
    amount: string;
    supplier: string | null;
    paymentMethod: NonNullable<typeof entries.$inferInsert.paymentMethod>;
    paidDate: string;
    userId: number;
  }
) {
  const [entry] = await tx
    .insert(entries)
    .values({
      type: "cost",
      amount: expense.amount,
      categoryId: await eventsCategoryId(tx),
      counterparty: expense.supplier,
      paymentMethod: expense.paymentMethod,
      entryDate: expense.paidDate,
      note: `${expense.description} - ${expense.eventName}`,
      createdById: expense.userId,
    })
    .returning({ id: entries.id });
  return entry.id;
}

export async function payExpense(
  expenseId: number,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const session = await requireSession();

  const result = parseForm(paymentFormSchema, {
    paidDate: formData.get("paidDate"),
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!result.ok) return { error: result.error };

  const outcome = await db.transaction(async (tx): Promise<Outcome<null>> => {
    const [expense] = await tx
      .select({
        description: eventExpenses.description,
        amount: eventExpenses.amount,
        supplier: eventExpenses.supplier,
        entryId: eventExpenses.entryId,
        eventName: events.name,
      })
      .from(eventExpenses)
      .innerJoin(events, eq(events.id, eventExpenses.eventId))
      .where(eq(eventExpenses.id, expenseId))
      .for("update", { of: eventExpenses });
    if (!expense) return { error: "Esta despesa não existe mais." };
    if (expense.entryId) return { error: "Esta despesa já foi paga." };

    const entryId = await insertExpenseEntry(tx, {
      ...expense,
      paymentMethod: result.data.paymentMethod,
      paidDate: result.data.paidDate,
      userId: Number(session.user.id),
    });
    await tx.update(eventExpenses).set({ entryId }).where(eq(eventExpenses.id, expenseId));
    return null;
  });

  if (outcome) return outcome;

  revalidateEvents();
  return { paid: true };
}

// Back to unpaid, removing the cost entry it created
export async function undoExpensePayment(expenseId: number) {
  await requireSession();

  const [expense] = await db
    .select({ entryId: eventExpenses.entryId })
    .from(eventExpenses)
    .where(eq(eventExpenses.id, expenseId));
  if (!expense?.entryId) return;

  // The foreign key sets event_expenses.entry_id back to null
  await db.delete(entries).where(eq(entries.id, expense.entryId));

  revalidateEvents();
}

export async function deleteExpense(expenseId: number) {
  await requireSession();

  await db.transaction(async (tx) => {
    const [expense] = await tx
      .select({ entryId: eventExpenses.entryId })
      .from(eventExpenses)
      .where(eq(eventExpenses.id, expenseId));
    if (!expense) return;
    await tx.delete(eventExpenses).where(eq(eventExpenses.id, expenseId));
    await deleteEntries(tx, [expense].filter((row) => row.entryId !== null));
  });

  revalidateEvents();
}
