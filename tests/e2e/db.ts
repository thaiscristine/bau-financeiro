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

// Cost 12 is what the app uses; a lower one stands in for an older hash
export async function createUser(
  name: string,
  email: string,
  password: string,
  cost = 12
) {
  const passwordHash = await bcrypt.hash(password, cost);
  await pool.query(
    "insert into users (name, email, password_hash) values ($1, $2, $3)",
    [name, email, passwordHash]
  );
}

export async function passwordHashOf(email: string) {
  const { rows } = await pool.query<{ password_hash: string }>(
    "select password_hash from users where email = $1",
    [email]
  );
  return rows[0].password_hash;
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
