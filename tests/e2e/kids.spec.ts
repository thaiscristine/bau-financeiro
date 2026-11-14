import { expect, test } from "@playwright/test";
import { createItem, createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("a new bandeirante can be put in an age group and moved to another", async ({
  page,
}) => {
  await page.goto("/kids");
  await page.getByRole("button", { name: "Novo bandeirante" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo bandeirante" });
  await expect(dialog.getByLabel("Nome")).toBeFocused();
  await dialog.getByLabel("Ramo (opcional)").selectOption("B2");
  await dialog.getByLabel("Nome").fill("Clara");
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: /Clara/ });
  await expect(row.getByRole("cell", { name: "B2", exact: true })).toBeVisible();

  await row.getByRole("link", { name: "Ver" }).click();
  const ageGroup = page.getByLabel("Ramo (opcional)");
  await expect(ageGroup).toHaveValue("b2");
  await ageGroup.selectOption("Guias");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Dados salvos.")).toBeVisible();

  await page.goto("/kids");
  await expect(
    page.getByRole("row", { name: /Clara/ }).getByRole("cell", { name: "Guias", exact: true })
  ).toBeVisible();
});

test("the age group is optional", async ({ page }) => {
  await page.goto("/kids");
  await page.getByRole("button", { name: "Novo bandeirante" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo bandeirante" });
  await dialog.getByLabel("Nome").fill("Duda");
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog).toBeHidden();
  await page.getByRole("row", { name: /Duda/ }).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByLabel("Ramo (opcional)")).toHaveValue("");
});

test("a bandeirante registered with a sale gets the chosen age group", async ({
  page,
}) => {
  await createItem("Camiseta", "35.00");

  await page.goto("/sales");
  await page.getByRole("button", { name: "Nova venda" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova venda" });
  await dialog.getByLabel("Bandeirante", { exact: true }).selectOption("Outro (não cadastrado)");
  await dialog.getByLabel("Nome do novo bandeirante").fill("Bel");
  await dialog.getByLabel("Ramo (opcional)").selectOption("Ciranda");
  await dialog.getByRole("button", { name: "Registrar venda" }).click();
  await expect(page).toHaveURL(/\/sales\/\d+$/);

  await page.goto("/kids");
  await expect(
    page.getByRole("row", { name: /Bel/ }).getByRole("cell", { name: "Ciranda", exact: true })
  ).toBeVisible();
});
