import "server-only";
import { asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { installments, kids, sales } from "@/db/schema";

// Kids with the amount they still owe in unpaid installments
export async function listKids() {
  const owed = db
    .select({
      kidId: sales.kidId,
      amount: sql<string>`sum(${installments.amount})`.as("owed_amount"),
    })
    .from(installments)
    .innerJoin(sales, eq(sales.id, installments.saleId))
    .where(isNull(installments.entryId))
    .groupBy(sales.kidId)
    .as("owed");

  return db
    .select({
      id: kids.id,
      name: kids.name,
      contact: kids.contact,
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
