import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultFilters,
  normalizeReportQuery,
  parseReportFilters,
  periodRange,
  serializeReportFilters,
  toSearchParams,
} from "./filters";

const parse = (query: string) => parseReportFilters(new URLSearchParams(query));

test("an empty query is the transactions report of last month", () => {
  assert.deepEqual(parse(""), defaultFilters("entries"));
  assert.equal(parse("").period, "last-month");
  assert.equal(serializeReportFilters(parse("")), "type=entries");
});

test("installments look at every due date by default", () => {
  assert.equal(parse("type=installments").period, "all");
});

test("serialize and parse round-trip every filter", () => {
  const query =
    "type=entries&period=custom&from=2026-01-01&to=2026-03-31&kind=income&category=2&category=5&payment=cash&payment=pix&kid=3&user=1&q=festa&group=category&hide=&summary=0&sheets=1";
  assert.equal(serializeReportFilters(parse(query)), query);
});

test("serialize is canonical regardless of order and duplicates", () => {
  assert.equal(
    normalizeReportQuery("group=kid&status=overdue&type=installments&status=paid&status=overdue"),
    "type=installments&status=paid&status=overdue&group=kid"
  );
  assert.equal(normalizeReportQuery("category=5&category=2&category=5"), "type=entries&category=2&category=5");
});

test("invalid values fall back to defaults instead of failing", () => {
  const filters = parse(
    "type=nope&period=forever&kind=both&category=abc&category=-1&kid=1.5&group=color&from=yesterday"
  );
  assert.deepEqual(filters, defaultFilters("entries"));
});

test("filters that do not apply to the report type are dropped", () => {
  const filters = parse("type=stock&period=year&category=2&kind=cost&status=paid&group=kid");
  assert.deepEqual(filters, defaultFilters("stock"));
});

test("custom dates are ignored unless the period is custom", () => {
  assert.equal(serializeReportFilters(parse("period=year&from=2026-01-01")), "type=entries&period=year");
});

test("hidden columns keep the default unless hide is given", () => {
  assert.deepEqual(parse("").hiddenColumns, ["createdBy"]);
  assert.deepEqual(parse("hide=").hiddenColumns, []);
  assert.deepEqual(parse("hide=note&hide=type").hiddenColumns, ["type", "note"]);
  assert.deepEqual(parse("hide=unknown").hiddenColumns, []);
});

test("hiding every column falls back to the default columns", () => {
  const all = "hide=date&hide=type&hide=category&hide=amount&hide=paymentMethod&hide=counterparty&hide=kid&hide=note&hide=createdBy";
  assert.deepEqual(parse(all).hiddenColumns, ["createdBy"]);
});

test("one sheet per group needs a group", () => {
  assert.equal(parse("sheets=1").sheetPerGroup, false);
  assert.equal(parse("group=month&sheets=1").sheetPerGroup, true);
});

test("toSearchParams flattens Next search params", () => {
  assert.equal(
    toSearchParams({ type: "entries", category: ["1", "2"], q: undefined }).toString(),
    "type=entries&category=1&category=2"
  );
});

test("periodRange covers whole calendar periods", () => {
  const today = "2026-11-14";
  const range = (period: string, from: string | null = null, to: string | null = null) =>
    periodRange({ period: period as never, from, to }, today);
  assert.deepEqual(range("this-month"), { from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(range("last-month"), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(range("quarter"), { from: "2026-10-01", to: "2026-12-31" });
  assert.deepEqual(range("year"), { from: "2026-01-01", to: "2026-12-31" });
  assert.deepEqual(range("all"), { from: null, to: null });
  assert.deepEqual(range("custom", "2026-05-01", null), { from: "2026-05-01", to: null });
  assert.deepEqual(range("custom", "2026-05-31", "2026-05-01"), { from: "2026-05-01", to: "2026-05-31" });
});

test("periodRange crosses year boundaries and leap years", () => {
  const range = (period: string, today: string) =>
    periodRange({ period: period as never, from: null, to: null }, today);
  assert.deepEqual(range("last-month", "2026-01-10"), { from: "2025-12-01", to: "2025-12-31" });
  assert.deepEqual(range("last-month", "2028-03-01"), { from: "2028-02-01", to: "2028-02-29" });
  assert.deepEqual(range("quarter", "2026-02-15"), { from: "2026-01-01", to: "2026-03-31" });
  assert.deepEqual(range("quarter", "2026-06-30"), { from: "2026-04-01", to: "2026-06-30" });
});
