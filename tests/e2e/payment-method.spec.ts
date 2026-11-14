import { expect, test } from "@playwright/test";
import {
  createCategory,
  createItem,
  createKid,
  createUntrackedIncome,
  createUser,
  reset,
} from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("a transaction needs a payment method, which shows on the list and the dashboard", async ({
  page,
}) => {
  await createCategory("Doações");

  await page.goto("/entries");
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
  const methods = dialog.getByRole("group", { name: "Forma de pagamento" });
  for (const method of ["Dinheiro", "Pix", "Débito", "Crédito"]) {
    await expect(methods.getByRole("radio", { name: method })).not.toBeChecked();
  }

  await dialog.getByLabel("Valor (R$)").fill("80");
  await dialog.getByLabel("Quem pagou (opcional)").fill("Dona Rosa");
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(dialog.getByText("Selecione a forma de pagamento.")).toBeVisible();

  await methods.getByText("Débito").click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: /Dona Rosa/ })).toContainText("Débito");

  await page.goto("/dashboard");
  const section = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Por forma de pagamento" }) });
  await expect(section.getByRole("row", { name: /Débito/ })).toContainText("R$ 80,00");
});

test("paying an installment records how it was paid", async ({ page }) => {
  await createKid("Bia");
  await createItem("Camiseta", "35.00");

  await page.goto("/sales");
  await page.getByRole("button", { name: "Nova venda" }).click();
  await page
    .getByRole("dialog", { name: "Nova venda" })
    .getByRole("button", { name: "Registrar venda" })
    .click();
  await expect(page).toHaveURL(/\/sales\/\d+$/);

  const installment = page.getByRole("listitem").filter({ hasText: "1ª parcela" });
  await installment.getByLabel("Forma de pagamento").selectOption("Crédito");
  await installment.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(installment).toContainText(/Paga em \d{2}\/\d{2}\/\d{4} · Crédito/);

  await page.goto("/entries");
  await expect(page.getByRole("row", { name: /Bia/ })).toContainText("Crédito");
});

test("a paid restock records how it was paid", async ({ page }) => {
  await createCategory("Lojinha", { allowsManualEntry: false });
  await createCategory("Fornecedores");

  await page.goto("/inventory");
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Nome").fill("Boné");
  await dialog.getByLabel("Preço de venda (R$)").fill("25");
  await dialog.getByLabel("Quantidade inicial em estoque").fill("10");
  await dialog.getByLabel("Valor da mercadoria (R$)").fill("120");
  await dialog.getByLabel("Fornecedor").fill("Bonés & Cia");
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(dialog.getByText("Selecione a forma de pagamento da compra.")).toBeVisible();

  await dialog
    .getByRole("group", { name: "Forma de pagamento da compra" })
    .getByText("Dinheiro")
    .click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(dialog).toBeHidden();

  await page.goto("/entries");
  await expect(page.getByRole("row", { name: /Bonés & Cia/ })).toContainText("Dinheiro");
});

test("an entry from before the payment method was tracked asks for it when edited", async ({
  page,
}) => {
  await createCategory("Doações");
  await createUntrackedIncome("Doações", "40.00", "Seu Jorge");

  await page.goto("/entries");
  const row = page.getByRole("row", { name: /Seu Jorge/ });
  await expect(row).toContainText("Não informada");

  await row.getByRole("link", { name: "Editar" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Selecione a forma de pagamento.")).toBeVisible();

  await page.getByText("Pix", { exact: true }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page).toHaveURL("/entries");
  await expect(page.getByRole("row", { name: /Seu Jorge/ })).toContainText("Pix");
});
