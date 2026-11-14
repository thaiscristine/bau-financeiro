import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, entries, items } from "@/db/schema";

// Every inventory item belongs to this category, so installment payments land
// in it. It can't be renamed or deleted.
export const SHOP_CATEGORY_NAME = "Lojinha";

export async function getShopCategoryId() {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.name, SHOP_CATEGORY_NAME))
    .limit(1);
  return category?.id;
}

export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.name));
}

// Categories with how many entries and items use them, so unused ones can be deleted
export async function listCategoriesWithUsage() {
  const entryCount = db
    .select({
      categoryId: entries.categoryId,
      count: sql<number>`count(*)::int`.as("entry_count"),
    })
    .from(entries)
    .groupBy(entries.categoryId)
    .as("entry_counts");
  const itemCount = db
    .select({
      categoryId: items.categoryId,
      count: sql<number>`count(*)::int`.as("item_count"),
    })
    .from(items)
    .groupBy(items.categoryId)
    .as("item_counts");

  return db
    .select({
      id: categories.id,
      name: categories.name,
      requiresKid: categories.requiresKid,
      allowsManualEntry: categories.allowsManualEntry,
      entryCount: sql<number>`coalesce(${entryCount.count}, 0)`,
      itemCount: sql<number>`coalesce(${itemCount.count}, 0)`,
    })
    .from(categories)
    .leftJoin(entryCount, eq(entryCount.categoryId, categories.id))
    .leftJoin(itemCount, eq(itemCount.categoryId, categories.id))
    .orderBy(asc(categories.name));
}
