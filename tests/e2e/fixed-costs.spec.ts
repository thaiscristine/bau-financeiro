import { expect, test, type Page } from "@playwright/test";
import { createUser, query, reset } from "./db";
import { login } from "./session";

// Dates relative to today in the organization's timezone, like the app
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
}).format(new Date());

function monthsAgo(count: number) {
  const date = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - count, 1));
  return date.toISOString().slice(0, 7);
}

function monthName(month: string) {
  const label = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function createFixedCost(
  page: Page,
  { name, supplier, amount, dueDay, startMonth }: {
    name: string;
    supplier?: string;
    amount: string;
    dueDay: string;
    startMonth?: string;
  }
) {
  await page.goto("/fixed-costs");
  await page.getByRole("button", { name: "Novo custo fixo" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo custo fixo" });
  await dialog.getByLabel("Nome").fill(name);
  if (supplier) await dialog.getByLabel("Fornecedor (opcional)").fill(supplier);
  await dialog.getByLabel("Valor (R$)").fill(amount);
  await dialog.getByLabel("Dia do vencimento").fill(dueDay);
  if (startMonth) await dialog.getByLabel("Primeiro mês").fill(startMonth);
  await dialog.getByRole("button", { name: "Adicionar custo fixo" }).click();
  await expect(dialog).toBeHidden();
}

function monthTable(page: Page) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: monthName(today.slice(0, 7)) }) });
}

async function pay(page: Page, row: ReturnType<Page["locator"]>, amount?: string) {
  await row.getByRole("button", { name: "Pagar" }).filter({ visible: true }).click();
  const dialog = page.getByRole("dialog", { name: /^Pagar / });
  if (amount) await dialog.getByLabel("Valor pago (R$)").fill(amount);
  await dialog.getByText("Pix", { exact: true }).click();
  await dialog.getByRole("button", { name: "Registrar pagamento" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await query(`insert into categories (name, allows_manual_entry) values ('Custos fixos', false)`);
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("the screen opens from the Transações sub-menu", async ({ page }) => {
  await page.getByRole("link", { name: "Transações" }).first().click();
  await page.getByRole("navigation", { name: "Transações" }).getByRole("link", { name: "Custos fixos" }).click();
  await expect(page).toHaveURL("/fixed-costs");
  await expect(page.getByText("Nenhum custo fixo ainda.")).toBeVisible();
});

test("paying a month records the cost entry, and undoing removes it", async ({ page }) => {
  await createFixedCost(page, { name: "Energia elétrica", supplier: "Enel", amount: "180", dueDay: "28" });

  const row = monthTable(page).getByRole("row", { name: /Energia elétrica/ });
  await expect(row).toContainText("R$ 180,00");
  await expect(page.getByRole("group", { name: "A pagar" })).toContainText("R$ 180,00");

  // The bill came different from the usual amount
  await pay(page, row, "192.35");
  await expect(row).toContainText("Pago em");
  await expect(row).toContainText("R$ 192,35");
  await expect(page.getByRole("group", { name: "Pago" })).toContainText("R$ 192,35");
  await expect(page.getByRole("group", { name: "A pagar" })).toContainText("R$ 0,00");

  await page.goto("/entries");
  const entry = page.getByRole("row", { name: /Energia elétrica de/ });
  await expect(entry).toContainText("Custos fixos");
  await expect(entry).toContainText("Enel");
  await expect(entry).toContainText("192,35");
  await expect(entry.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await entry.getByRole("link", { name: "Ver custo fixo" }).click();
  await expect(page.getByRole("heading", { name: "Energia elétrica", level: 1 })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByRole("button", { name: "Pagar" })).toBeVisible();
  await page.goto("/entries");
  await expect(page.getByRole("row", { name: /Energia elétrica de/ })).toHaveCount(0);
});

test("a cost started months ago charges each month and shows the missed ones", async ({ page }) => {
  await createFixedCost(page, { name: "Aluguel da sede", amount: "1200", dueDay: "5", startMonth: monthsAgo(2) });

  const history = page.locator("section").filter({ has: page.getByRole("heading", { name: "Últimos 6 meses" }) });
  const historyRow = history.getByRole("row", { name: /Aluguel da sede/ });
  await expect(historyRow.getByText("R$ 1.200,00")).toHaveCount(3);
  // The current month is missed too once the 5th has passed
  const missedNow = Number(today.slice(8, 10)) > 5 ? 1 : 0;
  await expect(historyRow.getByTitle("Não pago")).toHaveCount(2 + missedNow);

  // A missed month opens from the history and is paid late
  await history.getByRole("link", { name: monthName(monthsAgo(2)) }).click();
  await expect(page).toHaveURL(`/fixed-costs?month=${monthsAgo(2)}`);
  const row = page.getByRole("row", { name: /Aluguel da sede/ }).first();
  await expect(row).toContainText("Atrasado");
  await pay(page, row);
  await expect(row).toContainText("Pago em");
  await expect(historyRow.getByTitle("Não pago")).toHaveCount(1 + missedNow);

  await page.goto("/dashboard");
  await expect(page.getByText("Custos fixos a pagar")).toBeVisible();
});

test("a new amount applies to the open months only, and a paid cost can only be ended", async ({ page }) => {
  await createFixedCost(page, { name: "Internet", amount: "99.90", dueDay: "10", startMonth: monthsAgo(1) });
  await page.getByRole("row", { name: /Internet/ }).first().getByRole("link", { name: "Internet" }).click();

  const months = page.locator("li").filter({ hasText: monthName(monthsAgo(1)) });
  await pay(page, months);

  await page.getByLabel("Valor (R$)").fill("119.90");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();
  await expect(page.locator("li").filter({ hasText: monthName(today.slice(0, 7)) })).toContainText("R$ 119,90");
  await expect(months).toContainText("R$ 99,90");

  await expect(page.getByRole("button", { name: "Excluir custo fixo" })).toHaveCount(0);
  await page.getByRole("button", { name: "Encerrar custo fixo" }).click();
  await expect(page.getByRole("button", { name: "Reabrir custo fixo" })).toBeVisible();

  await page.goto("/fixed-costs");
  const ended = page.locator("section").filter({ has: page.getByRole("heading", { name: "Encerrados" }) });
  await expect(ended.getByRole("link", { name: "Internet" })).toBeVisible();
});

test("a cost never paid can be deleted", async ({ page }) => {
  await createFixedCost(page, { name: "Seguro", amount: "89", dueDay: "25" });
  await page.getByRole("link", { name: "Seguro" }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir custo fixo" }).click();
  await expect(page).toHaveURL("/fixed-costs");
  await expect(page.getByText("Nenhum custo fixo ainda.")).toBeVisible();
});

test("a new entry can't use the fixed costs category", async ({ page }) => {
  await page.goto("/entries");
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
  await expect(dialog.getByRole("option", { name: "Custos fixos" })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "Custos fixos" })).toBeVisible();
});
