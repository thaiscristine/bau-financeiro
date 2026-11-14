import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  clearLoginAttempts,
  clientIp,
  registerLoginAttempt,
} from "@/lib/login-throttle";
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
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!passwordMatches) return null;

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
