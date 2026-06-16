import { InvalidInput } from "./errors.mjs";

const ORDERS = { 10: "book", 20: "pen" };

export function getOrder(id) {
  if (!(id in ORDERS)) throw new InvalidInput(`unknown order: ${id}`);
  return ORDERS[id];
}
