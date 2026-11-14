INSERT INTO "categories" ("name", "allows_manual_entry") VALUES ('Lojinha', false)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
UPDATE "items" SET "category_id" = (SELECT "id" FROM "categories" WHERE "name" = 'Lojinha');
