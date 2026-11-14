import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { count, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { loginAttempts } from "@/db/schema";
import {
  clearLoginAttempts,
  registerLoginAttempt,
} from "@/lib/login-throttle";
import { resetDatabase } from "../test-db";

beforeEach(() => resetDatabase(pool));
after(() => pool.end());

async function attempt(times: number, email: string, ip: string | null) {
  const results = [];
  for (let i = 0; i < times; i++) {
    results.push((await registerLoginAttempt(email, ip)).allowed);
  }
  return results;
}

test("five attempts per e-mail go through and the sixth is refused", async () => {
  assert.deepEqual(await attempt(6, "ana@example.com", "203.0.113.1"), [
    true,
    true,
    true,
    true,
    true,
    false,
  ]);
});

test("a locked e-mail stays locked from another address", async () => {
  await attempt(5, "ana@example.com", "203.0.113.1");
  assert.deepEqual(await attempt(1, "ana@example.com", "203.0.113.2"), [false]);
});

test("locking one e-mail leaves the others alone", async () => {
  await attempt(6, "ana@example.com", "203.0.113.1");
  assert.deepEqual(await attempt(1, "bia@example.com", "203.0.113.2"), [true]);
});

test("one address can try at most twenty times across e-mails", async () => {
  const results = [];
  for (let i = 1; i <= 21; i++) {
    results.push(
      (await registerLoginAttempt(`person${i}@example.com`, "203.0.113.1"))
        .allowed
    );
  }
  assert.deepEqual(results, [...Array(20).fill(true), false]);
});

test("without a known address only the e-mail limit applies", async () => {
  for (let i = 1; i <= 25; i++) {
    const { allowed } = await registerLoginAttempt(`p${i}@example.com`, null);
    assert.equal(allowed, true);
  }
});

test("attempts older than fifteen minutes stop counting", async () => {
  for (let i = 0; i < 5; i++) {
    await db.insert(loginAttempts).values({
      email: "ana@example.com",
      ip: "203.0.113.1",
      createdAt: sql`now() - interval '16 minutes'`,
    });
  }
  assert.deepEqual(await attempt(1, "ana@example.com", "203.0.113.1"), [true]);
});

test("a refused attempt says how long until the e-mail unlocks", async () => {
  for (let i = 0; i < 5; i++) {
    await db.insert(loginAttempts).values({
      email: "ana@example.com",
      ip: null,
      createdAt: sql`now() - interval '10 minutes'`,
    });
  }
  const result = await registerLoginAttempt("ana@example.com", null);
  assert.ok(!result.allowed);
  const wait = result.retryAfterSeconds;
  assert.ok(wait > 295 && wait <= 300, `waits ${wait}s`);
});

test("a refused attempt says how long until the address unlocks", async () => {
  for (let i = 0; i < 20; i++) {
    await db.insert(loginAttempts).values({
      email: `person${i}@example.com`,
      ip: "203.0.113.1",
      createdAt: sql`now() - interval '5 minutes'`,
    });
  }
  const result = await registerLoginAttempt("ana@example.com", "203.0.113.1");
  assert.ok(!result.allowed);
  const wait = result.retryAfterSeconds;
  assert.ok(wait > 595 && wait <= 600, `waits ${wait}s`);
});

test("trying again while locked out doesn't extend the wait", async () => {
  await attempt(5, "ana@example.com", "203.0.113.1");
  await attempt(10, "ana@example.com", "203.0.113.1");

  const [{ total }] = await db.select({ total: count() }).from(loginAttempts);
  assert.equal(total, 5);
});

test("a successful login clears the e-mail's attempts", async () => {
  await attempt(6, "ana@example.com", "203.0.113.1");
  await clearLoginAttempts("ana@example.com");
  assert.deepEqual(await attempt(1, "ana@example.com", "203.0.113.1"), [true]);
});

test("attempts older than a day are removed", async () => {
  await db.insert(loginAttempts).values({
    email: "old@example.com",
    ip: "203.0.113.9",
    createdAt: sql`now() - interval '2 days'`,
  });
  await registerLoginAttempt("ana@example.com", "203.0.113.1");

  const [{ total }] = await db.select({ total: count() }).from(loginAttempts);
  assert.equal(total, 1);
});

// Each burst leaves the other limit out of reach, so one can't hide a
// failure of the other
async function countAllowed(attempts: Promise<{ allowed: boolean }>[]) {
  const results = await Promise.all(attempts);
  return results.filter((result) => result.allowed).length;
}

test("a parallel burst on one e-mail lets at most five through", async () => {
  const allowed = await countAllowed(
    Array.from({ length: 30 }, () =>
      registerLoginAttempt("ana@example.com", null)
    )
  );
  assert.ok(allowed <= 5, `${allowed} attempts got through`);
});

test("a parallel burst from one address lets at most twenty through", async () => {
  const allowed = await countAllowed(
    Array.from({ length: 40 }, (_, i) =>
      registerLoginAttempt(`person${i}@example.com`, "203.0.113.1")
    )
  );
  assert.ok(allowed <= 20, `${allowed} attempts got through`);
});
