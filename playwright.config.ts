import { defineConfig, devices } from "@playwright/test";
import { testDatabaseUrl } from "./tests/test-db";

// Override when another checkout is already running its tests on 3200
const PORT = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "tests/e2e",
  // Every test resets the one shared database, so they run one at a time
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A production build, so the tests see what Vercel serves
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 300_000,
    env: { MB_DATABASE_URL: testDatabaseUrl() },
  },
});
