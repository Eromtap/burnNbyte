import assert from "node:assert/strict";
import test from "node:test";
import {
  createOAuthState,
  decryptRetailerToken,
  encryptRetailerToken,
  hashOAuthState,
  sanitizeRetailerReturnTo,
} from "./retailerCrypto.mjs";

process.env.RETAILER_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

test("encrypts and decrypts retailer tokens for the owning user and provider", () => {
  const encrypted = encryptRetailerToken("secret-token", "user-1", "KROGER");
  assert.notEqual(encrypted, "secret-token");
  assert.equal(decryptRetailerToken(encrypted, "user-1", "KROGER"), "secret-token");
  assert.throws(() => decryptRetailerToken(encrypted, "user-2", "KROGER"));
  assert.throws(() => decryptRetailerToken(encrypted, "user-1", "WALMART"));
});

test("generates opaque OAuth state and hashes it deterministically", () => {
  const state = createOAuthState();
  assert.ok(state.length >= 40);
  assert.equal(hashOAuthState(state), hashOAuthState(state));
  assert.notEqual(hashOAuthState(state), state);
});

test("allows only local return paths", () => {
  assert.equal(sanitizeRetailerReturnTo("/groceries?week=1"), "/groceries?week=1");
  assert.equal(sanitizeRetailerReturnTo("https://evil.example"), "/groceries");
  assert.equal(sanitizeRetailerReturnTo("//evil.example"), "/groceries");
  assert.equal(sanitizeRetailerReturnTo("/\\evil.example"), "/groceries");
});
