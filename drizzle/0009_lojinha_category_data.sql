UPDATE "categories" SET "name" = 'Lojinha'
WHERE "name" = 'Venda de produto'
	AND NOT EXISTS (SELECT 1 FROM "categories" WHERE "name" = 'Lojinha');
