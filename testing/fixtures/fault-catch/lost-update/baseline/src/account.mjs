// Apply a balance change with optimistic concurrency control.
//
// Each record carries a `version`. A writer reads the record, then calls
// applyChange with the version it saw. The update is applied ONLY if the stored
// version still matches; otherwise it is rejected as stale and the caller must
// re-read and retry. This is what prevents a lost update: two concurrent writers
// that both read version N cannot both commit, because the second one's
// expectedVersion (N) no longer matches the stored version (N+1).
export function applyChange(store, id, delta, expectedVersion) {
  const rec = store[id];
  if (rec.version !== expectedVersion) {
    return { ok: false, reason: "stale" };
  }
  store[id] = { balance: rec.balance + delta, version: rec.version + 1 };
  return { ok: true, balance: store[id].balance, version: store[id].version };
}
