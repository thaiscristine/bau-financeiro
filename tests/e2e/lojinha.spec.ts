import { expect, test, type Page } from "@playwright/test";
import { createKid, createStockItem, createUser, recordSale, reset } from "./db";
import { login } from "./session";

// The app's today, in the organization's timezone
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const nextMonth = (() => {
  const [year, month] = today.split("-").map(Number);
  return `${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, "0")}-10`;
})();

const money = (value: string) => new RegExp(`R\\$\\s${value}`);

function stat(page: Page, label: string) {
  return page.getByRole("group", { name: label, exact: true });
}

function section(page: Page, title: string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: title }) });
}

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("Estoque and the report live in the Lojinha sub-menu", async ({ page }) => {
  const menu = page.getByRole("banner").getByRole("navigation").first();
  await expect(menu.getByRole("link", { name: "Estoque" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Lojinha" })).toHaveCount(0);

  await menu.getByRole("link", { name: "Lojinha" }).click();
  await expect(page).toHaveURL("/sales");
  const submenu = page.getByRole("navigation", { name: "Lojinha" });
  await expect(submenu.getByRole("link", { name: "Vendas" })).toHaveAttribute("aria-current", "page");

  await submenu.getByRole("link", { name: "Estoque" }).click();
  await expect(page).toHaveURL("/inventory");
  await expect(submenu.getByRole("link", { name: "Estoque" })).toHaveAttribute("aria-current", "page");
  await expect(submenu.getByRole("link", { name: "Vendas" })).not.toHaveAttribute("aria-current");

  await submenu.getByRole("link", { name: "Relatório" }).click();
  await expect(page).toHaveURL("/sales/report");
  await expect(page.getByRole("heading", { name: "Relatório da Lojinha" })).toBeVisible();
  await expect(submenu.getByRole("link", { name: "Relatório" })).toHaveAttribute("aria-current", "page");
  await expect(submenu.getByRole("link", { name: "Vendas" })).not.toHaveAttribute("aria-current");
});

test("the report sums the period's sales and lists who owes and what is running out", async ({
  page,
}) => {
  await createKid("Alice");
  await createKid("Bia");
  await createStockItem("Camiseta", "30.00", 6);
  await createStockItem("Boné", "20.00", 2);
  await recordSale("Alice", "Camiseta", 2, today, [
    { amount: "30.00", dueDate: today, paidOn: today },
    { amount: "30.00", dueDate: nextMonth },
  ]);
  await recordSale("Bia", "Boné", 1, "2020-01-01", [{ amount: "20.00", dueDate: "2020-01-10" }]);

  await page.goto("/sales/report");
  await expect(page.getByRole("link", { name: "Este mês" })).toHaveAttribute("aria-current", "page");
  await expect(stat(page, "Vendido")).toContainText(money("60,00"));
  await expect(stat(page, "Recebido")).toContainText(money("30,00"));
  await expect(stat(page, "Vendas")).toContainText("2 unidades");
  await expect(stat(page, "A receber em parcelas")).toContainText(money("50,00"));
  await expect(stat(page, "Parcelas atrasadas")).toContainText(money("20,00"));

  // Nothing was paid for stock, so all that came in is profit
  const profit = section(page, "Lucro");
  await expect(profit.getByRole("group", { name: "Pago em reposição" })).toContainText(money("0,00"));
  await expect(profit.getByRole("group", { name: "Lucro" })).toContainText(money("30,00"));
  await expect(profit.getByRole("group", { name: "Lucro" })).toContainText("100% do recebido");

  const topItems = section(page, "Mais vendidos");
  await expect(topItems.getByRole("row")).toHaveCount(2);
  await expect(topItems.getByRole("row").nth(1)).toContainText("Camiseta");

  // The most overdue first
  const debtors = section(page, "Quem deve").getByRole("row");
  await expect(debtors.nth(1)).toContainText("Bia");
  await expect(debtors.nth(1)).toContainText("10/01/2020");
  await expect(debtors.nth(2)).toContainText("Alice");

  const lowStock = section(page, "Estoque acabando").getByRole("row");
  await expect(lowStock.nth(1)).toContainText("Boné");
  await expect(lowStock.nth(1)).toContainText("1 unidade");
  await expect(lowStock.nth(2)).toContainText("4 unidades");

  await page.getByRole("link", { name: "Tudo" }).click();
  await expect(page).toHaveURL("/sales/report?period=all");
  await expect(stat(page, "Vendido")).toContainText(money("80,00"));
  await expect(topItems.getByRole("row")).toHaveCount(3);

  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar planilha" }).click();
  expect((await download).suggestedFilename()).toMatch(/^vendas.*\.xlsx$/);
});
