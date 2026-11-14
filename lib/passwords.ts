import bcrypt from "bcryptjs";

// Work factor for new hashes. Older hashes made with less are upgraded on the
// next successful login.
const COST = 12;

// Compared against when the e-mail has no account, so a wrong e-mail takes as
// long as a wrong password and the response time doesn't reveal which e-mails
// exist. Its password doesn't matter: nothing ever logs in with it.
const DUMMY_HASH = "$2b$12$m4hK7WJa7So.v4KyXlLLQevcn0yQxuXPOaZ8emfH3geyfqNCixWaW";

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

// A null hash means there's no account; the check still runs and fails.
export async function verifyPassword(password: string, hash: string | null) {
  const matches = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return {
    matches: matches && hash !== null,
    needsRehash: hash !== null && bcrypt.getRounds(hash) < COST,
  };
}
