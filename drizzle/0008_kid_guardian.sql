ALTER TABLE "kids" ADD COLUMN "is_minor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kids" ADD COLUMN "guardian_name" text;--> statement-breakpoint
ALTER TABLE "kids" ADD COLUMN "guardian_phone" text;--> statement-breakpoint
ALTER TABLE "kids" ADD CONSTRAINT "kids_minor_has_guardian" CHECK (not "kids"."is_minor" or ("kids"."guardian_name" is not null and "kids"."guardian_phone" is not null));