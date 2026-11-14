import type { NextAuthConfig } from "next-auth";

// The part of the Auth.js setup that needs no database. proxy.ts uses it on
// its own to read the session cookie, so a request reaches its page without
// waiting on a database round trip, and link prefetches run no queries.
// auth.ts adds the login and the check against the session row, which every
// page and action runs through requireSession.
export const authConfig = {
  trustHost: true,
  providers: [],
  // The cookie expires after a week without use. The session row behind it
  // caps the total length and lets a logout end it everywhere it was copied.
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
