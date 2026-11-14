import { expect, test, type Page } from "@playwright/test";
import { createUser, query, reset } from "./db";
import { login } from "./session";

// Dates relative to today in the organization's timezone, like the app
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());
const year = Number(today.slice(0, 4));
// Next year is always generated in full, so its months are predictable
const nextYear = year + 1;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const CHARGED = ["Fevereiro", "Março", "Abril", "Maio", "Junho", "Agosto", "Setembro", "Outubro", "Novembro"];

function monthRow(page: Page, name: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Contribuição mensal" }) })
    .locator("li")
    .filter({ has: page.getByText(name, { exact: true }) });
}

function openNewKid(page: Page) {
  return page.getByRole("button", { name: "Novo bandeirante" }).click();
}

async function createKid(page: Page, name: string, ageGroup: string, fee?: string) {
  await page.goto("/kids");
  await openNewKid(page);
  const dialog = page.getByRole("dialog", { name: "Novo bandeirante" });
  await dialog.getByLabel("Nome").fill(name);
  await dialog.getByLabel("Ramo (opcional)").selectOption(ageGroup);
  if (fee) await dialog.getByLabel("Contribuição mensal (R$)").fill(fee);
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("row", { name: new RegExp(name) }).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await query(`insert into categories (name, requires_kid) values ('Contribuição mensal', true)`);
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("the coordination has no monthly fee", async ({ page }) => {
  await page.goto("/kids");
  await openNewKid(page);
  const dialog = page.getByRole("dialog", { name: "Novo bandeirante" });
  await dialog.getByLabel("Ramo (opcional)").selectOption("Coordenadores/Diretoria");
  await expect(dialog.getByLabel("Contribuição mensal (R$)")).toHaveCount(0);
  await dialog.getByLabel("Ramo (opcional)").selectOption("B1");
  await expect(dialog.getByLabel("Contribuição mensal (R$)")).toBeVisible();
});

test("a fee charges February to November, skipping July", async ({ page }) => {
  await createKid(page, "Clara", "B1", "45");

  // This year only charges from the current month on
  const currentMonth = Number(today.slice(5, 7));
  for (const [index, name] of MONTHS.entries()) {
    const charged = index + 1 >= currentMonth && CHARGED.includes(name);
    await expect(monthRow(page, name)).toContainText(charged ? /Em aberto/ : /Não cobrada/);
  }

  await page.getByRole("link", { name: String(nextYear) }).click();
  for (const name of MONTHS) {
    await expect(monthRow(page, name)).toContainText(
      CHARGED.includes(name) ? "Em aberto" : "Não cobrada"
    );
  }
  await expect(monthRow(page, "Março")).toContainText("45,00");
});

test("a month can be paid and the payment undone", async ({ page }) => {
  await createKid(page, "Clara", "B1", "45");
  await page.getByRole("link", { name: String(nextYear) }).click();

  const march = monthRow(page, "Março");
  await march.getByLabel("Data do pagamento").fill(`${year}-12-01`);
  await march.getByLabel("Forma de pagamento").selectOption("Pix");
  await march.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(march).toContainText(`Paga em 01/12/${year}`);
  // Money coming in, like a paid installment
  await expect(page.getByTestId("confetti")).toBeVisible();

  await page.goto("/entries");
  const entry = page.getByRole("row", { name: /Contribuição de março/ });
  await expect(entry).toContainText("Clara");
  await entry.getByRole("link", { name: "Ver bandeirante" }).click();
  await expect(page).toHaveURL(/\/kids\/\d+$/);

  await page.getByRole("link", { name: String(nextYear) }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await monthRow(page, "Março").getByRole("button", { name: "Desfazer" }).click();
  await expect(monthRow(page, "Março")).toContainText("Em aberto");

  await page.goto("/entries");
  await expect(page.getByRole("row", { name: /Contribuição de março/ })).toHaveCount(0);
});

test("a month can be let off or charged in exceptional cases", async ({ page }) => {
  await createKid(page, "Clara", "B1", "45");
  await page.getByRole("link", { name: String(nextYear) }).click();

  await monthRow(page, "Abril").getByRole("button", { name: "Não cobrar" }).click();
  await expect(monthRow(page, "Abril")).toContainText("Não cobrada");
  await expect(monthRow(page, "Abril").getByLabel("Data do pagamento")).toHaveCount(0);

  await monthRow(page, "Julho").getByRole("button", { name: "Cobrar" }).click();
  await expect(monthRow(page, "Julho")).toContainText("Em aberto");
  await expect(monthRow(page, "Julho")).toContainText("45,00");
});

test("a new fee applies to the unpaid months ahead, not to paid ones", async ({ page }) => {
  await createKid(page, "Clara", "B1", "45");
  await page.getByRole("link", { name: String(nextYear) }).click();
  const march = monthRow(page, "Março");
  await march.getByLabel("Forma de pagamento").selectOption("Pix");
  await march.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(march).toContainText("Paga em");

  await page.getByLabel("Contribuição mensal (R$)").fill("60");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();

  await page.reload();
  await expect(monthRow(page, "Março")).toContainText("45,00");
  await expect(monthRow(page, "Abril")).toContainText("60,00");
});

test("an old contribution entry can be linked to the month it paid", async ({ page }) => {
  await createKid(page, "Clara", "B1", "45");
  await query(
    `insert into entries (type, amount, category_id, kid_id, entry_date, created_by_id)
     select 'income', 40, categories.id, kids.id, $1, 1 from categories, kids
     where categories.name = 'Contribuição mensal' and kids.name = 'Clara'`,
    [today]
  );
  await page.reload();

  const unlinked = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Contribuições sem mês" }) });
  await expect(unlinked.locator("li")).toHaveCount(1);
  await unlinked
    .getByLabel("Mês que esta contribuição pagou")
    .selectOption({ label: `Março de ${nextYear}` });
  await unlinked.getByRole("button", { name: "Ligar ao mês" }).click();
  await expect(unlinked).toHaveCount(0);
  // The money had already come in, so linking it is no celebration
  await expect(page.getByTestId("confetti")).toHaveCount(0);

  await page.getByRole("link", { name: String(nextYear) }).click();
  const march = monthRow(page, "Março");
  await expect(march).toContainText("Paga em");
  await expect(march).toContainText("40,00");

  // Unlinking keeps the entry, back in the list
  page.once("dialog", (dialog) => dialog.accept());
  await march.getByRole("button", { name: "Desligar" }).click();
  await expect(march).toContainText("Em aberto");
  await expect(unlinked.locator("li")).toHaveCount(1);
});

test("a kid with a fee gets the usual months of a year they have none in", async ({ page }) => {
  // Like a fee set in an earlier year, before this year's months existed
  await query(`insert into kids (name, age_group, monthly_fee) values ('Bia', 'guias', 30)`);
  await page.goto("/kids");
  await page.getByRole("row", { name: /Bia/ }).getByRole("link", { name: "Ver" }).click();

  const currentMonth = Number(today.slice(5, 7));
  for (const [index, name] of MONTHS.entries()) {
    const status = !CHARGED.includes(name)
      ? "Não cobrada"
      : index + 1 < currentMonth
        ? "Atrasada"
        : "Em aberto";
    await expect(monthRow(page, name)).toContainText(status);
  }
});

test("contributions are not typed in on Transações", async ({ page }) => {
  await page.goto("/entries");
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
  await expect(
    dialog.getByLabel("Categoria").getByRole("option", { name: "Contribuição mensal" })
  ).toHaveCount(0);
  await expect(dialog.getByText("registre na página do")).toBeVisible();
});

test("stopping the fee lets the kid off the months ahead, and resuming brings them back", async ({
  page,
}) => {
  await createKid(page, "Clara", "B1", "45");
  await page.getByLabel("Ramo (opcional)").selectOption("Coordenadores/Diretoria");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();

  await page.goto(page.url().split("?")[0] + `?year=${nextYear}`);
  await expect(monthRow(page, "Março")).toContainText("Não cobrada");

  await page.getByLabel("Ramo (opcional)").selectOption("B2");
  await page.getByLabel("Contribuição mensal (R$)").fill("50");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();
  await page.reload();
  await expect(monthRow(page, "Março")).toContainText("Em aberto");
  await expect(monthRow(page, "Março")).toContainText("50,00");
  await expect(monthRow(page, "Julho")).toContainText("Não cobrada");
});

test("only one category holds the monthly contributions", async ({ page }) => {
  await query(`insert into categories (name) values ('Doação')`);
  await page.goto("/categories");
  await expect(page.getByLabel("Doação: exige bandeirante")).toBeDisabled();
  await page.getByLabel("Contribuição mensal: exige bandeirante").uncheck();
  await expect(page.getByLabel("Doação: exige bandeirante")).toBeEnabled();
});
