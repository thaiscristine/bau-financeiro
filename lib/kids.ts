import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { kids } from "@/db/schema";
import { kidDebts } from "@/lib/debts";

// Kids with what they still owe (see openCharges in lib/debts.ts) and how
// much of it is late
export async function listKids(today: string) {
  const debts = kidDebts(today);
  return db
    .select({
      id: kids.id,
      name: kids.name,
      contact: kids.contact,
      ageGroup: kids.ageGroup,
      isMinor: kids.isMinor,
      guardianName: kids.guardianName,
      guardianPhone: kids.guardianPhone,
      owed: sql<string>`coalesce(${debts.owed}, 0)`,
      overdue: sql<string>`coalesce(${debts.overdue}, 0)`,
    })
    .from(kids)
    .leftJoin(debts, eq(debts.kidId, kids.id))
    .orderBy(asc(kids.name));
}

// For the pickers that choose a kid
export async function listKidOptions() {
  return db.select({ id: kids.id, name: kids.name }).from(kids).orderBy(asc(kids.name));
}

export async function getKid(id: number) {
  const [kid] = await db.select().from(kids).where(eq(kids.id, id)).limit(1);
  return kid;
}
