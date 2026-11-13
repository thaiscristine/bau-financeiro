import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Locally the database URL lives in .env.local; on Vercel it comes from the environment.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.MB_DATABASE_URL!,
  },
});
