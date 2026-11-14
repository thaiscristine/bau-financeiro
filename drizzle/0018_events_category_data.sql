INSERT INTO "categories" ("name", "allows_manual_entry") VALUES ('Eventos', false)
ON CONFLICT ("name") DO UPDATE SET "allows_manual_entry" = false;
