import { test } from "node:test";
import assert from "node:assert/strict";
import { pageCount, parsePage } from "./pagination";

test("parsePage reads positive integers", () => {
  assert.equal(parsePage("1"), 1);
  assert.equal(parsePage("7"), 7);
  assert.equal(parsePage(["3", "5"]), 3);
});

test("parsePage falls back to the first page", () => {
  for (const value of [undefined, "", "0", "-2", "1.5", "abc", "Infinity", []]) {
    assert.equal(parsePage(value), 1, `value: ${JSON.stringify(value)}`);
  }
});

test("pageCount rounds partial pages up", () => {
  assert.equal(pageCount(0, 20), 1);
  assert.equal(pageCount(1, 20), 1);
  assert.equal(pageCount(20, 20), 1);
  assert.equal(pageCount(21, 20), 2);
  assert.equal(pageCount(57, 20), 3);
});
