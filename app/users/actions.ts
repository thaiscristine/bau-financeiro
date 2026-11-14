"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentSessionId } from "@/auth";
import {
  parseForm,
  passwordChangeFormSchema,
  passwordResetFormSchema,
  userFormSchema,
} from "@/lib/validation";
import { requireSession } from "@/lib/dal";
import { pgErrorCode, PG_UNIQUE_VIOLATION } from "@/lib/db-errors";
import {
  clearLoginAttempts,
  clientIp,
  registerLoginAttempt,
} from "@/lib/login-throttle";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { deleteOtherUserSessions, deleteUserSessions } from "@/lib/sessions";

export type UserFormState = { error?: string; saved?: number } | undefined;

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
  const passwordHash = await hashPassword(password);

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
  await deleteUserSessions(id);

  revalidatePath("/users");
}

export type PasswordChangeState = { error?: string; saved?: number } | undefined;

export async function changePassword(
  _prevState: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  const session = await requireSession();
  const userId = Number(session.user.id);

  const result = parseForm(passwordChangeFormSchema, {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!result.ok) return { error: result.error };
  const { currentPassword, newPassword } = result.data;

  const passwordError = await checkOwnPassword(
    userId,
    currentPassword,
    "A senha atual está incorreta."
  );
  if (passwordError) return { error: passwordError };

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(users.id, userId));

  // Whoever knew the old password shouldn't stay logged in elsewhere
  const sessionId = await currentSessionId();
  if (sessionId) {
    await deleteOtherUserSessions(userId, sessionId);
  } else {
    await deleteUserSessions(userId);
  }

  return { saved: Date.now() };
}

export type PasswordResetState = { error?: string; saved?: number } | undefined;

export async function resetPassword(
  _prevState: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const session = await requireSession();
  const ownId = Number(session.user.id);

  const result = parseForm(passwordResetFormSchema, {
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
    ownPassword: formData.get("ownPassword"),
  });
  if (!result.ok) return { error: result.error };
  const { userId, newPassword, ownPassword } = result.data;

  if (userId === ownId) {
    return { error: "Para a sua própria senha, use o formulário Trocar a sua senha." };
  }

  const passwordError = await checkOwnPassword(
    ownId,
    ownPassword,
    "A sua senha está incorreta."
  );
  if (passwordError) return { error: passwordError };

  const [teammate] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning({ email: users.email });
  if (!teammate) return { error: "Essa pessoa não está mais cadastrada." };

  // The old password stops working everywhere, and a lockout from forgetting
  // it shouldn't keep them out of the new one
  await deleteUserSessions(userId);
  await clearLoginAttempts(teammate.email.toLowerCase());

  return { saved: Date.now() };
}

// Asks for the logged-in person's own password before changing any password.
// A wrong one counts like a wrong one on the login page, so someone at an
// unattended logged-in browser can't guess freely and then take an account
// over with a new password. Returns the message to show, or null when right.
async function checkOwnPassword(
  userId: number,
  password: string,
  wrongMessage: string
) {
  const [user] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const email = user.email.toLowerCase();

  const attempt = await registerLoginAttempt(email, clientIp(await headers()));
  if (!attempt.allowed) {
    const minutes = Math.ceil(attempt.retryAfterSeconds / 60);
    return `Muitas tentativas com a senha errada. Tente novamente em ${minutes} min.`;
  }
  const { matches } = await verifyPassword(password, user.passwordHash);
  if (!matches) return wrongMessage;

  await clearLoginAttempts(email);
  return null;
}
