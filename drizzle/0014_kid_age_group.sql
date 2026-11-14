CREATE TYPE "public"."age_group" AS ENUM('ciranda', 'b1', 'b2', 'guias', 'gas', 'coordenacao');--> statement-breakpoint
ALTER TABLE "kids" ADD COLUMN "age_group" "age_group";