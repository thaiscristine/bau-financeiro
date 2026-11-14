import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(sql`lower(${users.email})`, email.trim().toLowerCase()),
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

        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        return token;
      }

      // A removed user is logged out on their next request instead of keeping
      // access until the session expires. Returning null clears the cookie.
      const [active] = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(eq(users.id, Number(token.userId)), isNull(users.deletedAt))
        )
        .limit(1);
      return active ? token : null;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
