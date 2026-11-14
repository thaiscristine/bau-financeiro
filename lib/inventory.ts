import "server-only";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, items, stockMovements } from "@/db/schema";

// Drizzle leaves columns unqualified in single-table selects, where "id" inside a
// subquery would mean the subquery's own table. Correlated subqueries therefore
// spell out the outer column.
const stockExpr = sql<number>`coalesce((
  select sum(movement.quantity)::int from stock_movements movement
  where movement.item_id = "items"."id"
), 0)`;

function itemsQuery() {
  return db
    .select({
      id: items.id,
      name: items.name,
      price: items.price,
      tracksStock: items.tracksStock,
      stock: stockExpr,
    })
    .from(items)
    // id breaks ties between equal names so pages never overlap or skip rows
    .orderBy(asc(items.name), asc(items.id));
}

export async function listItems() {
  return itemsQuery();
}

export async function listItemsPage(page: number, pageSize: number) {
  const [rows, [{ total }]] = await Promise.all([
    itemsQuery()
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(items),
  ]);
  return { rows, total };
}

export async function getItem(id: number) {
  const [item] = await db
    .select({
      id: items.id,
      name: items.name,
      price: items.price,
      tracksStock: items.tracksStock,
      stock: stockExpr,
      hasSales: sql<boolean>`exists(
        select 1 from sales sale where sale.item_id = "items"."id"
      )`,
    })
    .from(items)
    .where(eq(items.id, id))
    .limit(1);
  return item;
}

export async function listStockMovementsPage(
  itemId: number,
  page: number,
  pageSize: number
) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: stockMovements.id,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        saleId: stockMovements.saleId,
        note: stockMovements.note,
        movementDate: stockMovements.movementDate,
        cost: entries.amount,
        supplier: entries.counterparty,
      })
      .from(stockMovements)
      .leftJoin(entries, eq(entries.id, stockMovements.entryId))
      .where(eq(stockMovements.itemId, itemId))
      .orderBy(desc(stockMovements.movementDate), desc(stockMovements.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(stockMovements)
      .where(eq(stockMovements.itemId, itemId)),
  ]);
  return { rows, total };
}
