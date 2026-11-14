import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const pool = new Pool({
  connectionString: process.env.MB_DATABASE_URL,
});

// On Vercel, open connections are reused by the next requests to the same
// instance and closed before the instance is suspended, instead of leaking
attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
