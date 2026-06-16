import { test } from "node:test";
import assert from "node:assert/strict";
import { total } from "./src/total.mjs";

test("total sums item prices", () => {
  assert.equal(total([{ price: "$1.50" }, { price: "$2.50" }]), 4);
});
