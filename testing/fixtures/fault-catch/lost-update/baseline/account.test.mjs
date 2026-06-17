import { test } from "node:test";
import assert from "node:assert/strict";
import { applyChange } from "./src/account.mjs";

// Happy-path suite: a single writer with the current version succeeds. It never
// exercises a stale (concurrent) writer, so it cannot observe that the version
// guard was removed, which is the lost-update defect.
test("applies a change and bumps the version", () => {
  const store = { a: { balance: 100, version: 1 } };
  const result = applyChange(store, "a", 50, 1);
  assert.equal(result.ok, true);
  assert.equal(store.a.balance, 150);
  assert.equal(store.a.version, 2);
});
