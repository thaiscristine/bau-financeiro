INSERT INTO "categories" ("name", "allows_manual_entry") VALUES ('Custos fixos', false)
ON CONFLICT ("name") DO UPDATE SET "allows_manual_entry" = false;
