import "server-only";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  contributions,
  entries,
  installments,
  kids,
  sales,
  stockMovements,
} from "@/db/schema";
import type { DateRange } from "@/lib/dashboard-period";

const saleKids = alias(kids, "sale_kids");

// saleId is set when the entry records an installment payment, itemId when it
// paid for a restock and contributionKidId when it paid a month's contribution.
// Those entries are managed from there, not edited directly.
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
      contributionKidId: contributions.kidId,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .leftJoin(contributions, eq(contributions.entryId, entries.id))
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
      contributionKidId: contributions.kidId,
    })
    .from(entries)
    .leftJoin(contributions, eq(contributions.entryId, entries.id))
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

function entryDateIn(range: DateRange) {
  return and(gte(entries.entryDate, range.from), lte(entries.entryDate, range.to));
}

// What came in per origin. Money that left is not broken down here.
export async function getIncomeByCategory(range: DateRange) {
  const rows = await db
    .select({
      category: categories.name,
      income: sql<string>`sum(${entries.amount})`,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .where(and(eq(entries.type, "income"), entryDateIn(range)))
    .groupBy(categories.name)
    .orderBy(desc(sql`sum(${entries.amount})`), asc(categories.name));

  return rows.map((row) => ({
    category: row.category,
    income: Number(row.income),
  }));
}

export async function getTotals(range: DateRange) {
  const rows = await db
    .select({
      type: entries.type,
      total: sql<string>`sum(${entries.amount})`,
    })
    .from(entries)
    .where(entryDateIn(range))
    .groupBy(entries.type);

  let income = 0;
  let cost = 0;
  for (const row of rows) {
    if (row.type === "income") income = Number(row.total);
    if (row.type === "cost") cost = Number(row.total);
  }
  return { income, cost, balance: income - cost };
}
