import { eq, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { users } from "../db/schema";
import { hashPassword } from "../lib/passwords";
import { emailSchema, newPasswordSchema, parseForm } from "../lib/validation";

// Credentials come from the environment so no password ever lands in git.
function readPerson() {
  const name = process.env.SEED_NAME;
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("Set SEED_NAME, SEED_EMAIL and SEED_PASSWORD.");
  }
  // Same rules as the app, so the seed can't create a login the app refuses
  const validEmail = parseForm(emailSchema, email);
  if (!validEmail.ok) throw new Error(`SEED_EMAIL: ${validEmail.error}`);
  const validPassword = parseForm(newPasswordSchema, password);
  if (!validPassword.ok) throw new Error(`SEED_PASSWORD: ${validPassword.error}`);

  return { name, email: validEmail.data, password };
}

async function main() {
  const person = readPerson();
  const passwordHash = await hashPassword(person.password);

  // Login matches e-mails ignoring case, so the seed does too
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(sql`lower(${users.email})`, person.email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      // Also restores a removed user, so the seed is a way back in
      .set({ name: person.name, passwordHash, deletedAt: null })
      .where(eq(users.id, existing.id));
    console.log(`Updated ${person.email}`);
  } else {
    await db.insert(users).values({
      name: person.name,
      email: person.email,
      passwordHash,
    });
    console.log(`Created ${person.email}`);
  }
}

main()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    return pool.end().finally(() => process.exit(1));
  });
