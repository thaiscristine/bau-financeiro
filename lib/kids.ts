import "server-only";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventInstallments, eventParticipants, installments, kids, sales } from "@/db/schema";

// Kids with the amount they still owe in unpaid installments, of Lojinha
// sales and of events
export async function listKids() {
  const saleDebts = db
    .select({ kidId: sales.kidId, amount: installments.amount })
    .from(installments)
    .innerJoin(sales, eq(sales.id, installments.saleId))
    .where(isNull(installments.entryId));
  // Guests have no kid, so they are left out
  const eventDebts = db
    .select({
      kidId: sql<number>`${eventParticipants.kidId}`.as("kid_id"),
      amount: eventInstallments.amount,
    })
    .from(eventInstallments)
    .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
    .where(and(isNull(eventInstallments.entryId), isNotNull(eventParticipants.kidId)));
  const debts = saleDebts.unionAll(eventDebts).as("debts");
  const owed = db
    .select({
      kidId: debts.kidId,
      amount: sql<string>`sum(${debts.amount})`.as("owed_amount"),
    })
    .from(debts)
    .groupBy(debts.kidId)
    .as("owed");

  return db
    .select({
      id: kids.id,
      name: kids.name,
      contact: kids.contact,
      ageGroup: kids.ageGroup,
      isMinor: kids.isMinor,
      guardianName: kids.guardianName,
      guardianPhone: kids.guardianPhone,
      owed: sql<string>`coalesce(${owed.amount}, 0)`,
    })
    .from(kids)
    .leftJoin(owed, eq(owed.kidId, kids.id))
    .orderBy(asc(kids.name));
}

export async function getKid(id: number) {
  const [kid] = await db.select().from(kids).where(eq(kids.id, id)).limit(1);
  return kid;
}
