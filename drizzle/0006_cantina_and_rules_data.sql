INSERT INTO "categories" ("name") VALUES ('Cantina')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
UPDATE "categories" SET "requires_kid" = true WHERE "name" = 'Contribuição mensal';
--> statement-breakpoint
UPDATE "categories" SET "allows_manual_entry" = false WHERE "name" = 'Venda de produto';
