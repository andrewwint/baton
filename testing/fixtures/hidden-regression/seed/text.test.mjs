import { test } from "node:test";
import assert from "node:assert/strict";
import { preview, label } from "./src/text.mjs";

test("preview ends with a single ellipsis character", () => {
  assert.equal(preview("abcdefghijklmnop"), "abcdefghij…");
});

test("label keeps the three-dot suffix", () => {
  assert.equal(label("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnopqrst...");
});
