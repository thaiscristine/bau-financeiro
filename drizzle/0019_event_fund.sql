CREATE TYPE "public"."fund_status" AS ENUM('requested', 'granted', 'denied');--> statement-breakpoint
ALTER TABLE "event_participants" ADD COLUMN "fund_status" "fund_status";--> statement-breakpoint
ALTER TABLE "event_participants" ADD COLUMN "fund_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_fund_amount_when_granted" CHECK (("event_participants"."fund_status" is not distinct from 'granted') = ("event_participants"."fund_amount" is not null));--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_fund_within_total" CHECK ("event_participants"."fund_amount" is null or ("event_participants"."fund_amount" > 0 and "event_participants"."fund_amount" <= "event_participants"."total"));