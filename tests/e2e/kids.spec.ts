import { expect, test } from "@playwright/test";
import { createItem, createKid, createUser, query, reset } from "./db";
import { likeOldSafari } from "./old-safari";
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

test("the list can be filtered by age group", async ({ page }) => {
  await createKid("Bia");
  await createKid("Caio");
  await createKid("Duda");
  await query(`update kids set age_group = 'b1' where name in ('Bia', 'Caio')`);
  await query(`update kids set age_group = 'guias' where name = 'Duda'`);
  await createKid("Enzo");

  await page.goto("/kids");
  const filter = page.getByRole("navigation", { name: "Ramo" });
  await expect(filter.getByRole("link", { name: "Todos 4" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(filter.getByRole("link", { name: "Ciranda 0" })).toBeVisible();

  await filter.getByRole("link", { name: "B1 2" }).click();
  await expect(page).toHaveURL("/kids?ramo=b1");
  await expect(filter.getByRole("link", { name: "B1 2" })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(page.getByRole("row", { name: /Bia/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Caio/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Duda|Enzo/ })).toHaveCount(0);
  // Every row would say B1, so the column goes away
  await expect(page.getByRole("columnheader", { name: "Ramo" })).toHaveCount(0);

  await filter.getByRole("link", { name: "Sem ramo 1" }).click();
  await expect(page.getByRole("row", { name: /Enzo/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Bia|Caio|Duda/ })).toHaveCount(0);

  await filter.getByRole("link", { name: "Ciranda 0" }).click();
  await expect(page.getByText("Nenhum bandeirante em Ciranda.")).toBeVisible();

  await filter.getByRole("link", { name: "Todos 4" }).click();
  await expect(page).toHaveURL("/kids");
  await expect(page.getByRole("row", { name: /Bia|Caio|Duda|Enzo/ })).toHaveCount(4);
  await expect(page.getByRole("columnheader", { name: "Ramo" })).toBeVisible();
});

test("clicking anywhere on a row opens that bandeirante, even on older Safari", async ({
  page,
}) => {
  await likeOldSafari(page);
  for (const name of ["Bia", "Caio", "Duda"]) await createKid(name);

  await page.goto("/kids");
  await page.getByRole("row", { name: /Bia/ }).getByRole("cell", { name: "Bia" }).click();
  await expect(page).toHaveURL(/\/kids\/\d+$/);
  await expect(page.getByRole("heading", { name: "Bia", level: 1 })).toBeVisible();

  await page.goBack();
  await page.getByRole("row", { name: /Caio/ }).getByRole("cell", { name: "Caio" }).click();
  await expect(page.getByRole("heading", { name: "Caio", level: 1 })).toBeVisible();
});
