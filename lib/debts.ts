import "server-only";
import { and, asc, eq, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contributions,
  eventCharges,
  eventInstallments,
  eventParticipants,
  events,
  installments,
  items,
  sales,
} from "@/db/schema";

export type DebtKind = "contribution" | "sale" | "event";

// Everything a kid still has to pay, one row per charge: unpaid Lojinha and
// event installments, and the contribution months charged up to the current
// one (later months are not owed yet). A month's due date is its last day, so
// "late" means the same for all of them: the due date has passed.
export function openCharges(today: string) {
  const currentMonth = `${today.slice(0, 7)}-01`;
  const contributionCharges = db
    .select({
      kidId: contributions.kidId,
      kind: sql<DebtKind>`'contribution'`.as("kind"),
      saleId: sql<number | null>`null::int`.as("sale_id"),
      eventId: sql<number | null>`null::int`.as("event_id"),
      participantId: sql<number | null>`null::int`.as("participant_id"),
      chargeId: sql<number | null>`null::int`.as("charge_id"),
      label: sql<string>`'Contribuição mensal'`.as("label"),
      dueDate: sql<string>`(${contributions.month} + interval '1 month' - interval '1 day')::date`.as("due_date"),
      amount: contributions.amount,
    })
    .from(contributions)
    .where(
      and(
        eq(contributions.due, true),
        isNull(contributions.entryId),
        lte(contributions.month, currentMonth)
      )
    );
  const saleCharges = db
    .select({
      kidId: sales.kidId,
      kind: sql<DebtKind>`'sale'`,
      saleId: sql<number | null>`${sales.id}`,
      eventId: sql<number | null>`null::int`,
      participantId: sql<number | null>`null::int`,
      chargeId: sql<number | null>`null::int`,
      label: sql<string>`${items.name}`,
      dueDate: sql<string>`${installments.dueDate}`,
      amount: installments.amount,
    })
    .from(installments)
    .innerJoin(sales, eq(sales.id, installments.saleId))
    .innerJoin(items, eq(items.id, sales.itemId))
    .where(isNull(installments.entryId));
  // Guests have no kid, so they are left out
  const eventFees = db
    .select({
      kidId: sql<number>`${eventParticipants.kidId}`,
      kind: sql<DebtKind>`'event'`,
      saleId: sql<number | null>`null::int`,
      eventId: sql<number | null>`${events.id}`,
      participantId: sql<number | null>`${eventParticipants.id}`,
      // An extra charge, like flight tickets, gets its own row beside the fee
      chargeId: eventInstallments.chargeId,
      label: sql<string>`concat_ws(' · ', ${events.name}, ${eventCharges.name})`,
      dueDate: sql<string>`${eventInstallments.dueDate}`,
      amount: eventInstallments.amount,
    })
    .from(eventInstallments)
    .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .leftJoin(eventCharges, eq(eventCharges.id, eventInstallments.chargeId))
    .where(and(isNull(eventInstallments.entryId), isNotNull(eventParticipants.kidId)));

  return contributionCharges.unionAll(saleCharges).unionAll(eventFees).as("charges");
}

// What each kid owes in all, and how much of it is late
export function kidDebts(today: string) {
  const charges = openCharges(today);
  return db
    .select({
      kidId: charges.kidId,
      owed: sql<string>`sum(${charges.amount})`.as("owed"),
      overdue: sql<string>`coalesce(sum(${charges.amount}) filter (where ${lt(charges.dueDate, today)}), 0)`.as("overdue"),
    })
    .from(charges)
    .groupBy(charges.kidId)
    .as("kid_debts");
}

// One kid's open charges added up per origin: the contribution months, each
// sale, each event's fee and each extra charge they took. Late ones first, then by the next due date.
export async function getKidDebts(kidId: number, today: string) {
  const charges = openCharges(today);
  const late = lt(charges.dueDate, today);
  const rows = await db
    .select({
      kind: charges.kind,
      saleId: charges.saleId,
      eventId: charges.eventId,
      participantId: charges.participantId,
      chargeId: charges.chargeId,
      label: charges.label,
      count: sql<number>`count(*)::int`,
      lateCount: sql<number>`(count(*) filter (where ${late}))::int`,
      overdue: sql<string>`coalesce(sum(${charges.amount}) filter (where ${late}), 0)`,
      upcoming: sql<string>`coalesce(sum(${charges.amount}) filter (where not ${late}), 0)`,
      oldestDue: sql<string>`min(${charges.dueDate})`,
      nextDue: sql<string | null>`min(${charges.dueDate}) filter (where not ${late})`,
      // The contribution months still open, to name them
      months: sql<string[]>`array_agg(to_char(${charges.dueDate}, 'YYYY-MM') order by ${charges.dueDate})`,
    })
    .from(charges)
    .where(eq(charges.kidId, kidId))
    .groupBy(
      charges.kind,
      charges.saleId,
      charges.eventId,
      charges.participantId,
      charges.chargeId,
      charges.label
    )
    .orderBy(
      sql`count(*) filter (where ${late}) = 0`,
      asc(sql`min(${charges.dueDate})`),
      asc(charges.label)
    );

  return rows.map((row) => ({
    ...row,
    overdue: Number(row.overdue),
    upcoming: Number(row.upcoming),
  }));
}
