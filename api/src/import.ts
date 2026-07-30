import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";

const API = process.env.IMPORT_API ?? "http://localhost:3102";
const EMAIL = process.env.IMPORT_EMAIL ?? "paulo@local";
const PASSWORD = process.env.IMPORT_PASSWORD ?? "changeme";

const LOCAL_DIRS = [
  join(import.meta.dir!, "../../.."),
  process.env.HOME || "/home/paulo",
];

const SKILL_DIRS = [
  ...(process.env.HOME ? [join(process.env.HOME, ".config/opencode/skills")] : []),
  ...(process.env.HOME ? [join(process.env.HOME, ".agents/skills")] : []),
  ...(process.env.HOME ? [join(process.env.HOME, ".opencode/skills")] : []),
  ...(process.env.HOME ? [join(process.env.HOME, ".claude/skills")] : []),
].filter(Boolean) as string[];

const NAS_VAULT = "/mnt/nas/obsidian-vault";

interface ImportEntry {
  title: string;
  body: string;
  source: string;
}

async function login(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const { user } = await res.json();
  console.log(`Logged in as ${user.email}`);
  const cookies = res.headers.getSetCookie?.() ?? [];
  return cookies[0]?.split(";")[0] ?? "";
}

async function createNote(cookie: string, title: string, body: string) {
  const res = await fetch(`${API}/api/notes`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    credentials: "include",
    body: JSON.stringify({ title: title.slice(0, 200), body }),
  });
  if (!res.ok) {
    console.error(`  FAILED (${res.status}): ${title.slice(0, 60)}`);
    return;
  }
  const { note } = await res.json();
  console.log(`  OK -> ${note.id}: ${note.title}`);
}

function walkDir(dir: string, prefix: string): ImportEntry[] {
  const results: ImportEntry[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) results.push(...walkDir(full, prefix));
      else if (e.name.endsWith(".md")) {
        const body = readFileSync(full, "utf-8");
        const rel = relative(prefix, full);
        const title = body.split("\n")[0]
          ?.replace(/^#\s*/, "")
          ?.trim()
          || e.name.replace(/\.md$/, "");
        results.push({
          title: `${title}`,
          body,
          source: rel,
        });
      }
    }
  } catch {}
  return results;
}

async function main() {
  console.log("=== Notes Import Script ===");
  console.log(`API: ${API}`);

  const cookie = await login();
  let total = 0;

  // 1. Local project docs
  const docDirs = [
    { dir: join(import.meta.dir!, "../../../quipumed/docs"), label: "quipumed" },
    { dir: join(import.meta.dir!, "../../../biochain"), label: "biochain" },
    { dir: join(import.meta.dir!, "../../.."), label: "projects" },
  ];

  for (const { dir, label } of docDirs) {
    if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
    console.log(`\n--- ${label} ---`);
    const entries = walkDir(dir, dir);
    for (const e of entries) {
      await createNote(cookie, `[${label}] ${e.title}`, e.body);
      total++;
    }
  }

  // 2. Skills
  console.log(`\n--- skills ---`);
  const seen = new Set<string>();
  for (const skillDir of SKILL_DIRS) {
    if (!statSync(skillDir, { throwIfNoEntry: false })?.isDirectory()) continue;
    for (const name of readdirSync(skillDir)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const skillPath = join(skillDir, name, "SKILL.md");
      try {
        const body = readFileSync(skillPath, "utf-8");
        await createNote(cookie, `[skill] ${name}`, body);
        total++;
      } catch {}
    }
  }

  // 3. NAS vault
  if (statSync(NAS_VAULT, { throwIfNoEntry: false })?.isDirectory()) {
    console.log(`\n--- obsidian vault ---`);
    const entries = walkDir(NAS_VAULT, NAS_VAULT);
    for (const e of entries) {
      await createNote(cookie, `[vault] ${e.title}`, e.body);
      total++;
    }
  }

  console.log(`\n=== Import complete: ${total} notes ===`);
}

main().catch(console.error);
