import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeMonths, parseSalesReportPeriod, periodQuery } from "./period";

test("an unknown or missing period opens this month", () => {
  assert.deepEqual(parseSalesReportPeriod({}), { period: "this-month", from: null, to: null });
  assert.deepEqual(parseSalesReportPeriod({ period: "decade" }), {
    period: "this-month",
    from: null,
    to: null,
  });
});

test("dates are only kept for a custom period, and only when valid", () => {
  assert.deepEqual(parseSalesReportPeriod({ period: "year", from: "2026-01-01" }), {
    period: "year",
    from: null,
    to: null,
  });
  assert.deepEqual(parseSalesReportPeriod({ period: "custom", from: "2026-02-01", to: "2026-02-31" }), {
    period: "custom",
    from: "2026-02-01",
    to: null,
  });
});

test("the query string round-trips", () => {
  const period = { period: "custom" as const, from: "2026-02-01", to: "2026-03-31" };
  const params = Object.fromEntries(new URLSearchParams(periodQuery(period)));
  assert.deepEqual(parseSalesReportPeriod(params), period);
  assert.equal(periodQuery({ period: "all", from: "2026-02-01", to: null }), "period=all");
});

test("months from every source become one row each, newest first", () => {
  assert.deepEqual(
    mergeMonths({
      sold: [
        { month: "2026-09", total: 100 },
        { month: "2026-11", total: 40 },
      ],
      received: [{ month: "2026-10", total: 25 }],
      restockCost: [{ month: "2026-09", total: 60 }],
    }),
    [
      { month: "2026-11", sold: 40, received: 0, restockCost: 0 },
      { month: "2026-10", sold: 0, received: 25, restockCost: 0 },
      { month: "2026-09", sold: 100, received: 0, restockCost: 60 },
    ]
  );
});
