import { expect, test, type Page } from "@playwright/test";
import { createUser, query, reset } from "./db";
import { login } from "./session";

// Dates relative to today in the organization's timezone, like the app
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());

function month(delta: number) {
  const date = new Date(
    Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + delta, 1)
  );
  const first = date.toISOString().slice(0, 10);
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  )
    .toISOString()
    .slice(0, 10);
  // The last day is never before today, so installments due then are not overdue
  return { first, mid: `${first.slice(0, 8)}15`, last };
}

const lastMonth = month(-1);
const thisMonth = month(0);
const nextMonth = month(1);

async function seed() {
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await query(`insert into categories (name, requires_kid) values
    ('Doação', false), ('Lojinha', false), ('Fornecedores', false),
    ('Contribuição mensal', true)`);
  const entry = async (type: string, category: string, amount: string, date: string) => {
    const { rows } = await query(
      `insert into entries (type, amount, category_id, entry_date, created_by_id)
       select $1, $2, id, $4, 1 from categories where name = $3 returning id`,
      [type, amount, category, date]
    );
    return rows[0].id as number;
  };
  await entry("income", "Doação", "100", thisMonth.first);
  await entry("income", "Lojinha", "40", thisMonth.last);
  await entry("cost", "Fornecedores", "30", thisMonth.first);
  await entry("income", "Doação", "500", lastMonth.mid);
  await entry("cost", "Fornecedores", "200", lastMonth.mid);
  await entry("income", "Lojinha", "7", nextMonth.first);
  const paid = await entry("income", "Lojinha", "99", thisMonth.first);

  await query(`insert into kids (name, age_group) values
    ('Clara', 'b1'), ('Bia', 'guias'), ('Duda', null)`);
  await query(`insert into items (name, category_id, price, tracks_stock)
    select 'Acampamento', id, 100, false from categories where name = 'Lojinha'`);
  const sale = async (kid: string) => {
    const { rows } = await query(
      `insert into sales (kid_id, item_id, quantity, unit_price, total, sale_date, created_by_id)
       select kids.id, 1, 1, 100, 100, $2, 1 from kids where name = $1 returning id`,
      [kid, lastMonth.first]
    );
    return rows[0].id as number;
  };
  const clara = await sale("Clara");
  const bia = await sale("Bia");
  const duda = await sale("Duda");
  await query(
    `insert into installments (sale_id, number, amount, due_date, entry_id) values
      ($1, 1, 20, $4, null), ($1, 2, 25, $5, null),
      ($2, 1, 99, $6, $7), ($2, 2, 30, $5, null),
      ($3, 1, 10, $5, null)`,
    [clara, bia, duda, lastMonth.mid, thisMonth.last, thisMonth.first, paid]
  );

  const contribution = await entry("income", "Contribuição mensal", "50", lastMonth.mid);
  await query(
    `insert into contributions (kid_id, month, amount, due, entry_id)
     select kids.id, v.month::date, v.amount::numeric, v.due::boolean, v.entry_id::int
     from (values
       ('Clara', $1, 20, true, null), ('Clara', $2, 25, true, null), ('Clara', $3, 25, false, null),
       ('Bia', $1, 50, true, $4), ('Bia', $2, 30, true, null),
       ('Duda', $2, 10, true, null)
     ) as v(kid, month, amount, due, entry_id)
     join kids on kids.name = v.kid`,
    [lastMonth.first, thisMonth.first, nextMonth.first, contribution]
  );
}

function card(page: Page, label: string) {
  return page.locator("p").filter({ hasText: new RegExp(`^${label}$`) }).locator("..");
}

function section(page: Page, title: string) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: title }),
  });
}

// Cells joined by tabs, with the non-breaking space of "R$ 10,00" made plain
async function rowsOf(page: Page, title: string) {
  const rows = await section(page, title).locator("tbody tr").allInnerTexts();
  return rows.map((row) => row.replaceAll("\u00a0", " "));
}

test.beforeEach(async ({ page }) => {
  await reset();
  await seed();
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("the panel shows the current month by default", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Este mês" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(card(page, "Entrou")).toContainText("239,00");
  await expect(card(page, "Saiu")).toContainText("30,00");
  await expect(card(page, "Saldo")).toContainText("209,00");
  await expect(card(page, "A receber em parcelas")).toContainText("65,00");
  await expect(card(page, "Parcelas atrasadas")).toContainText("0,00");

  // Only what came in, largest first
  const origin = section(page, "Por origem");
  await expect(origin.locator("th")).toHaveText(["Categoria", /^Entrou\s*R\$\s239,00$/]);
  expect(await rowsOf(page, "Por origem")).toEqual([
    "Lojinha\tR$ 139,00",
    "Doação\tR$ 100,00",
  ]);

  // Unpaid monthly contributions per age group, without naming who owes
  await expect(
    section(page, "Contribuições em aberto por ramo").locator("th").nth(2)
  ).toHaveText(/^Em aberto\s*R\$\s65,00$/);
  const open = await rowsOf(page, "Contribuições em aberto por ramo");
  expect(open).toEqual([
    "B1\t1\tR$ 25,00\tR$ 0,00",
    "Guias\t1\tR$ 30,00\tR$ 0,00",
    "Sem ramo\t1\tR$ 10,00\tR$ 0,00",
  ]);
  await expect(page.getByText("Clara")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Por mês" })).toHaveCount(0);
});

test("the previous and next months have their own figures", async ({ page }) => {
  await page.getByRole("link", { name: "Mês passado" }).click();
  await expect(page).toHaveURL("/dashboard?period=last-month");
  await expect(card(page, "Entrou")).toContainText("550,00");
  await expect(card(page, "Saiu")).toContainText("200,00");
  await expect(card(page, "Parcelas atrasadas")).toContainText("20,00");
  expect(await rowsOf(page, "Por origem")).toEqual([
    "Doação\tR$ 500,00",
    "Contribuição mensal\tR$ 50,00",
  ]);
  expect(await rowsOf(page, "Contribuições em aberto por ramo")).toEqual([
    "B1\t1\tR$ 20,00\tR$ 20,00",
  ]);

  await page.getByRole("link", { name: "Próximo mês" }).click();
  await expect(page).toHaveURL("/dashboard?period=next-month");
  await expect(card(page, "Entrou")).toContainText("7,00");
  await expect(card(page, "Saiu")).toContainText("0,00");
  await expect(
    section(page, "Contribuições em aberto por ramo")
  ).toContainText("Nenhuma contribuição em aberto no período.");
});

test("a custom period covers the dates chosen", async ({ page }) => {
  await page.getByRole("link", { name: "Escolher datas" }).click();
  await expect(page.getByLabel("De")).toHaveValue(thisMonth.first);
  await expect(page.getByLabel("Até")).toHaveValue(thisMonth.last);

  await page.getByLabel("De").fill(lastMonth.first);
  await page.getByLabel("Até").fill(nextMonth.last);
  await page.getByRole("button", { name: "Aplicar" }).click();

  await expect(page).toHaveURL(
    `/dashboard?period=custom&from=${lastMonth.first}&to=${nextMonth.last}`
  );
  await expect(page.getByLabel("De")).toHaveValue(lastMonth.first);
  await expect(card(page, "Entrou")).toContainText("796,00");
  await expect(card(page, "Saiu")).toContainText("230,00");
  expect(await rowsOf(page, "Contribuições em aberto por ramo")).toEqual([
    "B1\t2\tR$ 45,00\tR$ 20,00",
    "Guias\t1\tR$ 30,00\tR$ 0,00",
    "Sem ramo\t1\tR$ 10,00\tR$ 0,00",
  ]);
});
