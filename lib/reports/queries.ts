import "server-only";
import { and, asc, eq, gte, ilike, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  entries,
  eventInstallments,
  eventParticipants,
  events,
  installments,
  items,
  kids,
  reportTemplates,
  sales,
  users,
} from "@/db/schema";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import { LOW_STOCK } from "./definitions";
import { periodRange, type ReportFilters } from "./filters";
import { statusLabel, type FilterNames, type ReportRow } from "./build";

const saleKids = alias(kids, "sale_kids");
const eventKids = alias(kids, "event_kids");

function dateBetween(column: AnyPgColumn, filters: ReportFilters, today: string) {
  const { from, to } = periodRange(filters, today);
  return [from ? gte(column, from) : undefined, to ? lte(column, to) : undefined];
}

// Matches the typed text literally, not as a LIKE pattern
function containsPattern(text: string) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

async function entryRows(filters: ReportFilters, today: string): Promise<ReportRow[]> {
  // An event guest has no kid, so their typed name stands in
  const kidName = sql<string | null>`coalesce(${saleKids.name}, ${kids.name}, ${eventKids.name}, ${eventParticipants.guestName})`;
  const rows = await db
    .select({
      date: entries.entryDate,
      type: entries.type,
      category: categories.name,
      amount: entries.amount,
      paymentMethod: entries.paymentMethod,
      counterparty: entries.counterparty,
      kid: kidName,
      note: entries.note,
      createdBy: users.name,
    })
    .from(entries)
    .innerJoin(categories, eq(categories.id, entries.categoryId))
    .innerJoin(users, eq(users.id, entries.createdById))
    // An installment payment names its kid through the sale or the event
    .leftJoin(installments, eq(installments.entryId, entries.id))
    .leftJoin(sales, eq(sales.id, installments.saleId))
    .leftJoin(saleKids, eq(saleKids.id, sales.kidId))
    .leftJoin(kids, eq(kids.id, entries.kidId))
    .leftJoin(eventInstallments, eq(eventInstallments.entryId, entries.id))
    .leftJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
    .leftJoin(eventKids, eq(eventKids.id, eventParticipants.kidId))
    .where(
      and(
        ...dateBetween(entries.entryDate, filters, today),
        filters.entryType !== "all" ? eq(entries.type, filters.entryType) : undefined,
        filters.categoryIds.length > 0 ? inArray(entries.categoryId, filters.categoryIds) : undefined,
        filters.paymentMethods.length > 0 ? inArray(entries.paymentMethod, filters.paymentMethods) : undefined,
        filters.kidId
          ? or(
              eq(entries.kidId, filters.kidId),
              eq(sales.kidId, filters.kidId),
              eq(eventParticipants.kidId, filters.kidId)
            )
          : undefined,
        filters.createdById ? eq(entries.createdById, filters.createdById) : undefined,
        filters.search
          ? ilike(
              sql`concat_ws(' ', ${entries.counterparty}, ${entries.note}, ${categories.name}, ${kidName})`,
              containsPattern(filters.search)
            )
          : undefined
      )
    )
    .orderBy(asc(entries.entryDate), asc(entries.id));

  return rows.map((row) => ({
    ...row,
    type: row.type === "income" ? "Entrada" : "Saída",
    // Empty for entries from before the method was tracked
    paymentMethod: row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : null,
    amount: row.type === "income" ? Number(row.amount) : -Number(row.amount),
  }));
}

// Lojinha sales and event sign-ups alike; an event's name fills the item column
async function installmentRows(filters: ReportFilters, today: string): Promise<ReportRow[]> {
  const [saleRows, eventRows] = await Promise.all([
    saleInstallmentRows(filters, today),
    // Picking an item leaves only sales
    filters.itemId ? [] : eventInstallmentRows(filters, today),
  ]);

  // The sort is stable, so rows with the same due date and kid keep the order
  // they were created in, sales first
  return [...saleRows, ...eventRows]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.kid.localeCompare(b.kid, "pt-BR"))
    .map(({ number, count, entryId, ...row }) => ({
      ...row,
      installment: `${number}/${count}`,
      amount: Number(row.amount),
      status: statusLabel(entryId ? "paid" : row.dueDate < today ? "overdue" : "open"),
      paymentMethod: row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : null,
    }));
}

function installmentStatus(
  column: { entryId: AnyPgColumn; dueDate: AnyPgColumn },
  filters: ReportFilters,
  today: string
) {
  const condition = {
    paid: isNotNull(column.entryId),
    open: and(isNull(column.entryId), gte(column.dueDate, today)),
    overdue: and(isNull(column.entryId), lt(column.dueDate, today)),
  };
  return filters.statuses.length > 0
    ? or(...filters.statuses.map((status) => condition[status]))
    : undefined;
}

async function saleInstallmentRows(filters: ReportFilters, today: string) {
  return db
    .select({
      kid: kids.name,
      guardian: kids.guardianName,
      phone: sql<string | null>`coalesce(${kids.guardianPhone}, ${kids.contact})`,
      item: items.name,
      number: installments.number,
      count: sql<number>`(
        select count(*)::int from installments other
        where other.sale_id = "installments"."sale_id"
      )`,
      dueDate: installments.dueDate,
      amount: installments.amount,
      entryId: installments.entryId,
      paidDate: entries.entryDate,
      paymentMethod: entries.paymentMethod,
    })
    .from(installments)
    .innerJoin(sales, eq(sales.id, installments.saleId))
    .innerJoin(kids, eq(kids.id, sales.kidId))
    .innerJoin(items, eq(items.id, sales.itemId))
    .leftJoin(entries, eq(entries.id, installments.entryId))
    .where(
      and(
        ...dateBetween(installments.dueDate, filters, today),
        installmentStatus(installments, filters, today),
        filters.kidId ? eq(sales.kidId, filters.kidId) : undefined,
        filters.itemId ? eq(sales.itemId, filters.itemId) : undefined
      )
    )
    .orderBy(asc(installments.id));
}

async function eventInstallmentRows(filters: ReportFilters, today: string) {
  return db
    .select({
      kid: sql<string>`coalesce(${kids.name}, ${eventParticipants.guestName})`,
      guardian: kids.guardianName,
      phone: sql<string | null>`coalesce(${kids.guardianPhone}, ${kids.contact})`,
      item: events.name,
      number: eventInstallments.number,
      count: sql<number>`(
        select count(*)::int from event_installments other
        where other.participant_id = "event_installments"."participant_id"
      )`,
      dueDate: eventInstallments.dueDate,
      amount: eventInstallments.amount,
      entryId: eventInstallments.entryId,
      paidDate: entries.entryDate,
      paymentMethod: entries.paymentMethod,
    })
    .from(eventInstallments)
    .innerJoin(eventParticipants, eq(eventParticipants.id, eventInstallments.participantId))
    .innerJoin(events, eq(events.id, eventParticipants.eventId))
    .leftJoin(kids, eq(kids.id, eventParticipants.kidId))
    .leftJoin(entries, eq(entries.id, eventInstallments.entryId))
    .where(
      and(
        ...dateBetween(eventInstallments.dueDate, filters, today),
        installmentStatus(eventInstallments, filters, today),
        filters.kidId ? eq(eventParticipants.kidId, filters.kidId) : undefined
      )
    )
    .orderBy(asc(eventInstallments.id));
}

async function saleRows(filters: ReportFilters, today: string): Promise<ReportRow[]> {
  const rows = await db
    .select({
      date: sales.saleDate,
      kid: kids.name,
      item: items.name,
      quantity: sales.quantity,
      unitPrice: sales.unitPrice,
      total: sales.total,
      paid: sql<string>`(
        select coalesce(sum(installment.amount), 0) from installments installment
        where installment.sale_id = "sales"."id" and installment.entry_id is not null
      )`,
      note: sales.note,
    })
    .from(sales)
    .innerJoin(kids, eq(kids.id, sales.kidId))
    .innerJoin(items, eq(items.id, sales.itemId))
    .where(
      and(
        ...dateBetween(sales.saleDate, filters, today),
        filters.kidId ? eq(sales.kidId, filters.kidId) : undefined,
        filters.itemId ? eq(sales.itemId, filters.itemId) : undefined
      )
    )
    .orderBy(asc(sales.saleDate), asc(sales.id));

  return rows.map((row) => {
    const total = Number(row.total);
    const paid = Number(row.paid);
    return {
      ...row,
      unitPrice: Number(row.unitPrice),
      total,
      paid,
      open: Math.round((total - paid) * 100) / 100,
    };
  });
}

// Correlated subqueries spell out the outer column; see lib/inventory.ts.
// Services have no stock, so only items that count it are listed. The average
// cost comes from restocks that recorded what was paid.
async function stockRows(filters: ReportFilters): Promise<ReportRow[]> {
  const rows = await db
    .select({
      item: items.name,
      price: items.price,
      stock: sql<number>`coalesce((
        select sum(movement.quantity)::int from stock_movements movement
        where movement.item_id = "items"."id"
      ), 0)`,
      averageCost: sql<string | null>`(
        select sum(entry.amount) / nullif(sum(movement.quantity), 0)
        from stock_movements movement
        join entries entry on entry.id = movement.entry_id
        where movement.item_id = "items"."id" and movement.reason = 'restock'
      )`,
    })
    .from(items)
    .where(and(eq(items.tracksStock, true), filters.itemId ? eq(items.id, filters.itemId) : undefined))
    .orderBy(asc(items.name), asc(items.id));

  return rows
    .filter((row) =>
      filters.stockState === "low"
        ? row.stock > 0 && row.stock <= LOW_STOCK
        : filters.stockState === "out"
          ? row.stock <= 0
          : true
    )
    .map((row) => {
      const price = Number(row.price);
      const averageCost = row.averageCost === null ? null : Math.round(Number(row.averageCost) * 100) / 100;
      const units = Math.max(row.stock, 0);
      return {
        item: row.item,
        stock: row.stock,
        price,
        averageCost,
        costValue: averageCost === null ? null : Math.round(units * averageCost * 100) / 100,
        saleValue: Math.round(units * price * 100) / 100,
      };
    });
}

export async function fetchReportRows(filters: ReportFilters, today: string) {
  switch (filters.type) {
    case "entries":
      return entryRows(filters, today);
    case "installments":
      return installmentRows(filters, today);
    case "sales":
      return saleRows(filters, today);
    case "stock":
      return stockRows(filters);
  }
}

// Choices for the filter panel. Removed users stay, since their entries remain.
export async function listFilterOptions() {
  const [categoryRows, kidRows, itemRows, userRows] = await Promise.all([
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
    db.select({ id: kids.id, name: kids.name }).from(kids).orderBy(asc(kids.name)),
    db.select({ id: items.id, name: items.name }).from(items).orderBy(asc(items.name)),
    db.select({ id: users.id, name: users.name }).from(users).orderBy(asc(users.name)),
  ]);
  return { categories: categoryRows, kids: kidRows, items: itemRows, users: userRows };
}

export type FilterOptions = Awaited<ReturnType<typeof listFilterOptions>>;

export function filterNames(options: FilterOptions): FilterNames {
  const toMap = (list: { id: number; name: string }[]) =>
    new Map(list.map((option) => [option.id, option.name]));
  return {
    categories: toMap(options.categories),
    kids: toMap(options.kids),
    items: toMap(options.items),
    users: toMap(options.users),
  };
}

export async function listReportTemplates() {
  return db.select().from(reportTemplates).orderBy(asc(reportTemplates.id));
}
