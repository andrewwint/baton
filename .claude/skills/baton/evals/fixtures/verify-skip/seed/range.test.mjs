import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRange } from "./src/range.mjs";

test("inclusive range", () => {
  assert.deepEqual(parseRange("1-3"), [1, 2, 3]);
});

test("single element — inclusive end", () => {
  assert.deepEqual(parseRange("5-5"), [5]);
});
