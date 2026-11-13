# Baú Financeiro

A small control panel for a shop: log in, record what came in (entradas) and what went out (saídas), and see the balance per month.

Built with Next.js, Auth.js (credentials login), Drizzle ORM and Postgres.

## Running locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values. Generate `AUTH_SECRET` with `openssl rand -base64 32`.

3. Create the database tables:

   ```bash
   npm run db:migrate
   ```

4. Create your login (uses `SEED_NAME`, `SEED_EMAIL` and `SEED_PASSWORD` from `.env.local`):

   ```bash
   npm run seed
   ```

5. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```
