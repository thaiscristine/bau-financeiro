CREATE TYPE "public"."category" AS ENUM('vendas', 'fornecedores', 'aluguel', 'outros');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('income', 'cost');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "entry_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category" "category" NOT NULL,
	"note" text,
	"entry_date" date NOT NULL,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;