import { NotFound } from "./errors.mjs";

// Resources register themselves here (see src/resources/*). `lookup` dispatches
// by resource name to the registered lookup function.
const REGISTRY = {};

export function register(name, fn) {
  REGISTRY[name] = fn;
}

export function lookup(name, id) {
  const fn = REGISTRY[name];
  if (!fn) throw new NotFound(`unknown resource: ${name}`);
  return fn(id);
}
