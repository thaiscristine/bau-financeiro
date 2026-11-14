import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  timestamp,
  pgEnum,
  integer,
  boolean,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const entryTypeEnum = pgEnum("entry_type", ["income", "cost"]);

export const stockMovementReasonEnum = pgEnum("stock_movement_reason", [
  "restock",
  "sale",
  "adjustment",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Set when the user is removed. The row stays so the entries, sales and stock
  // movements they recorded keep pointing to them.
  deletedAt: timestamp("deleted_at"),
});

// Where the money comes from or goes to (donation, monthly contribution, ...).
// Shared by entries and items so reports by origin cover everything.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // Entries in this category must name the kid they came from (monthly contribution)
  requiresKid: boolean("requires_kid").notNull().default(false),
  // False when the money only comes in through a sale (product sales), so the
  // stock is always updated
  allowsManualEntry: boolean("allows_manual_entry").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  type: entryTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  // Who paid (income) or the supplier who was paid (cost). Installment payments
  // leave it empty and show the kid from the sale instead.
  counterparty: text("counterparty"),
  // The kid an entry came from, for categories that require one
  kidId: integer("kid_id").references(() => kids.id),
  note: text("note"),
  entryDate: date("entry_date").notNull(),
  createdById: integer("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kids = pgTable(
  "kids",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    contact: text("contact"),
    // Under 18: a responsible person (name and phone) must be on file
    isMinor: boolean("is_minor").notNull().default(false),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "kids_minor_has_guardian",
      sql`not ${table.isMinor} or (${table.guardianName} is not null and ${table.guardianPhone} is not null)`
    ),
  ]
);

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  // Services like a van rental have no stock to count
  tracksStock: boolean("tracks_stock").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  kidId: integer("kid_id")
    .references(() => kids.id)
    .notNull(),
  itemId: integer("item_id")
    .references(() => items.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  total: numeric("total", { precision: 12, scale: 2 }).notNull(),
  saleDate: date("sale_date").notNull(),
  note: text("note"),
  createdById: integer("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Available stock is the sum of an item's movements: positive adds, negative removes
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .references(() => items.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").notNull(),
  reason: stockMovementReasonEnum("reason").notNull(),
  saleId: integer("sale_id").references(() => sales.id, {
    onDelete: "cascade",
  }),
  // The cost entry that paid for a restock, when it was bought
  entryId: integer("entry_id")
    .references(() => entries.id, { onDelete: "set null" })
    .unique(),
  note: text("note"),
  movementDate: date("movement_date").notNull(),
  createdById: integer("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// An installment is paid when it points to the income entry that recorded the payment
export const installments = pgTable(
  "installments",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
      .references(() => sales.id, { onDelete: "cascade" })
      .notNull(),
    number: integer("number").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    entryId: integer("entry_id")
      .references(() => entries.id, { onDelete: "set null" })
      .unique(),
  },
  (table) => [unique().on(table.saleId, table.number)]
);

export type Category = typeof categories.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type Kid = typeof kids.$inferSelect;
export type Item = typeof items.$inferSelect;
