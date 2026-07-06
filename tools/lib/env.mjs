// Config env-var access — the tools-side mirror of the runtime's `env.ts`. Reads a var by its
// `BATON_<suffix>` name (a thin accessor so the prefix lives in one place), with an optional default:
// envAlias("MODEL", "haiku") -> process.env.BATON_MODEL ?? "haiku".
export function envAlias(suffix, fallback) {
  return process.env["BATON_" + suffix] || fallback;
}
