import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { resetDatabase, testDatabaseUrl } from "../test-db";

// The tests talk to the same database as the app server they drive. Every
// spec file in a worker shares this pool, which closes itself once idle.
const pool = new Pool({
  connectionString: testDatabaseUrl(),
  allowExitOnIdle: true,
});

export function reset() {
  return resetDatabase(pool);
}

// Cost 12 is what the app uses; a lower one stands in for an older hash
export async function createUser(
  name: string,
  email: string,
  password: string,
  cost = 12
) {
  const passwordHash = await bcrypt.hash(password, cost);
  await pool.query(
    "insert into users (name, email, password_hash) values ($1, $2, $3)",
    [name, email, passwordHash]
  );
}

export async function passwordHashOf(email: string) {
  const { rows } = await pool.query<{ password_hash: string }>(
    "select password_hash from users where email = $1",
    [email]
  );
  return rows[0].password_hash;
}

// A service item, so a sale needs no stock
export async function createItem(name: string, price: string) {
  const { rows } = await pool.query<{ id: number }>(
    "insert into categories (name) values ($1) returning id",
    [`Categoria de ${name}`]
  );
  await pool.query(
    "insert into items (name, category_id, price, tracks_stock) values ($1, $2, $3, false)",
    [name, rows[0].id, price]
  );
}

export async function createCategory(name: string, { allowsManualEntry = true } = {}) {
  await pool.query(
    "insert into categories (name, allows_manual_entry) values ($1, $2)",
    [name, allowsManualEntry]
  );
}

export async function createKid(name: string) {
  await pool.query("insert into kids (name) values ($1)", [name]);
}

// For specs that need data no screen creates quickly, like months of history
export function query(text: string, values: unknown[] = []) {
  return pool.query(text, values);
}

// An income recorded before the payment method was tracked, so it has none
export async function createUntrackedIncome(categoryName: string, amount: string, counterparty: string) {
  await pool.query(
    `insert into entries (type, amount, category_id, counterparty, entry_date, created_by_id)
     select 'income', $2, categories.id, $3, current_date, (select min(id) from users)
     from categories where name = $1`,
    [categoryName, amount, counterparty]
  );
}

// A product with stock, in its own category
export async function createStockItem(name: string, price: string, stock: number) {
  const { rows: [category] } = await pool.query<{ id: number }>(
    "insert into categories (name) values ($1) returning id",
    [`Categoria de ${name}`]
  );
  const { rows: [item] } = await pool.query<{ id: number }>(
    "insert into items (name, category_id, price) values ($1, $2, $3) returning id",
    [name, category.id, price]
  );
  await pool.query(
    `insert into stock_movements (item_id, quantity, reason, movement_date, created_by_id)
     values ($1, $2, 'restock', current_date, (select min(id) from users))`,
    [item.id, stock]
  );
}

// A sale paid in the given installments; those with paidOn have their income entry
export async function recordSale(
  kidName: string,
  itemName: string,
  quantity: number,
  saleDate: string,
  installments: { amount: string; dueDate: string; paidOn?: string }[]
) {
  const total = installments.reduce((sum, installment) => sum + Number(installment.amount), 0);
  const { rows: [sale] } = await pool.query<{ id: number; item_id: number; category_id: number }>(
    `insert into sales (kid_id, item_id, quantity, unit_price, total, sale_date, created_by_id)
     select kid.id, item.id, $3, $4, $5, $6, (select min(id) from users)
     from kids kid, items item where kid.name = $1 and item.name = $2
     returning id, item_id, (select category_id from items where name = $2)`,
    [kidName, itemName, quantity, total / quantity, total, saleDate]
  );
  await pool.query(
    `insert into stock_movements (item_id, quantity, reason, sale_id, movement_date, created_by_id)
     values ($1, $2, 'sale', $3, $4, (select min(id) from users))`,
    [sale.item_id, -quantity, sale.id, saleDate]
  );
  for (const [index, installment] of installments.entries()) {
    let entryId: number | null = null;
    if (installment.paidOn) {
      const { rows: [entry] } = await pool.query<{ id: number }>(
        `insert into entries (type, amount, category_id, entry_date, created_by_id)
         values ('income', $1, $2, $3, (select min(id) from users)) returning id`,
        [installment.amount, sale.category_id, installment.paidOn]
      );
      entryId = entry.id;
    }
    await pool.query(
      "insert into installments (sale_id, number, amount, due_date, entry_id) values ($1, $2, $3, $4, $5)",
      [sale.id, index + 1, installment.amount, installment.dueDate, entryId]
    );
  }
}
