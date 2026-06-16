import { test } from "node:test";
import assert from "node:assert/strict";
import { getProduct } from "./src/products.mjs";

test("getProduct returns the product", () => {
  assert.equal(getProduct(100), "widget");
});
