CREATE TABLE "contributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"kid_id" integer NOT NULL,
	"month" date NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"due" boolean NOT NULL,
	"entry_id" integer,
	"linked_entry" boolean DEFAULT false NOT NULL,
	CONSTRAINT "contributions_entry_id_unique" UNIQUE("entry_id"),
	CONSTRAINT "contributions_kid_id_month_unique" UNIQUE("kid_id","month"),
	CONSTRAINT "contributions_month_is_first_day" CHECK (extract(day from "contributions"."month") = 1),
	CONSTRAINT "contributions_paid_month_is_due" CHECK ("contributions"."entry_id" is null or "contributions"."due")
);
--> statement-breakpoint
ALTER TABLE "kids" ADD COLUMN "monthly_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;