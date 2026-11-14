CREATE TABLE "event_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"name" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_installments" DROP CONSTRAINT "event_installments_participant_id_number_unique";--> statement-breakpoint
ALTER TABLE "event_installments" ADD COLUMN "charge_id" integer;--> statement-breakpoint
ALTER TABLE "event_charges" ADD CONSTRAINT "event_charges_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_installments" ADD CONSTRAINT "event_installments_charge_id_event_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."event_charges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_installments" ADD CONSTRAINT "event_installments_participant_id_charge_id_number_unique" UNIQUE NULLS NOT DISTINCT("participant_id","charge_id","number");