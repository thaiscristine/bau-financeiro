"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { parseForm, userFormSchema } from "@/lib/validation";
import { requireSession } from "@/lib/dal";

export type UserFormState = { error?: string; saved?: number } | undefined;

const PG_UNIQUE_VIOLATION = "23505";

function pgErrorCode(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return cause?.code ?? (error as { code?: string })?.code;
}

export async function createUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireSession();

  const result = parseForm(userFormSchema, {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!result.ok) return { error: result.error };

  const { name, email, password } = result.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [existing] = await db
    .select({ id: users.id, deletedAt: users.deletedAt })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  if (existing && !existing.deletedAt) {
    return { error: "Já existe um usuário com esse e-mail." };
  }

  try {
    if (existing) {
      // Someone removed before is coming back: reuse their row so the history
      // they recorded stays linked to them
      await db
        .update(users)
        .set({ name, email, passwordHash, deletedAt: null })
        .where(eq(users.id, existing.id));
    } else {
      await db.insert(users).values({ name, email, passwordHash });
    }
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) {
      return { error: "Já existe um usuário com esse e-mail." };
    }
    throw error;
  }

  revalidatePath("/users");
  // A new value each save lets the form reset itself after success
  return { saved: Date.now() };
}

export async function deleteUser(id: number) {
  const session = await requireSession();

  if (id === Number(session.user.id)) {
    throw new Error("Você não pode excluir o seu próprio usuário.");
  }

  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(and(eq(users.id, id), isNull(users.deletedAt)));

  revalidatePath("/users");
}
