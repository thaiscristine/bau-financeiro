import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { resetDatabase, testDatabaseUrl } from "../test-db";

// The tests talk to the same database as the app server they drive
export const pool = new Pool({ connectionString: testDatabaseUrl() });

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
