import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getToken } from "next-auth/jwt";
import { cookies } from "next/headers";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  clearLoginAttempts,
  clientIp,
  registerLoginAttempt,
} from "@/lib/login-throttle";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import {
  createSession,
  deleteSession,
  findSessionUserId,
} from "@/lib/sessions";

export class TooManyLoginAttempts extends CredentialsSignin {
  code = "rate_limited";

  constructor(readonly retryAfterSeconds: number) {
    super();
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }
        const normalizedEmail = email.trim().toLowerCase();

        const attempt = await registerLoginAttempt(
          normalizedEmail,
          clientIp(request.headers)
        );
        if (!attempt.allowed) {
          throw new TooManyLoginAttempts(attempt.retryAfterSeconds);
        }

        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(sql`lower(${users.email})`, normalizedEmail),
              isNull(users.deletedAt)
            )
          )
          .limit(1);
        // Runs even without an account, so unknown e-mails take just as long
        const { matches, needsRehash } = await verifyPassword(
          password,
          user?.passwordHash ?? null
        );
        if (!user || !matches) return null;

        if (needsRehash) {
          await db
            .update(users)
            .set({ passwordHash: await hashPassword(password) })
            .where(eq(users.id, user.id));
        }
        await clearLoginAttempts(normalizedEmail);
        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
  ],
  // The cookie expires after a week without use. The session row behind it
  // caps the total length and lets a logout end it everywhere it was copied.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.sessionId = await createSession(Number(user.id));
        return token;
      }

      // Checked on every request: an ended session or a removed user is logged
      // out right away. Returning null clears the cookie.
      const userId =
        typeof token.sessionId === "string"
          ? await findSessionUserId(token.sessionId)
          : null;
      if (userId === null) return null;

      token.userId = String(userId);
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  logger: {
    // A wrong password is routine, so it gets one line instead of an error
    // with a stack trace. Real errors are still logged in full.
    error(error) {
      if (error instanceof CredentialsSignin) {
        console.warn(`[auth] login refused: ${error.code}`);
        return;
      }
      console.error(error);
    },
  },
  events: {
    async signOut(message) {
      const sessionId = "token" in message ? message.token?.sessionId : null;
      if (typeof sessionId === "string") await deleteSession(sessionId);
    },
  },
});

// The session row behind this request's cookie. Over HTTPS Auth.js names the
// cookie with a __Secure- prefix, and the name is also the decryption salt.
export async function currentSessionId() {
  const cookieStore = await cookies();
  const token = await getToken({
    req: { headers: { cookie: cookieStore.toString() } },
    secret: process.env.AUTH_SECRET,
    secureCookie: cookieStore.has("__Secure-authjs.session-token"),
  });
  return typeof token?.sessionId === "string" ? token.sessionId : null;
}
