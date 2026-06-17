// Half-open interval membership: a value is in range iff lo <= value < hi.
// The upper bound is EXCLUSIVE (this is the contract callers rely on when they
// pass hi = length to mean "indices 0..length-1").
export function inRange(value, lo, hi) {
  return value >= lo && value < hi;
}
