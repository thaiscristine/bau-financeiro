CREATE TABLE "fixed_cost_months" (
	"id" serial PRIMARY KEY NOT NULL,
	"fixed_cost_id" integer NOT NULL,
	"month" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"entry_id" integer,
	CONSTRAINT "fixed_cost_months_entry_id_unique" UNIQUE("entry_id"),
	CONSTRAINT "fixed_cost_months_fixed_cost_id_month_unique" UNIQUE("fixed_cost_id","month"),
	CONSTRAINT "fixed_cost_months_month_is_first_day" CHECK (extract(day from "fixed_cost_months"."month") = 1)
);
--> statement-breakpoint
CREATE TABLE "fixed_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"supplier" text,
	"due_day" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"variable" boolean DEFAULT false NOT NULL,
	"start_month" date NOT NULL,
	"end_month" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fixed_costs_due_day_in_month" CHECK ("fixed_costs"."due_day" between 1 and 31),
	CONSTRAINT "fixed_costs_start_month_is_first_day" CHECK (extract(day from "fixed_costs"."start_month") = 1),
	CONSTRAINT "fixed_costs_end_month_after_start" CHECK ("fixed_costs"."end_month" is null or (extract(day from "fixed_costs"."end_month") = 1 and "fixed_costs"."end_month" >= "fixed_costs"."start_month"))
);
--> statement-breakpoint
ALTER TABLE "fixed_cost_months" ADD CONSTRAINT "fixed_cost_months_fixed_cost_id_fixed_costs_id_fk" FOREIGN KEY ("fixed_cost_id") REFERENCES "public"."fixed_costs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixed_cost_months" ADD CONSTRAINT "fixed_cost_months_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;