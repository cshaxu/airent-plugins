#!/usr/bin/env node

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DISTRIBUTION_REPOSITORY = "github:cshaxu/airent-plugins";
const DEPENDENCY_SECTIONS = ["dependencies", "peerDependencies", "devDependencies"];
const PACKAGES = [
  { directory: "api", name: "@airent/api" },
  { directory: "api-express", name: "@airent/api-express" },
  { directory: "api-next", name: "@airent/api-next" },
  { directory: "api-next-tanstack", name: "@airent/api-next-tanstack" },
  { directory: "imdb", name: "@airent/imdb" },
  { directory: "prisma", name: "@airent/prisma" },
];
const dryRun = process.argv.includes("--dry-run");

function git(args, options = {}) {
  return cp.execFileSync("git", args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function rewriteInternalDependencies(packagePath, distributionShaByName) {
  const manifestPath = path.join(packagePath, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let changed = false;

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = manifest[section] ?? {};
    for (const [name, distributionSha] of Object.entries(distributionShaByName)) {
      if (!(name in dependencies)) continue;
      if (!dependencies[name].startsWith("file:")) {
        throw new Error(`${manifest.name} must use a file: dependency for ${name} on main`);
      }
      dependencies[name] = `${DISTRIBUTION_REPOSITORY}#${distributionSha}`;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return changed;
}

function createDistributionCommit(packageInfo, distributionShaByName) {
  const baseCommit = git(["subtree", "split", "--prefix", `packages/${packageInfo.directory}`]);
  const temporaryWorktree = fs.mkdtempSync(path.join(os.tmpdir(), "airent-plugin-split-"));

  try {
    git(["worktree", "add", "--detach", temporaryWorktree, baseCommit]);
    const changed = rewriteInternalDependencies(temporaryWorktree, distributionShaByName);
    if (changed) {
      git(["add", "package.json"], { cwd: temporaryWorktree });
      git(["commit", "-m", `chore: prepare ${packageInfo.name} distribution`], {
        cwd: temporaryWorktree,
      });
    }
    return git(["rev-parse", "HEAD"], { cwd: temporaryWorktree });
  } finally {
    try {
      git(["worktree", "remove", "--force", temporaryWorktree]);
    } finally {
      fs.rmSync(temporaryWorktree, { recursive: true, force: true });
    }
  }
}

function main() {
  const distributionShaByName = {};

  for (const packageInfo of PACKAGES) {
    const distributionSha = createDistributionCommit(packageInfo, distributionShaByName);
    distributionShaByName[packageInfo.name] = distributionSha;
    console.log(`${packageInfo.name}: ${distributionSha}`);

    if (!dryRun) {
      git(["branch", "-f", `split/${packageInfo.directory}`, distributionSha]);
      git(["push", "origin", `split/${packageInfo.directory}`, "--force"]);
    }
  }
}

main();
