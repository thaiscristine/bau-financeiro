import "server-only";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, installments, items, kids, sales } from "@/db/schema";

// Correlated subqueries spell out the outer column; see lib/inventory.ts
const saleColumns = {
  id: sales.id,
  saleDate: sales.saleDate,
  quantity: sales.quantity,
  unitPrice: sales.unitPrice,
  total: sales.total,
  note: sales.note,
  kidId: sales.kidId,
  kidName: kids.name,
  itemId: sales.itemId,
  itemName: items.name,
  installmentCount: sql<number>`(
    select count(*)::int from installments installment
    where installment.sale_id = "sales"."id"
  )`,
  paidCount: sql<number>`(
    select count(*)::int from installments installment
    where installment.sale_id = "sales"."id" and installment.entry_id is not null
  )`,
};

export async function listSales(filter?: { kidId?: number }) {
  return db
    .select(saleColumns)
    .from(sales)
    .innerJoin(kids, eq(kids.id, sales.kidId))
    .innerJoin(items, eq(items.id, sales.itemId))
    .where(filter?.kidId ? eq(sales.kidId, filter.kidId) : undefined)
    .orderBy(desc(sales.saleDate), desc(sales.id));
}

export async function getSale(id: number) {
  const [sale] = await db
    .select(saleColumns)
    .from(sales)
    .innerJoin(kids, eq(kids.id, sales.kidId))
    .innerJoin(items, eq(items.id, sales.itemId))
    .where(eq(sales.id, id))
    .limit(1);
  return sale;
}

export async function listInstallments(saleId: number) {
  return db
    .select({
      id: installments.id,
      number: installments.number,
      amount: installments.amount,
      dueDate: installments.dueDate,
      entryId: installments.entryId,
      paidDate: entries.entryDate,
    })
    .from(installments)
    .leftJoin(entries, eq(entries.id, installments.entryId))
    .where(eq(installments.saleId, saleId))
    .orderBy(asc(installments.number));
}

// What is still to be received from unpaid installments, and how much of it is overdue
export async function getReceivables(today: string) {
  const [row] = await db
    .select({
      pending: sql<string>`coalesce(sum(${installments.amount}), 0)`,
      overdue: sql<string>`coalesce(sum(${installments.amount}) filter (where ${lt(installments.dueDate, today)}), 0)`,
    })
    .from(installments)
    .where(isNull(installments.entryId));
  return { pending: Number(row.pending), overdue: Number(row.overdue) };
}

export async function listOverdueInstallments(today: string) {
  return db
    .select({
      id: installments.id,
      saleId: installments.saleId,
      number: installments.number,
      amount: installments.amount,
      dueDate: installments.dueDate,
      kidName: kids.name,
      itemName: items.name,
    })
    .from(installments)
    .innerJoin(sales, eq(sales.id, installments.saleId))
    .innerJoin(kids, eq(kids.id, sales.kidId))
    .innerJoin(items, eq(items.id, sales.itemId))
    .where(and(isNull(installments.entryId), lt(installments.dueDate, today)))
    .orderBy(asc(installments.dueDate), asc(kids.name));
}
