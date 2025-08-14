#!/usr/bin/env -S node --enable-source-maps
import { execSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import prompts, { type PromptObject } from "prompts";

type ReleaseType = "patch" | "minor" | "major" | "custom";

function run(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...(options.env || {}) },
    ...options,
  });
  if (result.status !== 0) {
    const cmd = [command, ...args].join(" ");
    throw new Error(
      `Command failed: ${cmd}\n${result.stderr || result.stdout}`,
    );
  }
  return (result.stdout || "").trim();
}

function runInteractive(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): void {
  const result: SpawnSyncReturns<string> = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    env: { ...process.env, ...(options.env || {}) },
    ...options,
  });
  if (result.status !== 0) {
    const cmd = [command, ...args].join(" ");
    throw new Error(`Command failed: ${cmd}`);
  }
}

function getCurrentBranch(): string {
  return run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
}

function isWorkingTreeClean(): boolean {
  return run("git", ["status", "--porcelain"]) === "";
}

function fetchRemote(): void {
  runInteractive("git", ["fetch", "origin", "--tags"]);
}

function tagExistsRemote(tag: string): boolean {
  const res = spawnSync("git", ["ls-remote", "--tags", "origin", tag], {
    encoding: "utf8",
  });
  return res.status === 0 && (res.stdout || "").includes(tag);
}

function parseSemver(
  version: string,
): { major: number; minor: number; patch: number } | null {
  const v = version.replace(/^v/, "");
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

function inc(version: string, type: Exclude<ReleaseType, "custom">): string {
  const v = parseSemver(version);
  if (!v) throw new Error(`Invalid version: ${version}`);
  if (type === "major") return `${v.major + 1}.0.0`;
  if (type === "minor") return `${v.major}.${v.minor + 1}.0`;
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

function nextFreeVersion(base: string): string {
  let candidate = base;
  let guard = 0;
  while (tagExistsRemote(`v${candidate}`)) {
    candidate = inc(candidate, "patch");
    guard += 1;
    if (guard > 1000)
      throw new Error("Unable to find a free version after 1000 attempts.");
  }
  return candidate;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path: string, data: any): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// Note: mac artifacts are built on CI. Local build/upload helpers were removed per request.
function listWorkspacePackageJsonPaths(): string[] {
  const root = process.cwd();
  const results: string[] = [resolve(root, "package.json")];
  const packagesDir = resolve(root, "packages");
  if (existsSync(packagesDir)) {
    const entries = readdirSync(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgJson = resolve(packagesDir, entry.name, "package.json");
      if (existsSync(pkgJson)) results.push(pkgJson);
    }
  }
  return results;
}

async function main(): Promise<void> {
  const branch = getCurrentBranch();
  if (branch !== "main") {
    const { proceed } = await prompts({
      type: "confirm",
      name: "proceed",
      message: `Current branch is '${branch}'. Switch to 'main' now?`,
      initial: true,
    });
    if (!proceed) {
      console.error("Aborted: Please run releases from the main branch.");
      process.exit(1);
    }
    runInteractive("git", ["checkout", "main"]);
    runInteractive("git", ["pull", "origin", "main"]);
  }

  if (!isWorkingTreeClean()) {
    const { autoCommit } = await prompts({
      type: "confirm",
      name: "autoCommit",
      message: "Working tree has changes. Commit all changes before release?",
      initial: true,
    });
    if (!autoCommit) {
      console.error("Aborted due to uncommitted changes.");
      process.exit(1);
    }
    const { preMsg } = await prompts({
      type: "text",
      name: "preMsg",
      message: "Commit message for current changes:",
      initial: "chore: pre-release changes",
    });
    runInteractive("git", ["add", "-A"]);
    runInteractive("git", [
      "commit",
      "-m",
      preMsg || "chore: pre-release changes",
    ]);
  }

  fetchRemote();

  const rootPkgPath = resolve(process.cwd(), "package.json");
  const rootPkg = readJson(rootPkgPath);
  const currentVersion: string = rootPkg.version;
  if (!parseSemver(currentVersion)) {
    throw new Error(`Invalid root version in package.json: ${currentVersion}`);
  }

  const { type } = await prompts({
    type: "select",
    name: "type",
    message: `Select release type (current v${currentVersion})`,
    choices: [
      { title: "patch", value: "patch" },
      { title: "minor", value: "minor" },
      { title: "major", value: "major" },
      { title: "custom", value: "custom" },
    ],
    initial: 0,
  } as PromptObject);

  let baseNext: string;
  if (type === "custom") {
    const { custom } = await prompts({
      type: "text",
      name: "custom",
      message: "Enter custom version (x.y.z):",
      validate: (val: string) => (parseSemver(val) ? true : "Must be x.y.z"),
    });
    baseNext = custom as string;
  } else {
    baseNext = inc(currentVersion, type as Exclude<ReleaseType, "custom">);
  }

  const suggested = nextFreeVersion(baseNext);

  const { finalVersion } = await prompts({
    type: "text",
    name: "finalVersion",
    message: `Final version to release (suggested ${suggested}):`,
    initial: suggested,
    validate: (val: string) => {
      if (!parseSemver(val)) return "Must be x.y.z";
      if (tagExistsRemote(`v${val}`))
        return `Tag v${val} already exists on origin`;
      return true;
    },
  });

  const tag = `v${finalVersion}`;

  const { commitMsg } = await prompts({
    type: "text",
    name: "commitMsg",
    message: "Release commit message:",
    initial: `release: ${tag}`,
  });

  // Update all package.json versions
  const pkgJsonPaths = listWorkspacePackageJsonPaths();
  for (const p of pkgJsonPaths) {
    const pkg = readJson(p);
    pkg.version = finalVersion;
    writeJson(p, pkg);
  }

  // Commit, tag, push
  runInteractive("git", ["add", ...pkgJsonPaths.map((p) => resolve(p))]);
  runInteractive("git", ["commit", "-m", commitMsg || `release: ${tag}`]);
  runInteractive("git", ["tag", "-a", tag, "-m", tag]);
  runInteractive("git", ["push", "origin", "main"]);
  runInteractive("git", ["push", "origin", "--tags"]);

  console.log(
    `\nReleased ${tag}. GitHub Actions will build and publish for macOS, Windows, Linux.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
