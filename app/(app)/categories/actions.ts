"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { categoryFormSchema, parseForm } from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { EVENTS_CATEGORY_NAME, LOCKED_CATEGORY_NAMES } from "@/lib/category-names";
import { pgErrorCode, PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from "@/lib/db-errors";

export type CategoryFormState = { error?: string; saved?: number } | undefined;

function revalidateCategories() {
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/entries");
  revalidatePath("/inventory");
}

async function saveCategory(id: number | null, formData: FormData) {
  const result = parseForm(categoryFormSchema, { name: formData.get("name") });
  if (!result.ok) return { error: result.error };

  try {
    if (id === null) {
      await db.insert(categories).values(result.data);
    } else {
      const updated = await db
        .update(categories)
        .set(result.data)
        .where(and(eq(categories.id, id), notInArray(categories.name, LOCKED_CATEGORY_NAMES)))
        .returning({ id: categories.id });
      if (updated.length === 0) {
        return { error: "Esta categoria não pode ser renomeada." };
      }
    }
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return { error: "Já existe uma categoria com esse nome." };
    }
    throw error;
  }

  revalidateCategories();
  // A new value each save lets the form reset itself after success
  return { saved: Date.now() };
}

export async function createCategory(
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requireSession();
  return saveCategory(null, formData);
}

export async function renameCategory(
  id: number,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requireSession();
  return saveCategory(id, formData);
}

export async function deleteCategory(id: number) {
  await requireSession();

  try {
    await db
      .delete(categories)
      .where(and(eq(categories.id, id), notInArray(categories.name, LOCKED_CATEGORY_NAMES)));
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new Error("Esta categoria está em uso e não pode ser excluída.");
    }
    throw error;
  }

  revalidateCategories();
}

export type CategoryRule = "requiresKid" | "allowsManualEntry";

export async function setCategoryRule(
  id: number,
  rule: CategoryRule,
  value: boolean
) {
  await requireSession();

  // Monthly contributions are recorded in the one category that requires a kid
  if (rule === "requiresKid" && value) {
    const [other] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.requiresKid, true), ne(categories.id, id)))
      .limit(1);
    if (other) return;
  }

  // Event money is only recorded from the Eventos screen, so its rules stay put
  await db
    .update(categories)
    .set({ [rule]: value })
    .where(and(eq(categories.id, id), ne(categories.name, EVENTS_CATEGORY_NAME)));

  revalidateCategories();
}
