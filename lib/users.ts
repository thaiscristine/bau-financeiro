import "server-only";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// People who can log in. Removed users stay in the table for the history.
export async function listActiveUsers() {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.name));
}
