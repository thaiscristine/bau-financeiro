# Baú Financeiro

A small control panel for the organization's shop: log in, record what came in (entradas) and what went out (saídas), and see the balance per month and per origin (categoria).

It also keeps the inventory: items (products with stock, or services like a van rental), the bandeirantes (members, called kids in the code) who buy them, and sales paid in monthly installments (parcelas). Marking an installment as paid records the matching income entry automatically.

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

## Tests

```bash
npm test
```
