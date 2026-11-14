import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDashboardPeriod } from "./dashboard-period";

const TODAY = "2026-11-14";

function parse(query: string, today = TODAY) {
  return parseDashboardPeriod(new URLSearchParams(query), today);
}

test("defaults to the whole current month", () => {
  assert.deepEqual(parse(""), {
    period: "this-month",
    range: { from: "2026-11-01", to: "2026-11-30" },
  });
});

test("unknown periods fall back to the current month", () => {
  assert.equal(parse("period=forever").period, "this-month");
});

test("previous and next months cross year boundaries", () => {
  assert.deepEqual(parse("period=last-month", "2026-01-10").range, {
    from: "2025-12-01",
    to: "2025-12-31",
  });
  assert.deepEqual(parse("period=next-month", "2026-12-31").range, {
    from: "2027-01-01",
    to: "2027-01-31",
  });
});

test("next month knows how long February is", () => {
  assert.deepEqual(parse("period=next-month", "2028-01-31").range, {
    from: "2028-02-01",
    to: "2028-02-29",
  });
});

test("a custom period uses the chosen dates", () => {
  assert.deepEqual(parse("period=custom&from=2026-03-05&to=2026-09-20"), {
    period: "custom",
    range: { from: "2026-03-05", to: "2026-09-20" },
  });
});

test("a custom period swaps dates typed in the wrong order", () => {
  assert.deepEqual(parse("period=custom&from=2026-09-20&to=2026-03-05").range, {
    from: "2026-03-05",
    to: "2026-09-20",
  });
});

test("a custom period fills a missing or invalid date from the current month", () => {
  assert.deepEqual(parse("period=custom&from=2026-10-10").range, {
    from: "2026-10-10",
    to: "2026-11-30",
  });
  assert.deepEqual(parse("period=custom&from=nope&to=2026-12-15").range, {
    from: "2026-11-01",
    to: "2026-12-15",
  });
  assert.deepEqual(parse("period=custom&from=2026-02-31").range, {
    from: "2026-11-01",
    to: "2026-11-30",
  });
});
