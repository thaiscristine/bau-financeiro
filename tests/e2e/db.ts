import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { resetDatabase, testDatabaseUrl } from "../test-db";

// The tests talk to the same database as the app server they drive. Every
// spec file in a worker shares this pool, which closes itself once idle.
const pool = new Pool({
  connectionString: testDatabaseUrl(),
  allowExitOnIdle: true,
});

export function reset() {
  return resetDatabase(pool);
}

export async function createUser(name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    "insert into users (name, email, password_hash) values ($1, $2, $3)",
    [name, email, passwordHash]
  );
}

// A service item, so a sale needs no stock
export async function createItem(name: string, price: string) {
  const { rows } = await pool.query<{ id: number }>(
    "insert into categories (name) values ($1) returning id",
    [`Categoria de ${name}`]
  );
  await pool.query(
    "insert into items (name, category_id, price, tracks_stock) values ($1, $2, $3, false)",
    [name, rows[0].id, price]
  );
}
