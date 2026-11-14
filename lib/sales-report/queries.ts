import "server-only";
import { and, asc, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { entries, installments, items, kids, sales, stockMovements } from "@/db/schema";
import { mergeMonths } from "./period";

type Range = { from: string | null; to: string | null };

function between(column: AnyPgColumn, range: Range) {
  return and(
    range.from ? gte(column, range.from) : undefined,
    range.to ? lte(column, range.to) : undefined
  );
}

function monthOf(column: AnyPgColumn) {
  return sql<string>`to_char(${column}, 'YYYY-MM')`;
}

const sum = (column: AnyPgColumn) => sql<string>`coalesce(sum(${column}), 0)`;

// Money received counts on the date its installment was paid, and restock costs
// on the date they were paid, both from the entry each one recorded
export async function getSalesTotals(range: Range) {
  const [[sold], [received], [restock]] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        units: sql<number>`coalesce(sum(${sales.quantity}), 0)::int`,
        total: sum(sales.total),
      })
      .from(sales)
      .where(between(sales.saleDate, range)),
    db
      .select({ total: sum(entries.amount) })
      .from(installments)
      .innerJoin(entries, eq(entries.id, installments.entryId))
      .where(between(entries.entryDate, range)),
    db
      .select({ total: sum(entries.amount) })
      .from(stockMovements)
      .innerJoin(entries, eq(entries.id, stockMovements.entryId))
      .where(between(entries.entryDate, range)),
  ]);
  return {
    count: sold.count,
    units: sold.units,
    sold: Number(sold.total),
    received: Number(received.total),
    restockCost: Number(restock.total),
  };
}

export async function getSalesByMonth(range: Range) {
  const saleMonth = monthOf(sales.saleDate);
  const entryMonth = monthOf(entries.entryDate);
  const [sold, received, restockCost] = await Promise.all([
    db
      .select({ month: saleMonth, total: sum(sales.total) })
      .from(sales)
      .where(between(sales.saleDate, range))
      .groupBy(saleMonth),
    db
      .select({ month: entryMonth, total: sum(entries.amount) })
      .from(installments)
      .innerJoin(entries, eq(entries.id, installments.entryId))
      .where(between(entries.entryDate, range))
      .groupBy(entryMonth),
    db
      .select({ month: entryMonth, total: sum(entries.amount) })
      .from(stockMovements)
      .innerJoin(entries, eq(entries.id, stockMovements.entryId))
      .where(between(entries.entryDate, range))
      .groupBy(entryMonth),
  ]);
  const toNumbers = (rows: { month: string; total: string }[]) =>
    rows.map((row) => ({ month: row.month, total: Number(row.total) }));
  return mergeMonths({
    sold: toNumbers(sold),
    received: toNumbers(received),
    restockCost: toNumbers(restockCost),
  });
}

export async function listTopItems(range: Range) {
  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      sales: sql<number>`count(*)::int`,
      units: sql<number>`sum(${sales.quantity})::int`,
      total: sum(sales.total),
    })
    .from(sales)
    .innerJoin(items, eq(items.id, sales.itemId))
    .where(between(sales.saleDate, range))
    .groupBy(items.id, items.name)
    .orderBy(desc(sql`sum(${sales.total})`), asc(items.name));
  return rows.map((row) => ({ ...row, total: Number(row.total) }));
}

// Everyone with unpaid installments, whatever the period: what is owed is owed
// until it is paid. The most overdue come first, since they need a call.
export async function listDebtors(today: string) {
  const overdue = sql<string>`coalesce(sum(${installments.amount}) filter (where ${lt(installments.dueDate, today)}), 0)`;
  const rows = await db
    .select({
      id: kids.id,
      name: kids.name,
      phone: sql<string | null>`coalesce(${kids.guardianPhone}, ${kids.contact})`,
      pending: sum(installments.amount),
      overdue,
      nextDue: sql<string>`min(${installments.dueDate})`,
    })
    .from(installments)
    .innerJoin(sales, eq(sales.id, installments.saleId))
    .innerJoin(kids, eq(kids.id, sales.kidId))
    .where(isNull(installments.entryId))
    .groupBy(kids.id, kids.name, kids.guardianPhone, kids.contact)
    .orderBy(desc(overdue), desc(sql`sum(${installments.amount})`), asc(kids.name));
  return rows.map((row) => ({
    ...row,
    pending: Number(row.pending),
    overdue: Number(row.overdue),
  }));
}
