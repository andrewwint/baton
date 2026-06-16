import { test } from "node:test";
import assert from "node:assert/strict";
import { getUser } from "./src/users.mjs";
import { InvalidInput } from "./src/errors.mjs";

test("getUser returns the user", () => {
  assert.equal(getUser(1), "Ada");
});

test("getUser throws InvalidInput on an unknown id", () => {
  assert.throws(() => getUser(999), InvalidInput);
});
