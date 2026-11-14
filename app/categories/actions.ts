"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { categoryFormSchema, parseForm } from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { SHOP_CATEGORY_NAME } from "@/lib/categories";

export type CategoryFormState = { error?: string; saved?: number } | undefined;

const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";

function pgErrorCode(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (error as { code?: string })?.code;
}

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
        .where(and(eq(categories.id, id), ne(categories.name, SHOP_CATEGORY_NAME)))
        .returning({ id: categories.id });
      if (updated.length === 0) {
        return { error: `A categoria ${SHOP_CATEGORY_NAME} não pode ser renomeada.` };
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
      .where(and(eq(categories.id, id), ne(categories.name, SHOP_CATEGORY_NAME)));
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

  await db
    .update(categories)
    .set({ [rule]: value })
    .where(eq(categories.id, id));

  revalidateCategories();
}
