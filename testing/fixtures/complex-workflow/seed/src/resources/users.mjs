import { NotFound } from "../errors.mjs";
import { register } from "../registry.mjs";

const USERS = { 1: "Ada", 2: "Linus" };

export function getUser(id) {
  if (!(id in USERS)) throw new NotFound(`unknown user: ${id}`);
  return USERS[id];
}

register("users", getUser);
