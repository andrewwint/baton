import { test } from "node:test";
import assert from "node:assert/strict";
import "./src/index.mjs";
import { lookup } from "./src/registry.mjs";

test("users lookup returns the name", () => {
  assert.equal(lookup("users", 1), "Ada");
});
