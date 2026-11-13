ALTER TABLE "categories" ADD COLUMN "requires_kid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "allows_manual_entry" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "kid_id" integer;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_kid_id_kids_id_fk" FOREIGN KEY ("kid_id") REFERENCES "public"."kids"("id") ON DELETE no action ON UPDATE no action;