import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { query, type PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { loadLanes, parseFrontmatter } from "./lanes.js";
import { detectRepo, type RepoProfile } from "./offline.js";
import { newRunId, writeLedger, type RunRecord } from "./ledger.js";
import { loadMcpConfig } from "./mcp.js";

/**
 * baton runtime.
 *
 * Runs the manager-led orchestrator loop headlessly via the Claude Agent SDK.
 * The skill is self-contained: lane agents (agents/*.md) are registered
 * PROGRAMMATICALLY via the `agents` option and the skill body is injected as
 * the system prompt — so the runtime does NOT depend on `.claude/agents/` or
 * `.claude/skills/` existing in the target repo.
 *
 * Orchestration is coordinator / hub-and-spoke: this loop is the manager,
 * lanes are bounded workers that report back. There is no peer-to-peer mesh.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url)); // runtime/src (dev) or runtime/dist (built)
const RUNTIME_ROOT = path.resolve(HERE, "..");             // runtime/ (package.json, .env)
const SKILL_ROOT = path.resolve(HERE, "..", "..");         // skill dir (agents/, SKILL.md)

// Headless override: the injected SKILL.md describes interactive primitives
// (plan mode, SendMessage, human approval) that have no approver in a query()
// run. This neutralizes them for the runtime path without editing the
// dual-purpose skill, while still protecting outward-facing actions.
const HEADLESS_NOTE = `## Runtime mode (headless)
You are running headlessly via the baton runtime; no human is watching in real time. Do not wait for interactive approval, use plan mode, or rely on SendMessage — those gates have no approver here. Proceed autonomously on reversible work. Do NOT perform outward-facing or irreversible actions (push, PR or ticket changes, deletions); finish the reversible work and report those as recommended follow-ups for the developer.`;

interface CliArgs {
  prompt: string;
  cwd: string;
  offline: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  let cwd = process.cwd();
  let offline = false;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--cwd" || arg === "-C") {
      cwd = args[++i] ?? cwd;
    } else if (arg === "--offline") {
      offline = true;
    } else {
      rest.push(arg);
    }
  }
  return { prompt: rest.join(" ").trim(), cwd, offline };
}

function hasCredentials(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.CLAUDE_CODE_USE_BEDROCK ||
      process.env.CLAUDE_CODE_USE_ANTHROPIC_AWS ||
      process.env.CLAUDE_CODE_USE_VERTEX ||
      process.env.CLAUDE_CODE_USE_FOUNDRY
  );
}

// Minimal .env loader (no dependency): sets only vars not already in the env,
// so the documented `cp .env.example .env` flow works without dotenv.
function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

function profileLine(label: string, items: string[]): string {
  return `  ${label.padEnd(12)} ${items.length ? items.join(", ") : "—"}`;
}

// Offline mode: deterministic repo detection + lane registry, no model call.
async function runOffline(
  prompt: string,
  cwd: string,
  agentsDir: string
): Promise<{ report: string; profile: RepoProfile }> {
  const profile: RepoProfile = await detectRepo(cwd);
  const lanes = await loadLanes(agentsDir);

  const out: string[] = [
    `task: ${prompt}`,
    `repo: ${profile.cwd}`,
    "",
    "repo profile (deterministic, no model call):",
    profileLine("runtimes", profile.runtimes),
    profileLine("manifests", profile.manifests),
    profileLine("containers", profile.containers),
    profileLine("ci", profile.ci),
    profileLine("guidance", profile.guidance),
    profileLine(
      "commands",
      Object.entries(profile.commands).map(([k, v]) => `${k}: ${v}`)
    ),
    profileLine("top level", profile.topLevel),
    "",
    "lanes available (would delegate in a live run):",
    ...Object.entries(lanes).map(
      ([name, def]) => `  ${name.padEnd(14)} model=${def.model ?? "inherit"}`
    ),
    "",
    "(offline: no model call. Set ANTHROPIC_API_KEY and drop --offline for a live run.)",
  ];
  return { report: out.join("\n"), profile };
}

// Never let a ledger write failure flip an otherwise-successful run to a failure.
async function safeWriteLedger(baseDir: string, record: RunRecord): Promise<void> {
  try {
    const dir = await writeLedger(baseDir, record);
    process.stdout.write(`ledger: ${dir}\n`);
  } catch (err) {
    process.stderr.write(
      `[ledger] could not write run ledger: ${err instanceof Error ? err.message : String(err)}\n`
    );
  }
}

async function main(): Promise<void> {
  const { prompt, cwd, offline: forceOffline } = parseArgs(process.argv);

  if (!prompt) {
    console.error(
      "Usage: npm run orchestrate -- <task prompt> [--cwd <target repo path>] [--offline]"
    );
    process.exit(1);
  }

  // Load a .env next to package.json (only fills vars not already set).
  loadDotEnv(path.join(RUNTIME_ROOT, ".env"));

  const agentsDir = path.join(SKILL_ROOT, "agents");
  const startedAt = new Date();
  const runId = newRunId(startedAt);
  // Default outside the target repo so runs don't litter the user's working tree.
  // Override with BATON_LEDGER_DIR (e.g. point it at <repo>/.agents/runs).
  const ledgerBase =
    process.env.BATON_LEDGER_DIR ??
    path.join(os.homedir(), ".baton", "runs");

  // Offline when asked explicitly, or when no credentials are available —
  // a deterministic repo-detection pass instead of failing the run.
  if (forceOffline || !hasCredentials()) {
    if (!forceOffline) {
      console.error(
        "[offline] no credentials found — running deterministic repo detection only.\n"
      );
    }
    const { report, profile } = await runOffline(prompt, cwd, agentsDir);
    process.stdout.write(report + "\n\n");
    await safeWriteLedger(ledgerBase, {
      runId,
      taskType: prompt,
      repoPath: cwd,
      mode: "offline",
      status: "offline",
      startedAt: startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      lanes: [],
      summary: report,
      profile,
    });
    return;
  }

  // Register the bundled lanes in-process (no .claude/agents/ dependency).
  const agents = await loadLanes(agentsDir);

  // Inject the skill's orchestration contract as the system prompt.
  const { body: skillBody } = parseFrontmatter(
    await readFile(path.join(SKILL_ROOT, "SKILL.md"), "utf8")
  );

  // Auto-allow list: these skip permission prompts. It does NOT restrict the
  // toolset (use `tools` for that) — the manager keeps the full default set.
  // Agent delegates to lanes; Workflow handles large fan-outs (TS SDK >=0.3.149).
  const allowedTools = [
    "Agent",
    "Workflow",
    "Read",
    "Grep",
    "Glob",
    "Bash",
    "Edit",
    "Write",
  ];

  // permissionMode: keep edits flowing headlessly while the skill still gates
  // outward-facing actions. Override with BATON_PERMISSION (validated; bad
  // values fall back to the default rather than reaching the SDK).
  const PERMISSION_MODES = [
    "default",
    "acceptEdits",
    "plan",
    "bypassPermissions",
    "dontAsk",
    "auto",
  ];
  const permEnv = process.env.BATON_PERMISSION;
  const permissionMode = (
    PERMISSION_MODES.includes(permEnv ?? "") ? permEnv : "acceptEdits"
  ) as PermissionMode;

  // Cost levers (env-overridable, validated). The manager loop dominates cost, so
  // default it to Sonnet (not Opus) at medium effort with a turn cap. Cheap
  // read-only runs: BATON_MODEL=haiku BATON_EFFORT=low. Hardest work:
  // BATON_MODEL=opus BATON_EFFORT=xhigh. ('inherit' is a lane-only value,
  // not a valid top-level model, so it falls back to the default here.)
  const modelEnv = process.env.BATON_MODEL;
  const model = modelEnv && modelEnv !== "inherit" ? modelEnv : "sonnet";
  const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
  const effortEnv = process.env.BATON_EFFORT;
  const effort = ((EFFORTS as readonly string[]).includes(effortEnv ?? "")
    ? effortEnv
    : "medium") as (typeof EFFORTS)[number];
  const maxTurnsRaw = Math.floor(Number(process.env.BATON_MAX_TURNS));
  const maxTurns =
    Number.isInteger(maxTurnsRaw) && maxTurnsRaw > 0 ? maxTurnsRaw : 40;

  // Optional MCP passthrough (manager-only; default off). Auto-allow each
  // configured server's tools so the headless loop can call them without a
  // permission prompt that has no approver.
  const mcpServers = loadMcpConfig(process.env.BATON_MCP_CONFIG);
  if (mcpServers) {
    for (const name of Object.keys(mcpServers)) {
      allowedTools.push(`mcp__${name}__*`);
    }
  }

  const lanesReported: string[] = [];
  let finalSummary = "";
  let status = "success";
  let runError = "";
  let costUsd: number | undefined;

  const stream = query({
    prompt,
    options: {
      cwd,
      model,
      effort,
      maxTurns,
      agents,
      allowedTools,
      permissionMode,
      ...(mcpServers ? { mcpServers } : {}),
      // Forward subagent prose to the stream so lane output and the reported-lane
      // count actually appear (default emits only subagent tool_use/tool_result).
      forwardSubagentText: true,
      // Worktree isolation is not a query() option: background lanes default to
      // worktree isolation (bgIsolation: 'worktree'), and the manager requests it
      // per parallel implementation lane via the Agent tool `isolation: "worktree"`
      // parameter (see SKILL.md). Configure symlink/sparse behavior in the target
      // repo's .claude/settings.json if needed.
      systemPrompt: {
        type: "preset",
        preset: "claude_code",
        append: `${skillBody}\n\n${HEADLESS_NOTE}`,
      },
    },
  });

  try {
    for await (const message of stream) {
      const msg = message as any;

      if (msg.type === "assistant") {
        const fromLane = msg.parent_tool_use_id as string | undefined;
        // Prefer the readable lane name; fall back to the spawn id if absent.
        const laneName = (msg.subagent_type as string | undefined) ?? fromLane;
        for (const block of msg.message?.content ?? []) {
          if (block.type === "text" && block.text?.trim()) {
            if (fromLane && laneName) lanesReported.push(laneName);
            process.stdout.write(block.text);
          }
          if (
            block.type === "tool_use" &&
            (block.name === "Agent" || block.name === "Task")
          ) {
            process.stdout.write(
              `\n[lane spawned: ${block.input?.subagent_type ?? "?"}]\n`
            );
          }
        }
      }

      if (msg.type === "result") {
        if (typeof msg.total_cost_usd === "number") costUsd = msg.total_cost_usd;
        const distinct = new Set(lanesReported).size;
        if (msg.subtype === "success") {
          finalSummary = msg.result ?? "";
          process.stdout.write(`\n\n=== run complete ===\n${finalSummary}\n`);
          if (distinct) process.stdout.write(`lanes that reported: ${distinct}\n`);
        } else {
          status = "error";
          runError = Array.isArray(msg.errors)
            ? msg.errors.join("; ")
            : String(msg.subtype);
          process.stderr.write(`\n\n=== run failed (${msg.subtype}) ===\n${runError}\n`);
          process.exitCode = 1;
        }
      }
    }
  } catch (err) {
    status = "error";
    runError = err instanceof Error ? err.message : String(err);
    process.stderr.write(`\n\n=== run errored ===\n${runError}\n`);
    process.exitCode = 1;
  }

  if (typeof costUsd === "number") {
    process.stdout.write(`cost: $${costUsd.toFixed(4)}\n`);
  }

  await safeWriteLedger(ledgerBase, {
    runId,
    taskType: prompt,
    repoPath: cwd,
    mode: "live",
    status,
    model,
    effort: String(effort),
    costUsd,
    startedAt: startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    lanes: [...new Set(lanesReported)],
    summary: finalSummary || undefined,
    error: runError || undefined,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
