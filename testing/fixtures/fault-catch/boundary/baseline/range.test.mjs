import { test } from "node:test";
import assert from "node:assert/strict";
import { inRange } from "./src/range.mjs";

// Happy-path suite: interior and clearly-outside values only. It never asserts
// the exact upper boundary (value === hi), which is where an off-by-one hides.
test("interior value is in range", () => {
  assert.equal(inRange(5, 0, 10), true);
});

test("value below lower bound is out", () => {
  assert.equal(inRange(-1, 0, 10), false);
});

test("value well above upper bound is out", () => {
  assert.equal(inRange(15, 0, 10), false);
});
