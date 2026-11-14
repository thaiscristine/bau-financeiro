import { expect, test, type Page } from "@playwright/test";
import { createUser, passwordHashOf, reset } from "./db";
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

test("opening the login page while logged in goes to the dashboard", async ({
  page,
}) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");

  await page.goto("/login");
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
  const button = page.getByRole("button", { name: "Entrar" });
  await expect(button).toBeDisabled();

  // The wait counts from the first failure, so the seconds the five attempts
  // took are already off it
  const secondsShown = async () => {
    const text = await page.getByText(LOCKED_OUT).textContent();
    const [, minutes, seconds] = text!.match(/(\d+):(\d{2})/)!;
    return Number(minutes) * 60 + Number(seconds);
  };
  const firstShown = await secondsShown();
  expect(firstShown).toBeGreaterThan(14 * 60);
  expect(firstShown).toBeLessThanOrEqual(15 * 60);

  await page.clock.runFor("01:00");
  await expect.poll(secondsShown).toBe(firstShown - 60);
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
  // The cookie still reads as logged in, but the login page doesn't send it
  // back to the dashboard
  await expect(otherPage.getByRole("button", { name: "Entrar" })).toBeVisible();
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

// Time from pressing the button until the refusal shows up
async function timeWrongLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  const start = Date.now();
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText(WRONG_LOGIN)).toBeVisible();
  return Date.now() - start;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

test("an unknown e-mail is refused as slowly as a wrong password", async ({
  page,
}) => {
  // A first attempt warms the server up and isn't counted
  await timeWrongLogin(page, "aquecimento@example.com", "qualquer-senha");

  const unknown: number[] = [];
  const wrongPassword: number[] = [];
  // Alternated, and kept under the lockout limits of 5 per e-mail and 20 per IP
  for (let i = 1; i <= 8; i++) {
    unknown.push(await timeWrongLogin(page, `ninguem-${i}@example.com`, "qualquer-senha"));
    const email = i <= 4 ? "ana@example.com" : "bia@example.com";
    wrongPassword.push(await timeWrongLogin(page, email, `errada-${i}`));
  }

  // Skipping the password check made unknown e-mails several times faster
  const ratio = median(unknown) / median(wrongPassword);
  expect(ratio).toBeGreaterThan(0.6);
  expect(ratio).toBeLessThan(1.6);
});

test("logging in upgrades an older password hash", async ({ page }) => {
  await createUser("Cris", "cris@example.com", "senha-da-cris", 10);

  await login(page, "cris@example.com", "senha-da-cris");
  await expect(page).toHaveURL("/dashboard");

  expect(await passwordHashOf("cris@example.com")).toMatch(/^\$2[aby]\$12\$/);

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");
  await login(page, "cris@example.com", "senha-da-cris");
  await expect(page).toHaveURL("/dashboard");
});

async function changePassword(
  page: Page,
  current: string,
  next: string,
  confirm = next
) {
  await page.goto("/users");
  await page.getByLabel("Senha atual").fill(current);
  await page.getByLabel("Nova senha", { exact: true }).fill(next);
  await page.getByLabel("Confirmar nova senha").fill(confirm);
  await page.getByRole("button", { name: "Trocar senha" }).click();
}

test("changing the password logs out the other browsers only", async ({
  page,
  browser,
}) => {
  const laptop = await browser.newContext();
  const laptopPage = await laptop.newPage();
  await login(laptopPage, "ana@example.com", "senha-da-ana");
  await expect(laptopPage).toHaveURL("/dashboard");

  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await changePassword(page, "senha-da-ana", "nova-senha-da-ana");
  await expect(page.getByText(/Senha trocada\./)).toBeVisible();
  await expect(page.getByLabel("Senha atual")).toHaveValue("");

  // This browser stays in, the other one is out
  await page.goto("/entries");
  await expect(page).toHaveURL("/entries");
  await laptopPage.goto("/entries");
  await expect(laptopPage).toHaveURL("/login");
  await laptop.close();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page.getByText(WRONG_LOGIN)).toBeVisible();
  await login(page, "ana@example.com", "nova-senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("changing the password needs the current one", async ({ page }) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await changePassword(page, "senha-errada", "nova-senha-da-ana");
  await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("guessing the current password is limited like logins", async ({
  page,
}) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  for (let i = 1; i <= 5; i++) {
    await changePassword(page, `errada-${i}`, "nova-senha-da-ana");
    await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();
  }
  await changePassword(page, "senha-da-ana", "nova-senha-da-ana");
  await expect(page.getByText(/Muitas tentativas com a senha errada/)).toBeVisible();
});

test("a new password must be confirmed and fit bcrypt's limit", async ({
  page,
}) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");

  await changePassword(page, "senha-da-ana", "nova-senha-da-ana", "outra-senha");
  await expect(page.getByText("A confirmação não é igual à nova senha.")).toBeVisible();

  // 40 accented letters are 80 bytes, past what bcrypt reads
  await changePassword(page, "senha-da-ana", "á".repeat(40));
  await expect(page.getByText(/no máximo 72 caracteres/)).toBeVisible();
});

async function resetPassword(
  page: Page,
  teammate: string,
  next: string,
  ownPassword: string
) {
  await page.goto("/users");
  await page.getByLabel("Pessoa", { exact: true }).selectOption({ label: teammate });
  await page.getByLabel("Nova senha da pessoa").fill(next);
  await page.getByLabel("A sua senha").fill(ownPassword);
  await page.getByRole("button", { name: "Redefinir senha" }).click();
}

test("resetting a teammate's password logs them out everywhere", async ({
  page,
  browser,
}) => {
  const biaContext = await browser.newContext();
  const biaPage = await biaContext.newPage();
  await login(biaPage, "bia@example.com", "senha-da-bia");
  await expect(biaPage).toHaveURL("/dashboard");

  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await resetPassword(page, "Bia", "nova-senha-da-bia", "senha-da-ana");
  await expect(page.getByText(/Senha redefinida\./)).toBeVisible();
  await expect(page.getByLabel("A sua senha")).toHaveValue("");

  await biaPage.goto("/entries");
  await expect(biaPage).toHaveURL("/login");
  await login(biaPage, "bia@example.com", "senha-da-bia");
  await expect(biaPage.getByText(WRONG_LOGIN)).toBeVisible();
  await login(biaPage, "bia@example.com", "nova-senha-da-bia");
  await expect(biaPage).toHaveURL("/dashboard");
  await biaContext.close();

  // The one who reset stays logged in
  await page.goto("/entries");
  await expect(page).toHaveURL("/entries");
});

test("resetting a teammate's password needs your own", async ({ page }) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await resetPassword(page, "Bia", "nova-senha-da-bia", "senha-errada");
  await expect(page.getByText("A sua senha está incorreta.")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL("/login");
  await login(page, "bia@example.com", "senha-da-bia");
  await expect(page).toHaveURL("/dashboard");
});

test("a reset lets a locked out teammate in right away", async ({
  page,
  browser,
}) => {
  const biaContext = await browser.newContext();
  const biaPage = await biaContext.newPage();
  await lockOut(biaPage, "bia@example.com");

  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await resetPassword(page, "Bia", "nova-senha-da-bia", "senha-da-ana");
  await expect(page.getByText(/Senha redefinida\./)).toBeVisible();

  await login(biaPage, "bia@example.com", "nova-senha-da-bia");
  await expect(biaPage).toHaveURL("/dashboard");
  await biaContext.close();
});

test("you can't pick yourself in the reset form", async ({ page }) => {
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
  await page.goto("/users");
  const options = page.getByLabel("Pessoa", { exact: true }).getByRole("option");
  await expect(options).toHaveText(["Selecione", "Bia"]);
});
