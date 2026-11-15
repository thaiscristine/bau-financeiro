import { expect, test, type Page } from "@playwright/test";
import { createItem, createKid, createUser, query, recordSale, reset } from "./db";
import { likeOldSafari } from "./old-safari";
import { login } from "./session";

// The app's today, in the organization's timezone
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const money = (value: string) => new RegExp(`R\\$\\s${value}`);

function daysFromToday(days: number) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// The first day of the month `delta` months from today's
function monthFromToday(delta: number) {
  const date = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

function stat(page: Page, label: string) {
  return page.getByRole("group", { name: label, exact: true });
}

function debtsSection(page: Page) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Situação financeira" }) });
}

test.beforeEach(async ({ page }) => {
  // Every list here opens from the whole row
  await likeOldSafari(page);
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");

  // Bia owes a bit of everything, half of it late
  await createKid("Bia");
  await createKid("Caio");
  // No monthly fee on file, so the page does not add the year's months on its own
  for (const [delta, due] of [[-2, false], [-1, true], [0, true], [1, true]] as const) {
    await query(
      `insert into contributions (kid_id, month, amount, due)
       select id, $1, 20, $2 from kids where name = 'Bia'`,
      [monthFromToday(delta), due]
    );
  }
  await createItem("Camiseta", "40.00");
  await recordSale("Bia", "Camiseta", 1, daysFromToday(-40), [
    { amount: "15.00", dueDate: daysFromToday(-10) },
    { amount: "25.00", dueDate: daysFromToday(20) },
  ]);
  const {
    rows: [event],
  } = await query(
    `insert into events (name, start_date, price) values ('Cigga', $1, 100) returning id`,
    [daysFromToday(30)]
  );
  const {
    rows: [participant],
  } = await query(
    `insert into event_participants (event_id, kid_id, total)
     select $1, id, 100 from kids where name = 'Bia' returning id`,
    [event.id]
  );
  await query(
    `insert into event_installments (participant_id, number, amount, due_date)
     values ($1, 1, 60, $2), ($1, 2, 40, $3)`,
    [participant.id, daysFromToday(-5), daysFromToday(25)]
  );
  // A guest owes too, but is nobody's debt
  const {
    rows: [guest],
  } = await query(
    `insert into event_participants (event_id, guest_name, total) values ($1, 'Visitante', 100) returning id`,
    [event.id]
  );
  await query(
    `insert into event_installments (participant_id, number, amount, due_date) values ($1, 1, 100, $2)`,
    [guest.id, daysFromToday(-5)]
  );

  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("a bandeirante's page opens with everything they owe, per origin", async ({ page }) => {
  await page.goto("/kids");
  const row = page.getByRole("row", { name: /Bia/ });
  // Late: last month's contribution, the sale's and the event's first installments.
  // Next month's contribution is not owed yet.
  await expect(row).toContainText(money("180,00"));
  await expect(row).toContainText("R$ 95,00 atrasado");
  await expect(page.getByRole("row", { name: /Caio/ })).toContainText(money("0,00"));

  await row.getByRole("cell", { name: "Bia" }).click();
  await expect(page.getByRole("heading", { name: "Bia", level: 1 })).toBeVisible();
  const debts = debtsSection(page);
  await expect(stat(page, "A pagar")).toContainText(money("180,00"));
  await expect(stat(page, "Atrasado")).toContainText(money("95,00"));
  await expect(stat(page, "A vencer")).toContainText(money("85,00"));

  // Late ones first, the oldest at the top
  const rows = debts.locator("tbody tr");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Contribuição mensal");
  await expect(rows.nth(0)).toContainText(money("20,00"));
  await expect(rows.nth(1)).toContainText("Camiseta");
  await expect(rows.nth(1)).toContainText("Lojinha · 1 parcela atrasada");
  await expect(rows.nth(1)).toContainText(money("15,00"));
  await expect(rows.nth(1)).toContainText(money("25,00"));
  await expect(rows.nth(2)).toContainText("Cigga");
  await expect(rows.nth(2)).toContainText(money("60,00"));
  await expect(rows.nth(2)).toContainText(money("40,00"));

  // Each row opens where that charge is paid
  await rows.nth(1).getByText(/^Lojinha/).click();
  await expect(page).toHaveURL(/\/sales\/\d+$/);
  await page.goBack();
  await rows.nth(2).getByText(/^Evento/).click();
  await expect(page).toHaveURL(/\/events\/\d+\/participants\/\d+$/);
  await page.goBack();
  await debtsSection(page).getByRole("link", { name: "Contribuição mensal" }).click();
  await expect(page).toHaveURL(/\/kids\/\d+#contribuicao-mensal$/);
  await expect(page.locator("#contribuicao-mensal")).toBeInViewport();
});

test("a bandeirante with nothing open says so", async ({ page }) => {
  await page.goto("/kids");
  await page.getByRole("row", { name: /Caio/ }).getByRole("link", { name: "Ver" }).click();
  await expect(debtsSection(page)).toContainText("Nenhum valor em aberto.");
});

test("a bandeirante's name opens their page from every list", async ({ page }) => {
  const expectBia = async () => {
    await expect(page).toHaveURL(/\/kids\/\d+$/);
    await expect(page.getByRole("heading", { name: "Bia", level: 1 })).toBeVisible();
    await expect(stat(page, "A pagar")).toContainText(money("180,00"));
  };

  await page.goto("/sales");
  await page.getByRole("row", { name: /Camiseta/ }).getByRole("link", { name: "Bia" }).click();
  await expectBia();

  // Anywhere on a debtor's row
  await page.goto("/sales/report");
  await page.getByRole("row", { name: /Bia/ }).getByText(money("15,00")).click();
  await expectBia();

  await page.goto("/events");
  await page.getByRole("row", { name: /Cigga/ }).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByRole("row", { name: /Visitante/ }).getByRole("link", { name: "Visitante" })).toHaveCount(0);
  await page.getByRole("link", { name: "Bia", exact: true }).click();
  await expectBia();

  // A paid installment shows who paid in the transactions
  await page.goto(`/sales`);
  await page.getByRole("row", { name: /Camiseta/ }).getByRole("link", { name: "Ver" }).click();
  const first = page.getByRole("listitem").filter({ hasText: "1ª parcela" });
  await first.getByLabel("Forma de pagamento").selectOption("Pix");
  await first.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(first.getByRole("button", { name: "Desfazer" })).toBeVisible();
  await page.goto("/entries");
  await page.getByRole("row", { name: /Camiseta/ }).getByRole("link", { name: "Bia" }).click();
  await expect(page).toHaveURL(/\/kids\/\d+$/);
  await expect(stat(page, "A pagar")).toContainText(money("165,00"));
});

test("an event's extra charge gets its own row", async ({ page }) => {
  const {
    rows: [charge],
  } = await query(
    `insert into event_charges (event_id, name, price)
     select id, 'Passagem aérea', 300 from events where name = 'Cigga' returning id`
  );
  await query(
    `insert into event_installments (participant_id, charge_id, number, amount, due_date)
     select participant.id, $1, 1, 300, $2
     from event_participants participant join kids on kids.id = participant.kid_id
     where kids.name = 'Bia'`,
    [charge.id, daysFromToday(15)]
  );

  await page.goto("/kids");
  await page.getByRole("row", { name: /Bia/ }).getByRole("link", { name: "Ver" }).click();
  await expect(stat(page, "A pagar")).toContainText(money("480,00"));
  const row = debtsSection(page).getByRole("row", { name: /Cigga · Passagem aérea/ });
  await expect(row).toContainText(money("300,00"));
  // The fee stays on its own row, with only its installments
  await expect(
    debtsSection(page).getByRole("row", { name: /^Cigga Evento/ })
  ).toContainText(money("60,00"));
});
