import { expect, test, type Page } from "@playwright/test";
import { createKid, createUser, query, reset } from "./db";
import { login } from "./session";

// The app's today, in the organization's timezone
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

const money = (value: string) => new RegExp(`R\\$\\s${value}`);

function stat(page: Page, label: string) {
  return page.getByRole("group", { name: label, exact: true });
}

function section(page: Page, title: RegExp | string) {
  return page.locator("section").filter({ has: page.getByRole("heading", { name: title }) });
}

async function createEvent(page: Page, name: string, price: string) {
  await page.goto("/events");
  await page.getByRole("button", { name: "Novo evento" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill(name);
  await dialog.getByLabel("Início").fill("2026-10-10");
  await dialog.getByLabel("Término (opcional)").fill("2026-10-12");
  await dialog.getByLabel("Valor por participante (R$)").fill(price);
  await dialog.getByRole("button", { name: "Criar evento" }).click();
  await expect(page).toHaveURL(/\/events\/\d+$/);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
}

async function signUp(
  page: Page,
  who: { kid: string } | { guest: string },
  installments: number,
  firstDueDate: string
) {
  await page.getByRole("button", { name: "Inscrever participante" }).click();
  const dialog = page.getByRole("dialog");
  if ("kid" in who) {
    await dialog.getByLabel("Participante", { exact: true }).selectOption({ label: who.kid });
  } else {
    await dialog.getByLabel("Participante", { exact: true }).selectOption({ label: "Convidado (não cadastrado)" });
    await dialog.getByLabel("Nome do convidado").fill(who.guest);
  }
  await dialog.getByLabel("Parcelas").fill(String(installments));
  await dialog.getByLabel("Vencimento da 1ª parcela").fill(firstDueDate);
  await dialog.getByRole("button", { name: "Inscrever", exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function addExpense(
  page: Page,
  expense: { description: string; amount: string; date: string; kind?: string; paidWith?: string }
) {
  await page.getByRole("button", { name: "Nova despesa" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Despesa", { exact: true }).fill(expense.description);
  await dialog.getByLabel("Valor (R$)").fill(expense.amount);
  await dialog.getByLabel("Data", { exact: true }).fill(expense.date);
  if (expense.kind) await dialog.getByLabel("Tipo (opcional)").fill(expense.kind);
  if (expense.paidWith) {
    await dialog.getByText(expense.paidWith, { exact: true }).click();
  } else {
    await dialog.getByText("A pagar", { exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Adicionar despesa" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  await reset();
  await createUser("Ana", "ana@example.com", "senha-da-ana");
  await login(page, "ana@example.com", "senha-da-ana");
  await expect(page).toHaveURL("/dashboard");
});

test("an event takes sign-ups paid in installments and expenses, and its money reaches Transações and the Painel", async ({
  page,
}) => {
  await createKid("Alice");
  await query("update kids set age_group = 'b1' where name = 'Alice'");

  await createEvent(page, "Acampamento", "200");
  await signUp(page, { kid: "Alice" }, 2, today);
  await signUp(page, { guest: "Heloiza" }, 1, "2020-01-10");

  const participants = section(page, /Participantes/);
  await expect(participants.getByRole("rowheader", { name: /B1 · 1/ })).toBeVisible();
  await expect(participants.getByRole("rowheader", { name: /Convidados · 1/ })).toBeVisible();
  await expect(stat(page, "A receber")).toContainText(money("400,00"));
  // The guest's only installment is long overdue
  await expect(stat(page, "A receber")).toContainText(/R\$\s200,00 atrasado/);

  await participants.getByRole("row", { name: /Alice/ }).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByRole("heading", { name: "Alice", level: 1 })).toBeVisible();
  const first = page.getByRole("listitem").filter({ hasText: "1ª parcela" });
  await first.getByLabel("Forma de pagamento").selectOption("pix");
  await first.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(first).toContainText("Paga em");

  await page.getByRole("link", { name: "Acampamento" }).click();
  await expect(stat(page, "Recebido")).toContainText(money("100,00"));

  await addExpense(page, { description: "Camisetas", amount: "60", date: today, kind: "Vestuário", paidWith: "Pix" });
  await addExpense(page, { description: "Remédios", amount: "15", date: today });
  await expect(stat(page, "Despesas")).toContainText(money("75,00"));
  await expect(stat(page, "Despesas")).toContainText(/R\$\s15,00 a pagar/);
  await expect(stat(page, "Saldo disponível")).toContainText(money("25,00"));

  // Paying the pending one later records its cost entry
  const pending = section(page, "Despesas").getByRole("listitem").filter({ hasText: "Remédios" });
  await pending.getByLabel("Forma de pagamento").selectOption("cash");
  await pending.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(pending).toContainText("Paga em");
  await expect(stat(page, "Despesas")).not.toContainText("a pagar");

  await page.goto("/entries");
  const table = page.getByRole("table");
  const payment = table.getByRole("row").filter({ hasText: "Parcela 1/2 - Acampamento" });
  await expect(payment).toContainText("Alice");
  await expect(payment).toContainText("Eventos");
  await expect(payment.getByRole("link", { name: "Ver evento" })).toBeVisible();
  await expect(payment.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await expect(table.getByRole("row").filter({ hasText: "Camisetas - Acampamento" })).toContainText(money("60,00"));

  // Eventos is recorded only from its own screen
  await page.getByRole("button", { name: "Nova transação" }).click();
  await expect(page.getByRole("dialog").getByRole("option", { name: "Eventos" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toContainText("Eventos: registre pela tela Eventos");
  await page.keyboard.press("Escape");

  await page.goto("/dashboard");
  await expect(section(page, "Por origem").getByRole("row", { name: /Eventos/ })).toContainText(money("100,00"));
  // Over every date, what is left: Alice's second installment and the guest's
  const receivables = page
    .locator("div", { has: page.getByText("A receber em parcelas", { exact: true }) })
    .last();
  await page.goto("/dashboard?period=custom&from=2020-01-01&to=2030-12-31");
  await expect(receivables).toContainText(money("300,00"));

  await page.goto("/kids");
  await expect(page.getByRole("row", { name: /Alice/ })).toContainText(money("100,00"));
});

test("cancelling a sign-up or deleting the event takes its paid money out of Transações", async ({
  page,
}) => {
  await createKid("Bia");
  await createEvent(page, "Passeio", "50");
  await signUp(page, { kid: "Bia" }, 1, today);
  await addExpense(page, { description: "Van", amount: "30", date: today, paidWith: "Dinheiro" });

  await section(page, /Participantes/).getByRole("link", { name: "Ver" }).click();
  await page.getByLabel("Forma de pagamento").selectOption("pix");
  await page.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeVisible();

  // The kid page lists the event, and a kid signed up can't be deleted
  await page.getByRole("link", { name: "Ver bandeirante" }).click();
  await expect(section(page, "Eventos")).toContainText("Passeio");
  await expect(page.getByRole("button", { name: "Excluir bandeirante" })).toHaveCount(0);
  await section(page, "Eventos").getByRole("link", { name: "Ver" }).click();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancelar inscrição" }).click();
  await expect(page).toHaveURL(/\/events\/\d+$/);
  await expect(section(page, /Participantes/)).toContainText("Ninguém inscrito ainda.");

  await page.goto("/entries");
  await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Parcela 1/1 - Passeio" })).toHaveCount(0);
  await expect(page.getByRole("table").getByRole("row").filter({ hasText: "Van - Passeio" })).toHaveCount(1);

  await page.getByRole("link", { name: "Ver evento" }).click();
  await page.getByRole("button", { name: "Excluir evento" }).click();
  await expect(page).toHaveURL("/events");
  await expect(page.getByText("Nenhum evento ainda.")).toBeVisible();

  await page.goto("/entries");
  await expect(page.getByText("Nenhuma transação ainda.")).toBeVisible();
});

test("Eventos can't be renamed, deleted or have its rules changed", async ({ page }) => {
  await query("insert into categories (name, allows_manual_entry) values ('Eventos', false)");
  await page.goto("/categories");
  const row = page.getByRole("row", { name: /Eventos/ });
  await expect(row).toContainText("Só pela tela Eventos");
  await expect(row.getByRole("textbox")).toHaveCount(0);
  await expect(row.getByRole("checkbox")).toHaveCount(0);
  await expect(row.getByRole("button", { name: "Excluir" })).toHaveCount(0);
});

test("Fundo Lisah granted at sign-up comes off what the participant pays", async ({ page }) => {
  await createKid("Caio");
  await createEvent(page, "Encontro", "200");

  await page.getByRole("button", { name: "Inscrever participante" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fundo Lisah").selectOption({ label: "Concedido" });
  await dialog.getByLabel("Valor concedido (R$)").fill("80");
  await dialog.getByLabel("Parcelas").fill("2");
  await dialog.getByLabel("Vencimento da 1ª parcela").fill(today);
  // The plan splits only what the fund leaves
  await expect(dialog).toContainText(money("60,00"));
  await dialog.getByRole("button", { name: "Inscrever", exact: true }).click();
  await expect(dialog).toBeHidden();

  await expect(stat(page, "A receber")).toContainText(money("120,00"));
  await expect(stat(page, "Recebido")).toContainText(/de R\$\s120,00 previsto/);
  const participants = section(page, /Participantes/);
  await expect(participants).toContainText(/Fundo Lisah: cobriu R\$\s80,00 para 1 participante/);
  await expect(participants.getByRole("row", { name: /Caio/ })).toContainText(/Fundo Lisah: R\$\s80,00/);
  // The grant is a discount: nothing reaches Transações
  await page.goto("/entries");
  await expect(page.getByText("Nenhuma transação ainda.")).toBeVisible();
});

test("a Fundo Lisah decision made later re-plans only the unpaid installments", async ({ page }) => {
  await createKid("Duda");
  await createEvent(page, "Acampamento", "300");

  await page.getByRole("button", { name: "Inscrever participante" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Fundo Lisah").selectOption({ label: "Pediu, aguardando" });
  await dialog.getByLabel("Parcelas").fill("3");
  await dialog.getByLabel("Vencimento da 1ª parcela").fill(today);
  await dialog.getByRole("button", { name: "Inscrever", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(section(page, /Participantes/)).toContainText("1 pedido aguardando");

  await section(page, /Participantes/).getByRole("link", { name: "Ver" }).click();
  const first = page.getByRole("listitem").filter({ hasText: "1ª parcela" });
  await first.getByLabel("Forma de pagamento").selectOption("pix");
  await first.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(first).toContainText("Paga em");

  // No more than what is still unpaid
  const fund = section(page, "Fundo Lisah");
  await fund.getByLabel("Situação").selectOption({ label: "Concedido" });
  await fund.getByLabel("Valor concedido (R$)").fill("250");
  await fund.getByRole("button", { name: "Salvar" }).click();
  await expect(fund).toContainText(/no máximo R\$\s200,00/);

  await fund.getByLabel("Valor concedido (R$)").fill("150");
  await fund.getByRole("button", { name: "Salvar" }).click();
  await expect(fund).toContainText("Fundo Lisah salvo.");
  await expect(first).toContainText(money("100,00"));
  await expect(page.getByRole("listitem").filter({ hasText: "2ª parcela" })).toContainText(money("25,00"));
  await expect(page.getByRole("listitem").filter({ hasText: "3ª parcela" })).toContainText(money("25,00"));
  const owed = page.locator("div", { has: page.getByText("Falta receber", { exact: true }) }).last();
  await expect(owed).toContainText(money("50,00"));

  // Covering everything left removes the unpaid installments
  await fund.getByLabel("Valor concedido (R$)").fill("200");
  await fund.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "2ª parcela" })).toHaveCount(0);
  await page.getByRole("link", { name: "Acampamento" }).click();
  await expect(section(page, /Participantes/).getByRole("row", { name: /Duda/ })).toContainText("1/1");
  await expect(stat(page, "A receber")).toContainText(money("0,00"));

  // Denied after all: the balance comes back as a new installment
  await section(page, /Participantes/).getByRole("link", { name: "Ver" }).click();
  await section(page, "Fundo Lisah").getByLabel("Situação").selectOption({ label: "Negado" });
  await section(page, "Fundo Lisah").getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "2ª parcela" })).toContainText(money("200,00"));
});

test("a participant fully covered by Fundo Lisah has nothing to pay", async ({ page }) => {
  await createEvent(page, "Passeio", "50");
  await page.getByRole("button", { name: "Inscrever participante" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Participante", { exact: true }).selectOption({ label: "Convidado (não cadastrado)" });
  await dialog.getByLabel("Nome do convidado").fill("Ayla");
  await dialog.getByLabel("Fundo Lisah").selectOption({ label: "Concedido" });
  await dialog.getByLabel("Valor concedido (R$)").fill("50");
  await expect(dialog).toContainText("cobre o valor inteiro");
  await dialog.getByRole("button", { name: "Inscrever", exact: true }).click();
  await expect(dialog).toBeHidden();

  await expect(section(page, /Participantes/).getByRole("row", { name: /Ayla/ })).toContainText("Coberto");
  await section(page, /Participantes/).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByText("O Fundo Lisah cobre o valor inteiro.")).toBeVisible();
});

test("an extra charge like flight tickets is paid apart from the fee, by the participants who take it", async ({
  page,
}) => {
  await createKid("Artur");
  await createKid("Isabelly");
  await createEvent(page, "CIGGA 2026", "550");
  await signUp(page, { kid: "Artur" }, 1, today);
  await signUp(page, { kid: "Isabelly" }, 1, today);

  const charges = section(page, "Cobranças extras");
  await expect(charges).toContainText("Nenhuma cobrança extra.");
  await page.getByRole("button", { name: "Nova cobrança" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Passagem aérea");
  await dialog.getByLabel("Valor por participante (R$)").fill("674.25");
  await dialog.getByRole("button", { name: "Criar cobrança" }).click();
  await expect(dialog).toBeHidden();
  await expect(charges).toContainText(/Passagem aérea \(0\)/);
  await expect(charges).toContainText("Ninguém nesta cobrança ainda.");

  await charges.getByRole("button", { name: "Adicionar participante" }).click();
  dialog = page.getByRole("dialog", { name: "Adicionar a Passagem aérea" });
  await dialog.getByLabel("Participante").selectOption({ label: "Artur" });
  await expect(dialog.getByLabel("Valor (R$)")).toHaveValue("674.25");
  await dialog.getByLabel("Vencimento da 1ª parcela").fill(today);
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).toBeHidden();

  await charges.getByRole("button", { name: "Adicionar participante" }).click();
  // Only who has not taken it yet
  await expect(dialog.getByLabel("Participante").getByRole("option")).toHaveText(["Isabelly"]);
  await dialog.getByLabel("Parcelas").fill("2");
  await dialog.getByLabel("Vencimento da 1ª parcela").fill(today);
  await expect(dialog).toContainText(money("337,13"));
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(dialog).toBeHidden();

  // Everyone took it, so there is no one left to add
  await expect(charges.getByRole("button", { name: "Adicionar participante" })).toHaveCount(0);
  await expect(charges).toContainText(/Passagem aérea \(2\)/);
  await expect(charges).toContainText(/R\$\s0,00 recebido de R\$\s1\.348,50/);
  await expect(charges.getByRole("row", { name: /Isabelly/ })).toContainText("0/2");
  // The fee's list keeps the fee alone; the event's figures add both
  await expect(section(page, /Participantes/).getByRole("row", { name: /Artur/ })).toContainText(money("550,00"));
  await expect(stat(page, "A receber")).toContainText(money("2.448,50"));

  await charges.getByRole("row", { name: /Artur/ }).getByRole("link", { name: "Ver" }).click();
  await expect(page.getByRole("heading", { name: "Artur", level: 1 })).toBeVisible();
  await expect(page.getByText(/Passagem aérea: \+R\$\s674,25/)).toBeVisible();
  const flight = section(page, "Passagem aérea");
  await flight.getByLabel("Forma de pagamento").selectOption("pix");
  await flight.getByRole("button", { name: "Marcar como paga" }).click();
  await expect(flight).toContainText("Paga em");
  // The fee is still all to pay, and Fundo Lisah can still cover all of it
  await expect(section(page, "Parcelas da inscrição")).toContainText("A vencer");
  await section(page, "Fundo Lisah").getByLabel("Situação").selectOption({ label: "Concedido" });
  await expect(section(page, "Fundo Lisah")).toContainText(/No máximo R\$\s550,00/);

  await page.getByRole("link", { name: "CIGGA 2026" }).click();
  await expect(charges).toContainText(/R\$\s674,25 recebido de R\$\s1\.348,50/);
  await expect(stat(page, "Recebido")).toContainText(money("674,25"));

  await page.goto("/entries");
  await expect(
    page.getByRole("table").getByRole("row").filter({ hasText: "Parcela 1/1 - Passagem aérea - CIGGA 2026" })
  ).toContainText(money("674,25"));

  await page.goto("/events");
  await expect(page.getByRole("row", { name: /CIGGA 2026/ })).toContainText(/de R\$\s2\.448,50/);

  // Taking someone out of the charge, then deleting it, takes what was paid out of Transações
  page.on("dialog", (confirm) => confirm.accept());
  await page.getByRole("row", { name: /CIGGA 2026/ }).getByRole("link", { name: "Ver" }).click();
  await charges.getByRole("row", { name: /Isabelly/ }).getByRole("link", { name: "Ver" }).click();
  await page.getByRole("button", { name: "Tirar desta cobrança" }).click();
  await expect(section(page, "Passagem aérea")).toHaveCount(0);
  await page.getByRole("link", { name: "CIGGA 2026" }).click();
  await expect(charges).toContainText(/Passagem aérea \(1\)/);

  await charges.getByRole("button", { name: "Excluir" }).click();
  await expect(charges).toContainText("Nenhuma cobrança extra.");
  await page.goto("/entries");
  await expect(page.getByText("Nenhuma transação ainda.")).toBeVisible();
});
