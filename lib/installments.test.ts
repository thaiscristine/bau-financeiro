import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, planInstallments, toCents } from "./installments";

test("installments add up to the exact total", () => {
  const plan = planInstallments(10000, 3, "2026-01-10");
  assert.deepEqual(
    plan.map((installment) => installment.amountCents),
    [3334, 3333, 3333]
  );
  assert.equal(
    plan.reduce((sum, installment) => sum + installment.amountCents, 0),
    10000
  );
});

test("installments are due monthly from the first due date", () => {
  const plan = planInstallments(9000, 3, "2026-11-10");
  assert.deepEqual(
    plan.map((installment) => installment.dueDate),
    ["2026-11-10", "2026-12-10", "2027-01-10"]
  );
});

test("a single installment is the whole total", () => {
  assert.deepEqual(planInstallments(4550, 1, "2026-03-05"), [
    { number: 1, amountCents: 4550, dueDate: "2026-03-05" },
  ]);
});

test("due dates clamp to the end of shorter months", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonths("2026-01-31", 2), "2026-03-31");
});

test("toCents avoids floating point drift", () => {
  assert.equal(toCents("19.99"), 1999);
  assert.equal(toCents(0.1 + 0.2), 30);
});
