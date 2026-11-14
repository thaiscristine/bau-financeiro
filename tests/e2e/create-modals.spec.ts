import { expect, test } from "@playwright/test";
import { createCategory, createItem, createKid, createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("a transaction is added from a modal on the list", async ({ page }) => {
  await createCategory("Doações");

  await page.goto("/entries");
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
  await expect(dialog.getByLabel("Valor (R$)")).toBeFocused();
  await dialog.getByLabel("Valor (R$)").fill("50");
  await dialog.getByLabel("Quem pagou (opcional)").fill("Dona Rosa");
  await dialog.getByText("Pix", { exact: true }).click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL("/entries");
  await expect(page.getByRole("row", { name: /Dona Rosa/ })).toContainText("R$ 50,00");
});

test("a stock item is added from a modal on the list", async ({ page }) => {
  await createCategory("Lojinha", { allowsManualEntry: false });

  await page.goto("/inventory");
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await expect(dialog.getByLabel("Nome")).toBeFocused();
  await dialog.getByLabel("Nome").fill("Boné");
  await dialog.getByLabel("Preço de venda (R$)").fill("25");
  await dialog.getByLabel("Quantidade inicial em estoque").fill("10");
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: /Boné/ })).toContainText("10");
});

test("an error keeps the modal open with what was typed, and reopening starts empty", async ({
  page,
}) => {
  await createCategory("Lojinha", { allowsManualEntry: false });

  await page.goto("/inventory");
  await page.getByRole("button", { name: "Novo item" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo item" });
  await dialog.getByLabel("Nome").fill("Camiseta");
  await dialog.getByLabel("Preço de venda (R$)").fill("35");
  await dialog.getByLabel("Valor da mercadoria (R$)").fill("100");
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog.getByText("Informe a quantidade inicial que foi paga.")).toBeVisible();
  await expect(dialog.getByLabel("Nome")).toHaveValue("Camiseta");

  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Novo item" }).click();
  await expect(dialog.getByLabel("Nome")).toHaveValue("");
  await expect(dialog.getByText("Informe a quantidade inicial que foi paga.")).toBeHidden();
});

test("a sale started from a bandeirante's page is for that bandeirante", async ({
  page,
}) => {
  await createKid("Ana Clara");
  await createKid("Bia");
  await createItem("Camiseta", "35.00");

  await page.goto("/kids");
  await page.getByRole("row", { name: /Bia/ }).getByRole("link", { name: "Ver" }).click();
  await page.getByRole("button", { name: "Nova venda" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova venda" });
  await expect(
    dialog.getByLabel("Bandeirante", { exact: true }).locator("option:checked")
  ).toHaveText("Bia");
  await dialog.getByRole("button", { name: "Registrar venda" }).click();

  await expect(page).toHaveURL(/\/sales\/\d+$/);
  await expect(page.getByText("Bia").first()).toBeVisible();
});

test("Nova venda asks for an item first when the stock is empty", async ({ page }) => {
  await page.goto("/sales");
  await page.getByRole("button", { name: "Nova venda" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova venda" });
  await expect(dialog).toContainText("Antes de registrar uma venda");
  await dialog.getByRole("link", { name: "Estoque" }).click();
  await expect(page).toHaveURL("/inventory");
});
