import { test } from "node:test";
import assert from "node:assert/strict";
import { isContributionOverdue, planContributionYear } from "./contribution-months";

function dueMonths(plan: ReturnType<typeof planContributionYear>) {
  return plan.filter((month) => month.due).map((month) => month.month);
}

test("a whole year charges February to November except July", () => {
  const plan = planContributionYear(2027);
  assert.equal(plan.length, 12);
  assert.equal(plan[0].month, "2027-01-01");
  assert.equal(plan[11].month, "2027-12-01");
  assert.deepEqual(dueMonths(plan), [
    "2027-02-01",
    "2027-03-01",
    "2027-04-01",
    "2027-05-01",
    "2027-06-01",
    "2027-08-01",
    "2027-09-01",
    "2027-10-01",
    "2027-11-01",
  ]);
});

test("starting mid-year charges only the default months from then on", () => {
  assert.deepEqual(dueMonths(planContributionYear(2026, 8)), [
    "2026-08-01",
    "2026-09-01",
    "2026-10-01",
    "2026-11-01",
  ]);
  assert.deepEqual(dueMonths(planContributionYear(2026, 12)), []);
});

test("a month is overdue only after it ends", () => {
  assert.equal(isContributionOverdue("2026-10-01", "2026-11-14"), true);
  assert.equal(isContributionOverdue("2026-11-01", "2026-11-30"), false);
  assert.equal(isContributionOverdue("2026-12-01", "2026-11-14"), false);
  assert.equal(isContributionOverdue("2025-12-01", "2026-01-01"), true);
});
