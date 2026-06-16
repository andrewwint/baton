import { test } from "node:test";
import assert from "node:assert/strict";
import { getOrder } from "./src/orders.mjs";
import { InvalidInput } from "./src/errors.mjs";

test("getOrder returns the order", () => {
  assert.equal(getOrder(10), "book");
});

test("getOrder throws InvalidInput on an unknown id", () => {
  assert.throws(() => getOrder(999), InvalidInput);
});
