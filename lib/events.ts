import "server-only";
import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
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
import type { DateRange } from "@/lib/dashboard-period";

// A participant's name: the kid's, or the guest's typed one
export const participantName = sql<string>`coalesce(${kids.name}, ${eventParticipants.guestName})`;

// Correlated subqueries spell out the outer column; see lib/inventory.ts
const eventTotals = {
  participantCount: sql<number>`(
    select count(*)::int from event_participants participant
    where participant.event_id = "events"."id"
  )`,
  // The fees plus what the participants owe for the extra charges
  expected: sql<string>`(
    select coalesce(sum(participant.total), 0) from event_participants participant
    where participant.event_id = "events"."id"
  ) + (
    select coalesce(sum(installment.amount), 0) from event_installments installment
    join event_charges charge on charge.id = installment.charge_id
    where charge.event_id = "events"."id"
  )`,
  received: sql<string>`(
    select coalesce(sum(installment.amount), 0) from event_installments installment
    join event_participants participant on participant.id = installment.participant_id
    where participant.event_id = "events"."id" and installment.entry_id is not null
  )`,
  expenses: sql<string>`(
    select coalesce(sum(expense.amount), 0) from event_expenses expense
    where expense.event_id = "events"."id"
  )`,
};

// Newest first, with what came in and the expenses, paid or not
export async function listEvents() {
  const rows = await db
    .select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      ...eventTotals,
    })
    .from(events)
    .orderBy(desc(events.startDate), desc(events.id));

  return rows.map((row) => ({
    ...row,
    expected: Number(row.expected),
    received: Number(row.received),
    expenses: Number(row.expenses),
  }));
}

export async function getEvent(id: number) {
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return event;
}

// The event's money: what participants owe for the fee and the extra charges,
// paid or not, its expenses and what Fundo Lisah covered (a discount, so it is in none of the other figures).
// available is what is left once every expense, paid or not, is covered by
// what came in, like the "saldo disponível" of the old spreadsheet.
export async function getEventSummary(eventId: number, today: string) {
  const [[installmentsRow], [expensesRow], [fundRow]] = await Promise.all([
    db
      .select({
        received: sql<string>`coalesce(sum(${eventInstallments.amount}) filter (where ${isNotNull(eventInstallments.entryId)}), 0)`,
        pending: sql<string>`coalesce(sum(${eventInstallments.amount}) filter (where ${isNull(eventInstallments.entryId)}), 0)`,
        overdue: sql<string>`coalesce(sum(${eventInstallments.amount}) filter (where ${and(isNull(eventInstallments.entryId), lt(eventInstallments.dueDate, today))}), 0)`,
      })
      .from(eventInstallments)
      .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
      .where(eq(eventParticipants.eventId, eventId)),
    db
      .select({
        paid: sql<string>`coalesce(sum(${eventExpenses.amount}) filter (where ${isNotNull(eventExpenses.entryId)}), 0)`,
        unpaid: sql<string>`coalesce(sum(${eventExpenses.amount}) filter (where ${isNull(eventExpenses.entryId)}), 0)`,
      })
      .from(eventExpenses)
      .where(eq(eventExpenses.eventId, eventId)),
    db
      .select({
        granted: sql<string>`coalesce(sum(${eventParticipants.fundAmount}), 0)`,
        grantedCount: sql<number>`(count(*) filter (where ${eq(eventParticipants.fundStatus, "granted")}))::int`,
        requestedCount: sql<number>`(count(*) filter (where ${eq(eventParticipants.fundStatus, "requested")}))::int`,
      })
      .from(eventParticipants)
      .where(eq(eventParticipants.eventId, eventId)),
  ]);

  const received = Number(installmentsRow.received);
  const expensesPaid = Number(expensesRow.paid);
  const expensesUnpaid = Number(expensesRow.unpaid);
  return {
    received,
    pending: Number(installmentsRow.pending),
    overdue: Number(installmentsRow.overdue),
    expensesPaid,
    expensesUnpaid,
    available: received - expensesPaid - expensesUnpaid,
    // Fundo Lisah: what it covered, for how many, and the requests still waiting
    fund: {
      granted: Number(fundRow.granted),
      grantedCount: fundRow.grantedCount,
      requestedCount: fundRow.requestedCount,
    },
  };
}

// The installments of what a participant owes and what is paid of it
const installmentFigures = {
  installmentCount: sql<number>`count(${eventInstallments.id})::int`,
  paidCount: sql<number>`(count(*) filter (where ${isNotNull(eventInstallments.entryId)}))::int`,
  pending: sql<string>`coalesce(sum(${eventInstallments.amount}) filter (where ${isNull(eventInstallments.entryId)}), 0)`,
};

function overdueSum(today: string) {
  return sql<string>`coalesce(sum(${eventInstallments.amount}) filter (where ${and(isNull(eventInstallments.entryId), lt(eventInstallments.dueDate, today))}), 0)`;
}

// Grouped by age group in age order, guests and kids with no age group last.
// The figures are the fee's; the extra charges have their own lists.
export async function listEventParticipants(eventId: number, today: string) {
  const rows = await db
    .select({
      id: eventParticipants.id,
      kidId: eventParticipants.kidId,
      name: participantName,
      ageGroup: kids.ageGroup,
      total: eventParticipants.total,
      fundStatus: eventParticipants.fundStatus,
      fundAmount: eventParticipants.fundAmount,
      ...installmentFigures,
      overdue: overdueSum(today),
    })
    .from(eventParticipants)
    .leftJoin(kids, eq(kids.id, eventParticipants.kidId))
    .leftJoin(
      eventInstallments,
      and(
        eq(eventInstallments.participantId, eventParticipants.id),
        isNull(eventInstallments.chargeId)
      )
    )
    .where(eq(eventParticipants.eventId, eventId))
    .groupBy(eventParticipants.id, kids.id)
    // Enum values sort in declaration order, which is age order
    .orderBy(sql`${kids.ageGroup} asc nulls last`, asc(participantName));

  return rows.map((row) => ({
    ...row,
    total: Number(row.total),
    fundAmount: row.fundAmount === null ? null : Number(row.fundAmount),
    pending: Number(row.pending),
    overdue: Number(row.overdue),
  }));
}

// The event's extra charges in the order they were created
export async function listEventCharges(eventId: number) {
  return db
    .select({ id: eventCharges.id, name: eventCharges.name, price: eventCharges.price })
    .from(eventCharges)
    .where(eq(eventCharges.eventId, eventId))
    .orderBy(asc(eventCharges.createdAt), asc(eventCharges.id));
}

// Who took each extra charge, in the same order as the fee's list. total is
// what they owe for it: the sum of its installments.
export async function listChargeParticipants(eventId: number, today: string) {
  const rows = await db
    .select({
      chargeId: eventInstallments.chargeId,
      id: eventParticipants.id,
      kidId: eventParticipants.kidId,
      name: participantName,
      ageGroup: kids.ageGroup,
      total: sql<string>`sum(${eventInstallments.amount})`,
      ...installmentFigures,
      overdue: overdueSum(today),
    })
    .from(eventInstallments)
    .innerJoin(eventCharges, eq(eventCharges.id, eventInstallments.chargeId))
    .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
    .leftJoin(kids, eq(kids.id, eventParticipants.kidId))
    .where(eq(eventCharges.eventId, eventId))
    .groupBy(eventInstallments.chargeId, eventParticipants.id, kids.id)
    .orderBy(sql`${kids.ageGroup} asc nulls last`, asc(participantName));

  return rows.map((row) => ({
    ...row,
    chargeId: row.chargeId!,
    total: Number(row.total),
    pending: Number(row.pending),
    overdue: Number(row.overdue),
  }));
}

export async function getParticipant(id: number) {
  const [participant] = await db
    .select({
      id: eventParticipants.id,
      eventId: eventParticipants.eventId,
      eventName: events.name,
      kidId: eventParticipants.kidId,
      name: participantName,
      total: eventParticipants.total,
      fundStatus: eventParticipants.fundStatus,
      fundAmount: eventParticipants.fundAmount,
      note: eventParticipants.note,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .leftJoin(kids, eq(kids.id, eventParticipants.kidId))
    .where(eq(eventParticipants.id, id))
    .limit(1);
  return participant;
}

export async function listParticipantInstallments(participantId: number) {
  return db
    .select({
      id: eventInstallments.id,
      chargeId: eventInstallments.chargeId,
      chargeName: eventCharges.name,
      number: eventInstallments.number,
      amount: eventInstallments.amount,
      dueDate: eventInstallments.dueDate,
      entryId: eventInstallments.entryId,
      paidDate: entries.entryDate,
      paymentMethod: entries.paymentMethod,
    })
    .from(eventInstallments)
    .leftJoin(eventCharges, eq(eventCharges.id, eventInstallments.chargeId))
    .leftJoin(entries, eq(entries.id, eventInstallments.entryId))
    .where(eq(eventInstallments.participantId, participantId))
    // The fee first, then the extra charges in the order they were created
    .orderBy(
      sql`${eventCharges.createdAt} asc nulls first`,
      asc(eventInstallments.chargeId),
      asc(eventInstallments.number)
    );
}

// The kids not signed up yet, who can still be added to the event
export async function listKidsToSignUp(eventId: number) {
  return db
    .select({ id: kids.id, name: kids.name })
    .from(kids)
    .leftJoin(
      eventParticipants,
      and(eq(eventParticipants.kidId, kids.id), eq(eventParticipants.eventId, eventId))
    )
    .where(isNull(eventParticipants.id))
    .orderBy(asc(kids.name));
}

// Unpaid first, then by date
export async function listEventExpenses(eventId: number) {
  return db
    .select({
      id: eventExpenses.id,
      description: eventExpenses.description,
      kind: eventExpenses.kind,
      amount: eventExpenses.amount,
      expenseDate: eventExpenses.expenseDate,
      supplier: eventExpenses.supplier,
      note: eventExpenses.note,
      entryId: eventExpenses.entryId,
      paidDate: entries.entryDate,
      paymentMethod: entries.paymentMethod,
    })
    .from(eventExpenses)
    .leftJoin(entries, eq(entries.id, eventExpenses.entryId))
    .where(eq(eventExpenses.eventId, eventId))
    .orderBy(
      sql`${eventExpenses.entryId} is not null`,
      desc(eventExpenses.expenseDate),
      desc(eventExpenses.id)
    );
}

// Kinds typed on any event before, suggested when adding an expense
export async function listExpenseKinds() {
  const rows = await db
    .selectDistinct({ kind: eventExpenses.kind })
    .from(eventExpenses)
    .where(isNotNull(eventExpenses.kind))
    .orderBy(asc(eventExpenses.kind));
  return rows.map((row) => row.kind!);
}

// The events a kid signed up for, newest first. total is the fee plus what
// they owe for the extra charges they took, and the installments are all of them.
export async function listKidEvents(kidId: number) {
  return db
    .select({
      participantId: eventParticipants.id,
      eventId: events.id,
      eventName: events.name,
      startDate: events.startDate,
      total: sql<string>`${eventParticipants.total} + coalesce(sum(${eventInstallments.amount}) filter (where ${isNotNull(eventInstallments.chargeId)}), 0)`,
      installmentCount: sql<number>`count(${eventInstallments.id})::int`,
      paidCount: sql<number>`(count(*) filter (where ${isNotNull(eventInstallments.entryId)}))::int`,
    })
    .from(eventParticipants)
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .leftJoin(eventInstallments, eq(eventInstallments.participantId, eventParticipants.id))
    .where(eq(eventParticipants.kidId, kidId))
    .groupBy(eventParticipants.id, events.id)
    .orderBy(desc(events.startDate), desc(events.id));
}

// What is still to be received from unpaid event installments due in the
// range, and how much of it is already overdue; see getReceivables in lib/sales.ts
export async function getEventReceivables(today: string, range: DateRange) {
  const [row] = await db
    .select({
      pending: sql<string>`coalesce(sum(${eventInstallments.amount}), 0)`,
      overdue: sql<string>`coalesce(sum(${eventInstallments.amount}) filter (where ${lt(eventInstallments.dueDate, today)}), 0)`,
    })
    .from(eventInstallments)
    .where(
      and(
        isNull(eventInstallments.entryId),
        gte(eventInstallments.dueDate, range.from),
        lte(eventInstallments.dueDate, range.to)
      )
    );
  return { pending: Number(row.pending), overdue: Number(row.overdue) };
}
