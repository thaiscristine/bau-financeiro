ALTER TABLE "entries" ADD COLUMN "counterparty" text;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "entry_id" integer;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_entry_id_unique" UNIQUE("entry_id");