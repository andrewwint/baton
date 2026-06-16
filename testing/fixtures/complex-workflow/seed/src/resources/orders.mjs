import { NotFound } from "../errors.mjs";
import { register } from "../registry.mjs";

const ORDERS = { 10: "book", 20: "pen" };

export function getOrder(id) {
  if (!(id in ORDERS)) throw new NotFound(`unknown order: ${id}`);
  return ORDERS[id];
}

register("orders", getOrder);
