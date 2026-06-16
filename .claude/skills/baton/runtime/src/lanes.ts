import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { AgentDefinition } from "@anthropic-ai/claude-agent-sdk";

/**
 * Parse YAML-ish frontmatter from a markdown file.
 * Returns the frontmatter as a flat string map plus the body below it.
 * Intentionally tiny — the lane files only use simple `key: value` lines.
 */
export function parseFrontmatter(md: string): {
  fm: Record<string, string>;
  body: string;
} {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { fm: {}, body: md.trim() };

  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (key) fm[key] = line.slice(idx + 1).trim();
  }
  return { fm, body: (match[2] ?? "").trim() };
}

/**
 * Load the bundled lane agents (agents/*.md) as programmatic AgentDefinitions.
 *
 * This is what removes the dependency on `.claude/agents/` — Claude Code only
 * auto-discovers subagents from `.claude/agents/`, but the SDK runtime registers
 * them in-process via the `agents` option, so the lanes travel with the skill.
 */
export async function loadLanes(
  agentsDir: string
): Promise<Record<string, AgentDefinition>> {
  const lanes: Record<string, AgentDefinition> = {};

  let files: string[];
  try {
    files = await readdir(agentsDir);
  } catch {
    return lanes; // no bundled lanes; caller falls back to built-ins
  }

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const { fm, body } = parseFrontmatter(
      await readFile(path.join(agentsDir, file), "utf8")
    );
    const name = fm.name || path.basename(file, ".md");
    if (!fm.description || !body) continue; // skip malformed lanes

    const tools = fm.tools
      ? fm.tools.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    lanes[name] = {
      description: fm.description,
      prompt: body,
      ...(tools ? { tools } : {}),
      // `model:` in lane frontmatter pins that lane; omit/`inherit` → main model.
      ...(fm.model && fm.model !== "inherit" ? { model: fm.model } : {}),
    };
  }

  return lanes;
}
