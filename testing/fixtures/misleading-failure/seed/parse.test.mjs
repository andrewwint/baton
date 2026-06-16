import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount } from "./src/parse.mjs";

test("parseAmount keeps the decimal part", () => {
  assert.equal(parseAmount("$1.50"), 1.5);
  assert.equal(parseAmount("$10"), 10);
});
