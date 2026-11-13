import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const entryTypeEnum = pgEnum("entry_type", ["income", "cost"]);

export const categoryEnum = pgEnum("category", [
  "vendas",
  "fornecedores",
  "aluguel",
  "outros",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const entries = pgTable("entries", {
  id: serial("id").primaryKey(),
  type: entryTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: categoryEnum("category").notNull(),
  note: text("note"),
  entryDate: date("entry_date").notNull(),
  createdById: integer("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
