// Loaded before every database test so the app's db module connects to the
// test database instead of the dev one
import { testDatabaseUrl } from "../test-db";

process.env.MB_DATABASE_URL = testDatabaseUrl();
