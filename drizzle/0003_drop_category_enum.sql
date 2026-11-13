ALTER TABLE "entries" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "category";--> statement-breakpoint
DROP TYPE "public"."category";