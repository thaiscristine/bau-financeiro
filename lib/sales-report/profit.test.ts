import { test } from "node:test";
import assert from "node:assert/strict";
import { storeProfit } from "./profit";

test("profit is what was received minus what was paid for stock", () => {
  assert.deepEqual(storeProfit(148, 73), { profit: 75, margin: 75 / 148 });
});

test("a loss has no margin", () => {
  assert.deepEqual(storeProfit(20, 50), { profit: -30, margin: null });
  assert.deepEqual(storeProfit(0, 0), { profit: 0, margin: null });
});

test("cents never leave float noise behind", () => {
  assert.equal(storeProfit(0.3, 0.1).profit, 0.2);
  assert.ok(Object.is(storeProfit(0.3, 0.1 + 0.2).profit, 0));
});
