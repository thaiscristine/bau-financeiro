import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  findSessionUserId,
} from "@/lib/sessions";
import { resetDatabase } from "../test-db";

beforeEach(() => resetDatabase(pool));
after(() => pool.end());

async function createUser(email: string) {
  const [user] = await db
    .insert(users)
    .values({ name: email, email, passwordHash: "not-a-real-hash" })
    .returning({ id: users.id });
  return user.id;
}

test("a new session belongs to the user who logged in", async () => {
  const userId = await createUser("ana@example.com");
  const sessionId = await createSession(userId);
  assert.equal(await findSessionUserId(sessionId), userId);
});

test("session ids are long random strings", async () => {
  const userId = await createUser("ana@example.com");
  const first = await createSession(userId);
  const second = await createSession(userId);
  assert.match(first, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first, second);
});

test("an unknown session id finds nobody", async () => {
  assert.equal(await findSessionUserId("made-up"), null);
});

test("a deleted session finds nobody", async () => {
  const userId = await createUser("ana@example.com");
  const sessionId = await createSession(userId);
  await deleteSession(sessionId);
  assert.equal(await findSessionUserId(sessionId), null);
});

test("a removed user's session finds nobody", async () => {
  const userId = await createUser("ana@example.com");
  const sessionId = await createSession(userId);
  await db
    .update(users)
    .set({ deletedAt: new Date() })
    .where(eq(users.id, userId));
  assert.equal(await findSessionUserId(sessionId), null);
});

test("a session ends thirty days after the login", async () => {
  const userId = await createUser("ana@example.com");
  const sessionId = await createSession(userId);
  await db
    .update(sessions)
    .set({ createdAt: sql`now() - interval '31 days'` })
    .where(eq(sessions.id, sessionId));
  assert.equal(await findSessionUserId(sessionId), null);
});

test("ending a user's sessions leaves other users logged in", async () => {
  const ana = await createUser("ana@example.com");
  const bia = await createUser("bia@example.com");
  const anaPhone = await createSession(ana);
  const anaLaptop = await createSession(ana);
  const biaLaptop = await createSession(bia);

  await deleteUserSessions(ana);

  assert.equal(await findSessionUserId(anaPhone), null);
  assert.equal(await findSessionUserId(anaLaptop), null);
  assert.equal(await findSessionUserId(biaLaptop), bia);
});

test("expired sessions are removed when someone logs in", async () => {
  const userId = await createUser("ana@example.com");
  const old = await createSession(userId);
  await db
    .update(sessions)
    .set({ createdAt: sql`now() - interval '31 days'` })
    .where(eq(sessions.id, old));

  await createSession(userId);

  const rows = await db.select({ id: sessions.id }).from(sessions);
  assert.equal(rows.length, 1);
  assert.notEqual(rows[0].id, old);
});
