import { expect, test } from "@playwright/test";
import { createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await page.goto("/users");
});

test("a new user is added from the modal", async ({ page }) => {
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Novo usuário" }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nome")).toBeFocused();

  await dialog.getByLabel("Nome").fill("Bia");
  await dialog.getByLabel("E-mail").fill("Bia@Example.com");
  await dialog.getByLabel("Senha").fill("senha-da-bia");
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: /bia@example\.com/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo usuário" })).toBeFocused();
});

test("an error keeps the modal open with what was typed", async ({ page }) => {
  await page.getByRole("button", { name: "Novo usuário" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });
  await dialog.getByLabel("Nome").fill("Ana de novo");
  await dialog.getByLabel("E-mail").fill("ana@example.com");
  await dialog.getByLabel("Senha").fill("outra-senha");
  await dialog.getByRole("button", { name: "Adicionar" }).click();

  await expect(dialog.getByText("Já existe um usuário com esse e-mail.")).toBeVisible();
  await expect(dialog.getByLabel("Nome")).toHaveValue("Ana de novo");
});

test("closing the modal discards what was typed", async ({ page }) => {
  const open = page.getByRole("button", { name: "Novo usuário" });
  const dialog = page.getByRole("dialog", { name: "Novo usuário" });

  await open.click();
  await dialog.getByLabel("Nome").fill("Bia");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await open.click();
  await expect(dialog.getByLabel("Nome")).toHaveValue("");
  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row")).toHaveCount(2);
});
