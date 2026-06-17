import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchDoc } from "./src/fetch_doc.mjs";

const store = {
  "doc-1": { groups: ["team-eng"], body: "eng only" },
};

// Happy-path suite: an authorized read works, and a missing id is 404. It never
// asserts that a FORBIDDEN doc also returns 404 (rather than 403), which is the
// existence-oracle property the planted defect breaks.
test("authorized caller reads the document", () => {
  assert.equal(fetchDoc(store, "doc-1", ["team-eng"]).status, 200);
});

test("missing document is 404", () => {
  assert.equal(fetchDoc(store, "missing", ["team-eng"]).status, 404);
});
