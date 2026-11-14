import { expect, test, type Page } from "@playwright/test";
import { createCategory, createItem, createKid, createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

async function addIncome(page: Page) {
  await createCategory("Doações");
  await page.goto("/entries");
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
  await dialog.getByLabel("Valor (R$)").fill("50");
  await dialog.getByLabel("Quem pagou (opcional)").fill("Dona Rosa");
  await dialog.getByText("Pix", { exact: true }).click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByRole("row", { name: /Dona Rosa/ })).toBeVisible();
}

test("a new income gets confetti, which clears itself", async ({ page }) => {
  await addIncome(page);
  await expect(page.getByTestId("confetti")).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0, { timeout: 10_000 });
});

test("a new expense gets no confetti", async ({ page }) => {
  await createCategory("Material");

  await page.goto("/entries");
  await page.getByRole("button", { name: "Nova transação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova transação" });
  await dialog.getByText("Saída").click();
  await dialog.getByLabel("Valor (R$)").fill("30");
  await dialog.getByLabel("Fornecedor (opcional)").fill("Papelaria");
  await dialog.getByText("Dinheiro", { exact: true }).click();
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: /Papelaria/ })).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0);
});

test("a new income gets no confetti when the device asks for less motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await addIncome(page);
  await expect(page.getByTestId("confetti")).toHaveCount(0);
});

test("paying an installment gets confetti, and a failed payment doesn't", async ({
  page,
}) => {
  await createKid("Bia");
  await createItem("Camiseta", "35.00");

  await page.goto("/sales");
  await page.getByRole("button", { name: "Nova venda" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova venda" });
  await dialog.getByLabel("Parcelas").fill("2");
  await dialog.getByRole("button", { name: "Registrar venda" }).click();
  await expect(page).toHaveURL(/\/sales\/\d+$/);
  await expect(page.getByTestId("confetti")).toHaveCount(0);

  const first = page.getByRole("listitem").filter({ hasText: "1ª parcela" });
  await first.getByLabel("Forma de pagamento").selectOption("Pix");
  await first.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(first.getByRole("button", { name: "Desfazer" })).toBeVisible();
  await expect(page.getByTestId("confetti")).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0, { timeout: 10_000 });

  // An empty date is refused by the server, so nothing was paid
  const second = page.getByRole("listitem").filter({ hasText: "2ª parcela" });
  await second.getByLabel("Data do pagamento").evaluate((input) => {
    input.removeAttribute("required");
    (input as HTMLInputElement).value = "";
  });
  await second.getByLabel("Forma de pagamento").selectOption("Pix");
  await second.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(second.locator("p.text-cost")).toBeVisible();
  await expect(page.getByTestId("confetti")).toHaveCount(0);
});
