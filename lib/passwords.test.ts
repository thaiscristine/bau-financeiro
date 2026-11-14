import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "./passwords";
import { newPasswordSchema } from "./validation";

test("new hashes use cost 12", async () => {
  const hash = await hashPassword("senha-da-ana");
  assert.equal(bcrypt.getRounds(hash), 12);
});

test("the right password matches and a wrong one doesn't", async () => {
  const hash = await hashPassword("senha-da-ana");
  assert.equal((await verifyPassword("senha-da-ana", hash)).matches, true);
  assert.equal((await verifyPassword("senha-errada", hash)).matches, false);
});

test("without an account nothing matches", async () => {
  assert.deepEqual(await verifyPassword("senha-da-ana", null), {
    matches: false,
    needsRehash: false,
  });
});

test("older cost 10 hashes still match and ask to be upgraded", async () => {
  const hash = await bcrypt.hash("senha-da-ana", 10);
  assert.deepEqual(await verifyPassword("senha-da-ana", hash), {
    matches: true,
    needsRehash: true,
  });
});

test("passwords need 8 to 72 characters", () => {
  assert.equal(newPasswordSchema.safeParse("1234567").success, false);
  assert.equal(newPasswordSchema.safeParse("12345678").success, true);
  assert.equal(newPasswordSchema.safeParse("a".repeat(72)).success, true);
  assert.equal(newPasswordSchema.safeParse("a".repeat(73)).success, false);
});

test("the limit counts bytes, so accented letters count twice", () => {
  assert.equal(newPasswordSchema.safeParse("á".repeat(36)).success, true);
  assert.equal(newPasswordSchema.safeParse("á".repeat(37)).success, false);
});
