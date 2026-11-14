import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, describeFilters, reportFileName, type FilterNames } from "./build";
import { parseReportFilters } from "./filters";

const parse = (query: string) => parseReportFilters(new URLSearchParams(query));
const today = "2026-11-14";
const names: FilterNames = {
  categories: new Map([[2, "Doação"]]),
  kids: new Map([[3, "Alice"]]),
  items: new Map(),
  users: new Map(),
};

const entries = [
  { date: "2026-10-20", type: "Entrada", category: "Doação", amount: 100.1, kid: null },
  { date: "2026-10-05", type: "Saída", category: "Aluguel", amount: -60, kid: null },
  { date: "2026-09-02", type: "Entrada", category: "Contribuição mensal", amount: 50.2, kid: "Bia" },
  { date: "2026-10-09", type: "Entrada", category: "Doação", amount: 0.2, kid: "Alice" },
];

test("transaction totals split income and cost and give the balance", () => {
  const report = buildReport(parse(""), entries, names, today);
  assert.deepEqual(
    report.stats.map((stat) => [stat.label, stat.value]),
    [
      ["Entrou", 150.5],
      ["Saiu", 60],
      ["Saldo do período", 90.5],
    ]
  );
});

test("ungrouped reports have one group with the overall subtotal", () => {
  const report = buildReport(parse(""), entries, names, today);
  assert.equal(report.groups.length, 1);
  assert.equal(report.groups[0].label, null);
  assert.equal(report.groups[0].subtotal, 90.5);
});

test("groups are sorted by name with the empty group last", () => {
  const report = buildReport(parse("group=kid"), entries, names, today);
  assert.deepEqual(
    report.groups.map((group) => [group.label, group.rows.length, group.subtotal]),
    [
      ["Alice", 1, 0.2],
      ["Bia", 1, 50.2],
      ["Sem bandeirante", 2, 40.1],
    ]
  );
});

test("month groups are in calendar order", () => {
  const report = buildReport(parse("group=month"), entries, names, today);
  assert.deepEqual(
    report.groups.map((group) => group.label),
    ["Setembro de 2026", "Outubro de 2026"]
  );
});

test("visible columns follow the hidden list", () => {
  const report = buildReport(parse("hide=note&hide=kid"), entries, names, today);
  assert.deepEqual(
    report.columns.map((column) => column.key),
    ["date", "type", "category", "amount", "counterparty", "createdBy"]
  );
});

test("installment totals follow the status of each row", () => {
  const rows = [
    { status: "Paga", amount: 30 },
    { status: "Em aberto", amount: 20 },
    { status: "Atrasada", amount: 15 },
    { status: "Atrasada", amount: 15 },
  ];
  const report = buildReport(parse("type=installments"), rows, names, today);
  assert.deepEqual(report.stats.map((stat) => stat.value), [30, 20, 30]);
});

test("active filters describe the report and how to remove each filter", () => {
  const report = buildReport(parse("kind=income&category=2&category=9&kid=3&q=festa"), entries, names, today);
  assert.deepEqual(
    report.activeFilters.map((filter) => [filter.label, filter.value, filter.removeQuery]),
    [
      ["Período", "Mês passado (01/10/2026 a 31/10/2026)", "type=entries&period=all&kind=income&category=2&category=9&kid=3&q=festa"],
      ["Tipo", "Entradas", "type=entries&category=2&category=9&kid=3&q=festa"],
      ["Categoria", "Doação", "type=entries&kind=income&category=9&kid=3&q=festa"],
      ["Categoria", "Categoria excluída", "type=entries&kind=income&category=2&kid=3&q=festa"],
      ["Bandeirante", "Alice", "type=entries&kind=income&category=2&category=9&q=festa"],
      ["Busca", '"festa"', "type=entries&kind=income&category=2&category=9&kid=3"],
    ]
  );
});

test("the whole period cannot be removed", () => {
  const [period] = buildReport(parse("period=all"), [], names, today).activeFilters;
  assert.deepEqual(period, { label: "Período", value: "Tudo", removeQuery: null });
});

test("templates are described in one line", () => {
  assert.equal(describeFilters(parse("group=category")), "Transações · Mês passado · por categoria");
  assert.equal(
    describeFilters(parse("type=installments&status=overdue&status=open&group=kid")),
    "Parcelas · Tudo · em aberto, atrasadas · por bandeirante"
  );
  assert.equal(describeFilters(parse("type=stock")), "Estoque");
});

test("file names say what and when", () => {
  assert.equal(reportFileName(parse(""), today), "transacoes_2026-10-01_a_2026-10-31.xlsx");
  assert.equal(reportFileName(parse("type=installments"), today), "parcelas_2026-11-14.xlsx");
  assert.equal(reportFileName(parse("type=sales&period=custom&from=2026-02-01"), today), "vendas_desde_2026-02-01.xlsx");
  assert.equal(reportFileName(parse("type=stock"), today), "estoque_2026-11-14.xlsx");
});
