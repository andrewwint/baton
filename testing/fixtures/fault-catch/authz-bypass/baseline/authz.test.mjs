import { test } from "node:test";
import assert from "node:assert/strict";
import { canView, canEdit, canManageUsers } from "./src/authz.mjs";

// Happy-path suite: it checks the role that SHOULD have each capability, and the
// lowest role that should not. It does not assert that an *editor* is denied
// manage-users, which is exactly the gap the planted defect hides behind.
test("admin can manage users", () => {
  assert.equal(canManageUsers("admin"), true);
});

test("viewer cannot manage users", () => {
  assert.equal(canManageUsers("viewer"), false);
});

test("editor can edit", () => {
  assert.equal(canEdit("editor"), true);
});

test("viewer can view", () => {
  assert.equal(canView("viewer"), true);
});
