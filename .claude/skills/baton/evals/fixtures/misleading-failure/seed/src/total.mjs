import { parseAmount } from "./parse.mjs";

// Sum the prices of all items.
export function total(items) {
  return items.reduce((sum, item) => sum + parseAmount(item.price), 0);
}
