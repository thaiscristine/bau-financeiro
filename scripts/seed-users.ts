import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { users } from "../db/schema";

// Credentials come from the environment so no password ever lands in git.
function readPerson() {
  const name = process.env.SEED_NAME;
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;

  if (!name || !email || !password) {
    throw new Error("Set SEED_NAME, SEED_EMAIL and SEED_PASSWORD.");
  }
  if (password.length < 8) {
    throw new Error("SEED_PASSWORD must be at least 8 characters.");
  }

  return { name, email, password };
}

async function main() {
  const person = readPerson();
  const passwordHash = await bcrypt.hash(person.password, 10);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, person.email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ name: person.name, passwordHash })
      .where(eq(users.email, person.email));
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
