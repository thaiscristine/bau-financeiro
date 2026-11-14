import { expect, test } from "@playwright/test";
import { createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("the guide opens from the menu and its topics jump to their section", async ({
  page,
}) => {
  await page.getByRole("link", { name: "Ajuda" }).click();
  await expect(page).toHaveURL("/help");
  await expect(page.getByRole("link", { name: "Ajuda" })).toHaveAttribute("aria-current", "page");

  const topics = page.getByRole("navigation", { name: "Tópicos da ajuda" });
  await topics.getByRole("link", { name: "Lojinha: vendas e parcelas" }).click();
  await expect(page).toHaveURL("/help#lojinha");
  const section = page.getByRole("region", { name: "Lojinha: vendas e parcelas" });
  await expect(section).toBeInViewport();

  await section.getByRole("link", { name: "Abrir a tela" }).click();
  await expect(page).toHaveURL("/sales");
});
