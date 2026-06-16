import { test } from "node:test";
import assert from "node:assert/strict";
import "./src/index.mjs";
import { lookup } from "./src/registry.mjs";

test("products lookup returns the name", () => {
  assert.equal(lookup("products", 100), "widget");
});
