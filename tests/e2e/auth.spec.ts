import { expect, test, type Page } from "@playwright/test";
import { createUser, reset } from "./db";
import { login } from "./session";

const WRONG_LOGIN = "E-mail ou senha inválidos.";
const LOCKED_OUT = /Muitas tentativas de login\. Tente novamente em \d+:\d{2}\./;

test.beforeEach(async () => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await createUser("Bia", "bia@example.com", "senha-da-bia");
});

test("logging in with the right password opens the dashboard", async ({
  page,
}) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

async function lockOut(page: Page, email: string) {
  for (let i = 1; i <= 5; i++) {
    await login(page, email, `errada-${i}`);
    await expect(page.getByText(WRONG_LOGIN)).toBeVisible();
  }
  await login(page, email, "errada-6");
  await expect(page.getByText(LOCKED_OUT)).toBeVisible();
}

test("too many wrong passwords turn the button off until the wait ends", async ({
  page,
}) => {
  await page.clock.install();
  await lockOut(page, "ana@example.com");
  await expect(page.getByText("Tente novamente em 15:00.")).toBeVisible();
  const button = page.getByRole("button", { name: "Entrar" });
  await expect(button).toBeDisabled();

  await page.clock.runFor("01:00");
  await expect(page.getByText("Tente novamente em 14:00.")).toBeVisible();
  await expect(button).toBeDisabled();

  await page.clock.runFor("14:00");
  await expect(page.getByText(LOCKED_OUT)).toHaveCount(0);
  await expect(button).toBeEnabled();
});

test("the right password is refused while locked out", async ({ page }) => {
  await lockOut(page, "ana@example.com");

  // Reloading the page turns the button back on, but the server still refuses
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page.getByText(LOCKED_OUT)).toBeVisible();
  await expect(page).toHaveURL("/login");
});

test("a locked out e-mail doesn't block other people", async ({ page }) => {
  await lockOut(page, "ana@example.com");

  await login(page, "bia@example.com", "senha-da-bia");
  await expect(page).toHaveURL("/dashboard");
});

test("logging out ends the session even where the cookie was copied", async ({
  page,
  browser,
}) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  const copiedCookies = await page.context().cookies();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  const elsewhere = await browser.newContext();
  await elsewhere.addCookies(copiedCookies);
  const otherPage = await elsewhere.newPage();
  await otherPage.goto("/dashboard");
  await expect(otherPage).toHaveURL("/login");
  await elsewhere.close();
});

test("logging out on one browser keeps the others logged in", async ({
  page,
  browser,
}) => {
  const laptop = await browser.newContext();
  const laptopPage = await laptop.newPage();
  await login(laptopPage, "ana@example.com", "senha-da-ana");
  await expect(laptopPage).toHaveURL("/dashboard");

  await login(page, "ana@example.com", "senha-da-ana");
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");

  await laptopPage.goto("/entries");
  await expect(laptopPage).toHaveURL("/entries");
  await laptop.close();
});

test("removing a user logs them out right away", async ({ page, browser }) => {
  const biaContext = await browser.newContext();
  const biaPage = await biaContext.newPage();
  await login(biaPage, "bia@example.com", "senha-da-bia");
  await expect(biaPage).toHaveURL("/dashboard");

  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await page.goto("/users");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row", { name: /Bia/ })
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(page.getByRole("row", { name: /Bia/ })).toHaveCount(0);

  await biaPage.goto("/entries");
  await expect(biaPage).toHaveURL("/login");
  await biaContext.close();
});
