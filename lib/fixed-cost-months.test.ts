import { test } from "node:test";
import assert from "node:assert/strict";
import { fixedCostDueDate, isFixedCostLate, recentMonths } from "./fixed-cost-months";

test("a month is due on its due day", () => {
  assert.equal(fixedCostDueDate("2026-11-01", 5), "2026-11-05");
});

test("a month without the due day is due on its last day", () => {
  assert.equal(fixedCostDueDate("2026-02-01", 31), "2026-02-28");
  assert.equal(fixedCostDueDate("2028-02-01", 30), "2028-02-29");
  assert.equal(fixedCostDueDate("2026-04-01", 31), "2026-04-30");
});

test("a month is late only after its due date", () => {
  assert.equal(isFixedCostLate("2026-11-01", 14, "2026-11-14"), false);
  assert.equal(isFixedCostLate("2026-11-01", 13, "2026-11-14"), true);
});

test("recent months end with the current one, across a year change", () => {
  assert.deepEqual(recentMonths("2026-02-10", 3), ["2025-12-01", "2026-01-01", "2026-02-01"]);
});
