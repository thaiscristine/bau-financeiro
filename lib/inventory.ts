import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entries, items, stockMovements } from "@/db/schema";

// Drizzle leaves columns unqualified in single-table selects, where "id" inside a
// subquery would mean the subquery's own table. Correlated subqueries therefore
// spell out the outer column.
const stockExpr = sql<number>`coalesce((
  select sum(movement.quantity)::int from stock_movements movement
  where movement.item_id = "items"."id"
), 0)`;

export async function listItems() {
  return db
    .select({
      id: items.id,
      name: items.name,
      price: items.price,
      tracksStock: items.tracksStock,
      stock: stockExpr,
    })
    .from(items)
    .orderBy(asc(items.name));
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

export async function listStockMovements(itemId: number) {
  return db
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
    .orderBy(desc(stockMovements.movementDate), desc(stockMovements.id));
}
