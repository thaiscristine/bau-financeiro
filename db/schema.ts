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
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { AGE_GROUPS } from "../lib/age-groups";
import { PAYMENT_METHODS } from "../lib/payment-methods";
import { FUND_STATUSES } from "../lib/fund";

export const entryTypeEnum = pgEnum("entry_type", ["income", "cost"]);

export const stockMovementReasonEnum = pgEnum("stock_movement_reason", [
  "restock",
  "sale",
  "adjustment",
]);

export const ageGroupEnum = pgEnum("age_group", AGE_GROUPS);

export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);

export const fundStatusEnum = pgEnum("fund_status", FUND_STATUSES);

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

// One row per logged-in browser. The session cookie only carries the id, so
// deleting the row ends that session for good, even if the cookie was copied.
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

// Recent login attempts, used to slow down password guessing. A successful
// login removes the rows for its e-mail, so what stays are the failures.
export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    ip: text("ip"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("login_attempts_email_idx").on(table.email, table.createdAt),
    index("login_attempts_ip_idx").on(table.ip, table.createdAt),
  ]
);

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
  // Every new entry has one; empty only on entries recorded before it was tracked
  paymentMethod: paymentMethodEnum("payment_method"),
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
    // Empty when not informed, like the kids registered before age groups existed
    ageGroup: ageGroupEnum("age_group"),
    // Under 18: a responsible person (name and phone) must be on file
    isMinor: boolean("is_minor").notNull().default(false),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    // The contribuição mensal this kid pays. Set per kid, and only for the age
    // groups that pay one (see lib/age-groups.ts).
    monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }),
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

// One row per kid per calendar month (month is its first day). due says
// whether the kid pays that month; a month is paid when it points to the income
// entry that recorded the payment. The amount is kept per month, so changing a
// kid's fee leaves the months already charged as they were.
export const contributions = pgTable(
  "contributions",
  {
    id: serial("id").primaryKey(),
    kidId: integer("kid_id")
      .references(() => kids.id, { onDelete: "cascade" })
      .notNull(),
    month: date("month").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    due: boolean("due").notNull(),
    entryId: integer("entry_id")
      .references(() => entries.id, { onDelete: "set null" })
      .unique(),
    // The payment is an entry recorded before months existed and linked by
    // hand. Undoing it then only unlinks the entry instead of deleting it.
    linkedEntry: boolean("linked_entry").notNull().default(false),
  },
  (table) => [
    unique().on(table.kidId, table.month),
    check("contributions_month_is_first_day", sql`extract(day from ${table.month}) = 1`),
    check("contributions_paid_month_is_due", sql`${table.entryId} is null or ${table.due}`),
  ]
);

// A camp, outing or any activity people sign up and pay for. price is what a
// participant pays unless their sign-up says otherwise.
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startDate: date("start_date").notNull(),
  // Empty for a one-day event
  endDate: date("end_date"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Someone signed up for an event: a registered kid, or a guest known only by
// name inside this event. total is the fee; what they pay is the total less what
// Fundo Lisah granted (fundAmount), split in event_installments.
export const eventParticipants = pgTable(
  "event_participants",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .references(() => events.id, { onDelete: "cascade" })
      .notNull(),
    kidId: integer("kid_id").references(() => kids.id),
    guestName: text("guest_name"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    // Empty when Fundo Lisah wasn't asked for; fundAmount is set only when granted
    fundStatus: fundStatusEnum("fund_status"),
    fundAmount: numeric("fund_amount", { precision: 12, scale: 2 }),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique().on(table.eventId, table.kidId),
    check(
      "event_participants_kid_or_guest",
      sql`(${table.kidId} is null) <> (${table.guestName} is null)`
    ),
    check(
      "event_participants_fund_amount_when_granted",
      sql`(${table.fundStatus} is not distinct from 'granted') = (${table.fundAmount} is not null)`
    ),
    check(
      "event_participants_fund_within_total",
      sql`${table.fundAmount} is null or (${table.fundAmount} > 0 and ${table.fundAmount} <= ${table.total})`
    ),
  ]
);

// Something the event charges beyond its fee, only to the participants who
// take it, such as the flight tickets of a camp. price is what a participant
// pays unless their sign-up says otherwise. Fundo Lisah does not cover it.
export const eventCharges = pgTable("event_charges", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Like a sale's installments: paid when it points to the income entry that
// recorded the payment. They pay the participant's fee, or an extra charge when
// chargeId is set; a participant takes a charge by having its installments, and
// what they owe for it is the installments' sum.
export const eventInstallments = pgTable(
  "event_installments",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id")
      .references(() => eventParticipants.id, { onDelete: "cascade" })
      .notNull(),
    chargeId: integer("charge_id").references(() => eventCharges.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    entryId: integer("entry_id")
      .references(() => entries.id, { onDelete: "set null" })
      .unique(),
  },
  (table) => [
    unique().on(table.participantId, table.chargeId, table.number).nullsNotDistinct(),
  ]
);

// Something bought for an event. Paid when it points to the cost entry that
// recorded the payment; until then it is still to be paid.
export const eventExpenses = pgTable("event_expenses", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id, { onDelete: "cascade" })
    .notNull(),
  description: text("description").notNull(),
  // What kind of expense, such as food or transport, typed freely
  kind: text("kind"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  supplier: text("supplier"),
  note: text("note"),
  entryId: integer("entry_id")
    .references(() => entries.id, { onDelete: "set null" })
    .unique(),
  createdById: integer("created_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A bill the organization pays every month, such as rent or internet. Each
// month it is charged gets a row in fixed_cost_months, from startMonth to
// endMonth, the last month charged once the cost is ended. amount is the usual
// value; variable ones, like the energy bill, are confirmed when paid.
export const fixedCosts = pgTable(
  "fixed_costs",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    supplier: text("supplier"),
    // Day of the month it is due; months without that day use their last one
    dueDay: integer("due_day").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    variable: boolean("variable").notNull().default(false),
    startMonth: date("start_month").notNull(),
    endMonth: date("end_month"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    check("fixed_costs_due_day_in_month", sql`${table.dueDay} between 1 and 31`),
    check("fixed_costs_start_month_is_first_day", sql`extract(day from ${table.startMonth}) = 1`),
    check(
      "fixed_costs_end_month_after_start",
      sql`${table.endMonth} is null or (extract(day from ${table.endMonth}) = 1 and ${table.endMonth} >= ${table.startMonth})`
    ),
  ]
);

// One row per fixed cost per month it is charged (month is its first day).
// Like a contribution, a month is paid when it points to the cost entry that
// recorded the payment. The amount is kept per month, so changing the cost
// leaves the months already charged as they were.
export const fixedCostMonths = pgTable(
  "fixed_cost_months",
  {
    id: serial("id").primaryKey(),
    fixedCostId: integer("fixed_cost_id")
      .references(() => fixedCosts.id, { onDelete: "cascade" })
      .notNull(),
    month: date("month").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    entryId: integer("entry_id")
      .references(() => entries.id, { onDelete: "set null" })
      .unique(),
  },
  (table) => [
    unique().on(table.fixedCostId, table.month),
    check("fixed_cost_months_month_is_first_day", sql`extract(day from ${table.month}) = 1`),
  ]
);

export type FixedCost = typeof fixedCosts.$inferSelect;

export type Category = typeof categories.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type Kid = typeof kids.$inferSelect;
export type Item = typeof items.$inferSelect;

// A saved report: its filters as the /reports query string, so a template opens
// exactly like a shared link and old templates keep working as filters evolve.
// Shared by every manager; the ready-made ones are ordinary rows anyone can
// rename, change or delete.
export const reportTemplates = pgTable("report_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  query: text("query").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
