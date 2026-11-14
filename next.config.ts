import type { NextConfig } from "next";

// Sent with every response. The Content-Security-Policy is set per request in
// proxy.ts, since it carries a fresh nonce each time.
const securityHeaders = [
  // Don't let the browser guess a file is HTML or script when it isn't
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Older browsers' version of frame-ancestors 'none': no framing at all
  { key: "X-Frame-Options", value: "DENY" },
  // Other sites never see which page someone came from
  { key: "Referrer-Policy", value: "same-origin" },
  // A page opened from the app can't reach back into it
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // The app uses none of these
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
