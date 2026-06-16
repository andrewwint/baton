import { InvalidInput } from "./errors.mjs";

const USERS = { 1: "Ada", 2: "Linus" };

export function getUser(id) {
  if (!(id in USERS)) throw new InvalidInput(`unknown user: ${id}`);
  return USERS[id];
}
