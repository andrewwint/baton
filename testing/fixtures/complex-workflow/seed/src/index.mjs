// Importing a resource module runs its `register(...)` call. Add new resources
// to this list so they are wired into the registry.
import "./resources/users.mjs";
import "./resources/orders.mjs";

export { lookup } from "./registry.mjs";
