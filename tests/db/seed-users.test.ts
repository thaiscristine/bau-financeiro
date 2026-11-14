import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";
import { db, pool } from "@/db";
import { users } from "@/db/schema";
import { resetDatabase } from "../test-db";

beforeEach(() => resetDatabase(pool));
after(() => pool.end());

// Runs the script the way `npm run seed` does, against the test database
function seed(name: string, email: string, password: string) {
  return promisify(execFile)("npx", ["tsx", "scripts/seed-users.ts"], {
    env: {
      ...process.env,
      SEED_NAME: name,
      SEED_EMAIL: email,
      SEED_PASSWORD: password,
    },
  });
}

test("seeding an e-mail in another case updates the existing user", async () => {
  await db.insert(users).values({
    name: "Ana",
    email: "ana@example.com",
    passwordHash: "old-hash",
    deletedAt: new Date(),
  });

  await seed("Ana Souza", "Ana@Example.com", "nova-senha-da-ana");

  const rows = await db.select().from(users);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Ana Souza");
  assert.equal(rows[0].deletedAt, null);
  assert.equal(await bcrypt.compare("nova-senha-da-ana", rows[0].passwordHash), true);
  assert.equal(bcrypt.getRounds(rows[0].passwordHash), 12);
});

test("a new seeded user gets a lowercase e-mail", async () => {
  await seed("Bia", "Bia@Example.com", "senha-da-bia");

  const rows = await db.select().from(users);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, "bia@example.com");
});

test("the seed refuses a password the app would refuse", async () => {
  await assert.rejects(seed("Bia", "bia@example.com", "a".repeat(73)), /SEED_PASSWORD/);
  assert.equal((await db.select().from(users)).length, 0);
});
