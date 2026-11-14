// Creates the test database when it's missing and brings it to the latest
// migration. Runs before the database and end-to-end tests.
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { testDatabaseUrl } from "./test-db";

async function main() {
  const url = testDatabaseUrl();
  const name = new URL(url).pathname.slice(1);

  const server = new URL(url);
  server.pathname = "/postgres";
  const client = new Client({ connectionString: server.toString() });
  await client.connect();
  const { rowCount } = await client.query(
    "select 1 from pg_database where datname = $1",
    [name]
  );
  if (rowCount === 0) {
    await client.query(`create database ${client.escapeIdentifier(name)}`);
  }
  await client.end();

  const pool = new Pool({ connectionString: url });
  await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
