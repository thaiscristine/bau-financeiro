import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

// However active a session is, it ends this long after the login
const MAX_SESSION_AGE = sql`interval '30 days'`;

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({ id, userId });
  await db
    .delete(sessions)
    .where(lt(sessions.createdAt, sql`now() - ${MAX_SESSION_AGE}`));
  return id;
}

// The user behind a session, or null once it was ended, expired or the user
// was removed
export async function findSessionUserId(id: string) {
  const [row] = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.id, id),
        gt(sessions.createdAt, sql`now() - ${MAX_SESSION_AGE}`),
        isNull(users.deletedAt)
      )
    )
    .limit(1);
  return row?.userId ?? null;
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function deleteUserSessions(userId: number) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

// Logs the user out on every browser except the one making the request
export async function deleteOtherUserSessions(userId: number, keepId: string) {
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepId)));
}
