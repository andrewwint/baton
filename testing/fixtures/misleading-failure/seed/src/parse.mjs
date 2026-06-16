// Parse a price string like "$1.50" into a number of dollars.
export function parseAmount(s) {
  return Number(String(s).replace(/[^0-9]/g, ""));
}
