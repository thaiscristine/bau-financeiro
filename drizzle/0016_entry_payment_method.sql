CREATE TYPE "public"."payment_method" AS ENUM('cash', 'pix', 'debit_card', 'credit_card');--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "payment_method" "payment_method";