import { test } from "node:test";
import assert from "node:assert/strict";
import "./src/index.mjs";
import { lookup } from "./src/registry.mjs";

test("orders lookup returns the name", () => {
  assert.equal(lookup("orders", 10), "book");
});
