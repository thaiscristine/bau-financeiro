import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  entries,
  installments,
  kids,
  sales,
  stockMovements,
} from "@/db/schema";

const saleKids = alias(kids, "sale_kids");

// saleId is set when the entry records an installment payment and itemId when it
// paid for a restock. Those entries are managed from there, not edited directly.
export async function listEntries() {
  return db
    .select({
      id: entries.id,
      type: entries.type,
      amount: entries.amount,
      note: entries.note,
      entryDate: entries.entryDate,
      categoryName: categories.name,
      // The kid of an installment payment or contribution, otherwise the typed name
      counterparty: sql<string | null>`coalesce(${saleKids.name}, ${kids.name}, ${entries.counterparty})`,
      saleId: installments.saleId,
      itemId: stockMovements.itemId,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .leftJoin(installments, eq(installments.entryId, entries.id))
    .leftJoin(sales, eq(sales.id, installments.saleId))
    .leftJoin(saleKids, eq(saleKids.id, sales.kidId))
    .leftJoin(kids, eq(kids.id, entries.kidId))
    .leftJoin(stockMovements, eq(stockMovements.entryId, entries.id))
    .orderBy(desc(entries.entryDate), desc(entries.id));
}

export async function getEntry(id: number) {
  const [row] = await db
    .select({
      entry: entries,
      saleId: installments.saleId,
      itemId: stockMovements.itemId,
    })
    .from(entries)
    .leftJoin(installments, eq(installments.entryId, entries.id))
    .leftJoin(stockMovements, eq(stockMovements.entryId, entries.id))
    .where(eq(entries.id, id))
    .limit(1);
  return row;
}

// Entries linked directly to a kid, such as monthly contributions
export async function listKidEntries(kidId: number) {
  return db
    .select({
      id: entries.id,
      amount: entries.amount,
      entryDate: entries.entryDate,
      note: entries.note,
      categoryName: categories.name,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .where(eq(entries.kidId, kidId))
    .orderBy(desc(entries.entryDate), desc(entries.id));
}

export async function getTotalsByCategory() {
  const rows = await db
    .select({
      category: categories.name,
      income: sql<string>`coalesce(sum(${entries.amount}) filter (where ${entries.type} = 'income'), 0)`,
      cost: sql<string>`coalesce(sum(${entries.amount}) filter (where ${entries.type} = 'cost'), 0)`,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .groupBy(categories.name)
    .orderBy(asc(categories.name));

  return rows.map((row) => ({
    category: row.category,
    income: Number(row.income),
    cost: Number(row.cost),
  }));
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
