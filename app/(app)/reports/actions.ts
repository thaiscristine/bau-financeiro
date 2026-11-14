"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reportTemplates } from "@/db/schema";
import { parseForm, reportTemplateFormSchema } from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { pgErrorCode, PG_UNIQUE_VIOLATION } from "@/lib/db-errors";
import { normalizeReportQuery } from "@/lib/reports/filters";

export type TemplateFormState = { error?: string; saved?: number } | undefined;

const DUPLICATE_NAME = "Já existe um modelo com esse nome.";
const GONE = "Este modelo não existe mais.";

function templateUrl(query: string, id: number) {
  return `/reports?${query}&template=${id}`;
}

// Saves the filters on screen as a new template and opens it
export async function createTemplate(
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  await requireSession();
  const result = parseForm(reportTemplateFormSchema, { name: formData.get("name") });
  if (!result.ok) return { error: result.error };
  const query = normalizeReportQuery(String(formData.get("query") ?? ""));

  let id: number;
  try {
    [{ id }] = await db
      .insert(reportTemplates)
      .values({ name: result.data.name, query })
      .returning({ id: reportTemplates.id });
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return { error: DUPLICATE_NAME };
    throw error;
  }

  revalidatePath("/reports");
  redirect(templateUrl(query, id));
}

export async function renameTemplate(
  id: number,
  _prevState: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  await requireSession();
  const result = parseForm(reportTemplateFormSchema, { name: formData.get("name") });
  if (!result.ok) return { error: result.error };

  try {
    const updated = await db
      .update(reportTemplates)
      .set({ name: result.data.name, updatedAt: new Date() })
      .where(eq(reportTemplates.id, id))
      .returning({ id: reportTemplates.id });
    if (updated.length === 0) return { error: GONE };
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return { error: DUPLICATE_NAME };
    throw error;
  }

  revalidatePath("/reports");
  return { saved: Date.now() };
}

// Replaces a template's filters with the ones on screen
export async function updateTemplateFilters(id: number, query: string) {
  await requireSession();
  const normalized = normalizeReportQuery(query);

  const updated = await db
    .update(reportTemplates)
    .set({ query: normalized, updatedAt: new Date() })
    .where(eq(reportTemplates.id, id))
    .returning({ id: reportTemplates.id });
  if (updated.length === 0) throw new Error(GONE);

  revalidatePath("/reports");
  redirect(templateUrl(normalized, id));
}

export async function deleteTemplate(id: number) {
  await requireSession();
  await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
  revalidatePath("/reports");
}
