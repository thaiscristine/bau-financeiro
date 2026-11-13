import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries } from "@/db/schema";

export async function listEntries() {
  return db
    .select()
    .from(entries)
    .orderBy(desc(entries.entryDate), desc(entries.id));
}

export async function getEntry(id: number) {
  const [entry] = await db
    .select()
    .from(entries)
    .where(eq(entries.id, id))
    .limit(1);
  return entry;
}

export async function getTotals() {
  const rows = await db
    .select({
      type: entries.type,
      total: sql<string>`sum(${entries.amount})`,
    })
    .from(entries)
    .groupBy(entries.type);

  let income = 0;
  let cost = 0;
  for (const row of rows) {
    if (row.type === "income") income = Number(row.total);
    if (row.type === "cost") cost = Number(row.total);
  }
  return { income, cost, balance: income - cost };
}

export async function getMonthlyBreakdown() {
  const monthExpr = sql<string>`to_char(${entries.entryDate}, 'YYYY-MM')`;

  const rows = await db
    .select({
      month: monthExpr,
      type: entries.type,
      total: sql<string>`sum(${entries.amount})`,
    })
    .from(entries)
    .groupBy(monthExpr, entries.type)
    .orderBy(desc(monthExpr));

  const byMonth = new Map<string, { income: number; cost: number }>();
  for (const row of rows) {
    const current = byMonth.get(row.month) ?? { income: 0, cost: 0 };
    if (row.type === "income") current.income = Number(row.total);
    if (row.type === "cost") current.cost = Number(row.total);
    byMonth.set(row.month, current);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([month, totals]) => ({
      month,
      income: totals.income,
      cost: totals.cost,
      balance: totals.income - totals.cost,
    }));
}
