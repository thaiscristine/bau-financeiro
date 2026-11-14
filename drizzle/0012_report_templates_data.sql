INSERT INTO "report_templates" ("name", "query") VALUES
	('Prestação de contas mensal', 'type=entries&period=last-month&group=category'),
	('Cobrança de parcelas atrasadas', 'type=installments&period=all&status=overdue&group=kid'),
	('Contribuições mensais do ano', 'type=entries&period=year&kind=income&group=kid' || coalesce((SELECT '&category=' || "id" FROM "categories" WHERE "name" = 'Contribuição mensal'), '')),
	('Vendas do trimestre por item', 'type=sales&period=quarter&group=item')
ON CONFLICT ("name") DO NOTHING;
