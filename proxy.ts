import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Only reads the cookie, without the database check in auth.ts. That check
// still runs in every page and action, so a cookie whose session was ended
// gets past here but not past requireSession.
const { auth } = NextAuth(authConfig);

// Only scripts carrying this request's nonce run, plus the ones they load
// ('strict-dynamic'), so markup that sneaks into a page can't run code. Next
// reads the nonce from the request header and adds it to its own scripts.
// Styles allow inline because React writes style attributes.
function contentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // React needs eval in development to rebuild server error stacks
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";

  // Leaving /login is up to the page itself: a cookie whose session was ended
  // would otherwise bounce between here and requireSession's redirect
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
});

export const config = {
  // Skip API routes, Next internals and static files (anything with an
  // extension, like the app icon and the logo in /public).
  matcher: ["/((?!api|_next/static|_next/image|.*\\.\\w+$).*)"],
};
