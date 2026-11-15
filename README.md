# Baú Financeiro

The cash control panel for the organization. Every real you receive or spend becomes an entry (entrada or saída), and the balance is always the sum of them. Most entries are not typed by hand: paying a sale installment, a monthly contribution, an event sign-up or a fixed cost records the matching entry automatically.

The UI is in Portuguese. The bandeirantes (members) are called kids in the code.

## What it does

- **Painel** (`/dashboard`) - income, expenses and balance for a period, money still to receive in installments, overdue installments, totals per category and per payment method, open monthly contributions per age group (ramo) and fixed costs to pay.
- **Transações** (`/entries`) - every entry, with category and payment method (Dinheiro, Pix, Débito, Crédito). Entries created by another screen link back to it and are fixed there.
- **Custos fixos** (`/fixed-costs`) - monthly bills like rent or energy, paid month by month.
- **Lojinha** - sales to bandeirantes paid in up to 24 installments (`/sales`), the inventory of products and services with stock history (`/inventory`), and a profit report (`/sales/report`).
- **Eventos** (`/events`) - camps and trips: sign-ups paid in installments, guests, extra charges (like flight tickets), expenses and Fundo Lisah grants.
- **Bandeirantes** (`/kids`) - members per age group, their monthly contributions (February to November, except July) and everything they owe.
- **Relatórios** (`/reports`) - Excel spreadsheets of entries, installments, sales or stock, with filters, grouping, saved templates and shareable links.
- **Configurações** - users (`/users`) and categories (`/categories`).
- **Ajuda** (`/help`) - the user guide, in Portuguese. Keep it up to date when a screen changes.

## Stack

Next.js (App Router), React, Tailwind CSS, Auth.js with email and password login, Drizzle ORM on Postgres, ExcelJS for the spreadsheets. Deployed on Vercel, which runs the migrations before every build (see `vercel.json`).

## Running locally

You need Node.js and a Postgres database.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the values. `MB_DATABASE_URL` is the app's database. Generate `AUTH_SECRET` with `openssl rand -base64 32`.

3. Create the database tables:

   ```bash
   npm run db:migrate
   ```

4. Create your login (uses `SEED_NAME`, `SEED_EMAIL` and `SEED_PASSWORD` from `.env.local`; running it again updates that login's password):

   ```bash
   npm run seed
   ```

5. Start the app and open [http://localhost:3000](http://localhost:3000):

   ```bash
   npm run dev
   ```

After changing `db/schema.ts`, create a migration with `npm run db:generate` and apply it with `npm run db:migrate`.

## Tests

| Command | What it runs |
| --- | --- |
| `npm test` | Unit tests next to the code in `lib/` |
| `npm run test:db` | Database tests in `tests/db/` |
| `npm run test:e2e` | Playwright tests in `tests/e2e/`, against a production build |
| `npm run lint` | ESLint |

The database and end-to-end tests need `TEST_DATABASE_URL` in `.env.local`, pointing at a database whose name ends in `_test`. They create and migrate it, then wipe it between tests, so give each checkout its own test database. The end-to-end tests serve the app on port 3200; set `E2E_PORT` to use another.

## Project layout

- `app/` - pages and server actions. Pages behind the login live in `app/(app)/`.
- `components/` - shared UI.
- `lib/` - business logic and queries, one file per area (`sales.ts`, `events.ts`, `contributions.ts`...).
- `db/schema.ts` - the database schema. Migrations are in `drizzle/`.
- `scripts/seed-users.ts` - the login seed.
- `tests/` - database and end-to-end tests.
