INSERT INTO "categories" ("name") VALUES
	('Doação'),
	('Contribuição mensal'),
	('Venda de produto'),
	('Locação de serviço'),
	('Fornecedores'),
	('Aluguel'),
	('Outros');
--> statement-breakpoint
UPDATE "entries" SET "category_id" = "categories"."id"
FROM "categories"
WHERE "categories"."name" = CASE "entries"."category"
	WHEN 'vendas' THEN 'Venda de produto'
	WHEN 'fornecedores' THEN 'Fornecedores'
	WHEN 'aluguel' THEN 'Aluguel'
	WHEN 'outros' THEN 'Outros'
END;
