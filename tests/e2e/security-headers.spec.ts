import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { createUser, reset } from "./db";
import { login } from "./session";

test.beforeEach(async () => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
});

function directives(csp: string | undefined) {
  return new Map(
    (csp ?? "")
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...values]) => [name, values])
  );
}

test("pages carry the security headers", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("same-origin");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();

  const csp = directives(headers["content-security-policy"]);
  expect(csp.get("default-src")).toEqual(["'self'"]);
  expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
  expect(csp.get("object-src")).toEqual(["'none'"]);
  expect(csp.get("form-action")).toEqual(["'self'"]);
  expect(csp.get("script-src")).toContain("'strict-dynamic'");
  expect(csp.get("script-src")).not.toContain("'unsafe-inline'");
  expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
});

test("every page load gets a fresh script nonce", async ({ request }) => {
  const nonceOf = async () => {
    const response = await request.get("/login");
    const csp = directives(response.headers()["content-security-policy"]);
    return csp.get("script-src")?.find((value) => value.startsWith("'nonce-"));
  };

  const first = await nonceOf();
  const second = await nonceOf();
  expect(first).toBeTruthy();
  expect(first).not.toBe(second);
});

test("a script slipped into the page doesn't run", async ({ page }) => {
  // Stands in for stored XSS: markup that made it into the HTML unescaped
  await page.route("**/login", async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      "<body",
      "<script>window.injected = true</script><body"
    );
    await route.fulfill({ response, body: html });
  });

  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
});

test("other sites can't show the app inside a frame", async ({
  page,
  baseURL,
}) => {
  // A real local server, so the browser treats it as just another site
  const attacker = createServer((_request, response) => {
    response.setHeader("content-type", "text/html");
    response.end(
      `<iframe src="${baseURL}/login" onload="document.title = 'loaded'"></iframe>`
    );
  });
  await new Promise<void>((resolve) => attacker.listen(0, "127.0.0.1", resolve));
  const { port } = attacker.address() as AddressInfo;

  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(page).toHaveTitle("loaded");
    await expect(
      page.frameLocator("iframe").getByLabel("E-mail")
    ).toHaveCount(0);
  } finally {
    attacker.close();
  }
});

const PAGES = [
  "/dashboard",
  "/entries",
  "/sales",
  "/inventory",
  "/kids",
  "/categories",
  "/users",
  "/reports",
];

test("the app works without breaking its own policy", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) {
      violations.push(`${page.url()}: ${message.text()}`);
    }
  });

  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");

  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
  }

  // Client navigation and an interactive control, both driven by scripts
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Transações", exact: true })
    .click();
  await expect(page).toHaveURL("/entries");
  await page.getByRole("button", { name: "Tema escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  expect(violations).toEqual([]);
});
