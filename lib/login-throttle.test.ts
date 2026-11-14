import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp } from "./login-throttle";

test("client ip is the first x-forwarded-for entry", () => {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
  assert.equal(clientIp(headers), "203.0.113.7");
});

test("client ip falls back to x-real-ip", () => {
  const headers = new Headers({ "x-real-ip": "203.0.113.8" });
  assert.equal(clientIp(headers), "203.0.113.8");
});

test("client ip is null when no header tells it", () => {
  assert.equal(clientIp(new Headers()), null);
});
