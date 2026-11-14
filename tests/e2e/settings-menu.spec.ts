import { expect, test } from "@playwright/test";
import { createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("Usuários and Categorias live in the Configurações drop-down", async ({ page }) => {
  const menu = page.getByRole("banner").getByRole("navigation").first();
  const trigger = menu.getByRole("button", { name: "Configurações" });
  const dropdown = page.getByRole("list", { name: "Configurações" });
  await expect(menu.getByRole("link", { name: "Usuários" })).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toHaveCSS("cursor", "pointer");

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(dropdown).toBeVisible();
  // Opens under its button
  const button = (await trigger.boundingBox())!;
  const list = (await dropdown.boundingBox())!;
  expect(list.y).toBeGreaterThanOrEqual(button.y + button.height);
  expect(list.y).toBeLessThan(button.y + button.height + 16);

  await dropdown.getByRole("link", { name: "Usuários" }).click();
  await expect(page).toHaveURL("/users");
  await expect(dropdown).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.click();
  await expect(dropdown.getByRole("link", { name: "Usuários" })).toHaveAttribute("aria-current", "page");
  await dropdown.getByRole("link", { name: "Categorias" }).click();
  await expect(page).toHaveURL("/categories");

  await trigger.click();
  await expect(dropdown.getByRole("link", { name: "Categorias" })).toHaveAttribute("aria-current", "page");
  await expect(dropdown.getByRole("link", { name: "Usuários" })).not.toHaveAttribute("aria-current");

  // Escape closes it and leaves focus on the button
  await page.keyboard.press("Escape");
  await expect(dropdown).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("clicking outside or tabbing away closes the drop-down", async ({ page }) => {
  const trigger = page.getByRole("button", { name: "Configurações" });
  const dropdown = page.getByRole("list", { name: "Configurações" });

  await trigger.click();
  await expect(dropdown).toBeVisible();
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  await expect(dropdown).toBeHidden();

  // Wait for the page under the menu, or Tab can leave the page while it loads
  const nextOnPage = page.getByRole("link", { name: "Este mês" });
  await expect(nextOnPage).toBeVisible();
  await trigger.click();
  await page.keyboard.press("Tab");
  await expect(dropdown.getByRole("link", { name: "Usuários" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(nextOnPage).toBeFocused();
  await expect(dropdown).toBeHidden();
});

test("on a phone the drop-down is not clipped by the scrolling menu", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  const trigger = page.getByRole("button", { name: "Configurações" });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const dropdown = page.getByRole("list", { name: "Configurações" });
  const box = (await dropdown.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  await dropdown.getByRole("link", { name: "Categorias" }).click();
  await expect(page).toHaveURL("/categories");
});
