import { and, desc, eq, gt, lt, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

// After this many failed logins inside the window, new attempts are refused
// until older ones age out. The e-mail limit stops guessing one person's
// password; the IP limit stops one machine from trying many e-mails.
const WINDOW = sql`interval '15 minutes'`;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 20;

export type LoginAttemptResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

// The client address as seen by the platform. On Vercel the first
// x-forwarded-for entry is set by the edge network, not by the browser.
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}

// Records the attempt first and only then counts, so a burst of parallel
// requests can't all slip in before any of them is written down.
export async function registerLoginAttempt(
  email: string,
  ip: string | null
): Promise<LoginAttemptResult> {
  const [attempt] = await db
    .insert(loginAttempts)
    .values({ email, ip })
    .returning({ id: loginAttempts.id });
  // Rows only matter inside the window, so old ones can go
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, sql`now() - interval '1 day'`));

  const waits = await Promise.all([
    secondsUntilAllowed(eq(loginAttempts.email, email), MAX_PER_EMAIL, attempt.id),
    ip
      ? secondsUntilAllowed(eq(loginAttempts.ip, ip), MAX_PER_IP, attempt.id)
      : 0,
  ]);
  const retryAfterSeconds = Math.max(...waits);
  if (retryAfterSeconds === 0) return { allowed: true };

  // A refused attempt doesn't count, so clicking again while locked out
  // doesn't push the end of the wait further away
  await db.delete(loginAttempts).where(eq(loginAttempts.id, attempt.id));
  return { allowed: false, retryAfterSeconds };
}

// Zero when fewer than `max` other attempts match inside the window.
// Otherwise, how long until the oldest of the latest `max` ages out.
async function secondsUntilAllowed(match: SQL, max: number, ownId: number) {
  const [blocking] = await db
    .select({
      seconds: sql<string>`extract(epoch from ${loginAttempts.createdAt} + ${WINDOW} - now())`,
    })
    .from(loginAttempts)
    .where(
      and(
        match,
        ne(loginAttempts.id, ownId),
        gt(loginAttempts.createdAt, sql`now() - ${WINDOW}`)
      )
    )
    .orderBy(desc(loginAttempts.createdAt))
    .offset(max - 1)
    .limit(1);
  return blocking ? Math.max(1, Math.ceil(Number(blocking.seconds))) : 0;
}

export async function clearLoginAttempts(email: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.email, email));
}
