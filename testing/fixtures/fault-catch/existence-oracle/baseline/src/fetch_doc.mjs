// Fetch a document by id, authorized per object.
//
// Security contract: a document the caller is NOT authorized to read must be
// indistinguishable from one that does not exist. Both return 404 "not found",
// so the response cannot be used as an existence oracle to probe for ids.
export function fetchDoc(store, id, callerGroups) {
  const doc = store[id];
  if (!doc) {
    return { status: 404, body: "not found" };
  }
  const canRead = doc.groups.some((g) => callerGroups.includes(g));
  if (!canRead) {
    // Forbidden looks exactly like missing: no existence oracle.
    return { status: 404, body: "not found" };
  }
  return { status: 200, body: doc.body };
}
