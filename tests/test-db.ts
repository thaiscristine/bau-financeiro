import { existsSync } from "node:fs";
import type { Pool } from "pg";

// Locally the test database URL lives in .env.local, next to the dev one
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

// Tests wipe every table, so they only run against a database whose name
// says it's for tests. That keeps a mistyped URL from erasing real data.
export function testDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("Set TEST_DATABASE_URL to run these tests.");
  }
  if (!new URL(url).pathname.endsWith("_test")) {
    throw new Error("TEST_DATABASE_URL must name a database ending in _test.");
  }
  return url;
}

export async function resetDatabase(pool: Pool) {
  const { rows } = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public'"
  );
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
  await pool.query(`truncate ${tables} restart identity cascade`);
}
