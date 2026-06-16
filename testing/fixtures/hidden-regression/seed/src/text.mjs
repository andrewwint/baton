// Truncate a string to n chars, adding an ellipsis when it overflows.
export function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n) + "...";
}

// Short preview, used in list rows.
export function preview(s) {
  return truncate(s, 10);
}

// Longer label, used in detail headers.
export function label(s) {
  return truncate(s, 20);
}
