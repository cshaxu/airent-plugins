#!/usr/bin/env node

const cp = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(ROOT, "packages");
const DEPENDENCY_SECTIONS = ["dependencies", "peerDependencies", "devDependencies"];
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";
const dryRun = process.argv.includes("--dry-run");

function git(args, cwd) {
  return cp.execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function githubPackageUrl(remote) {
  const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(`Cannot derive a GitHub package URL from ${JSON.stringify(remote)}`);
  }
  return `github:${match[1]}`;
}

function getAirentSourcePath() {
  const configuredPath = process.env.AIRENT_JS_PATH;
  const sourcePath = configuredPath
    ? path.resolve(ROOT, configuredPath)
    : path.resolve(ROOT, "..", "airent-js");

  if (!fs.existsSync(path.join(sourcePath, ".git"))) {
    throw new Error(
      `airent-js checkout not found at ${sourcePath}. Set AIRENT_JS_PATH to its local path.`,
    );
  }
  return sourcePath;
}

function getAirentReference() {
  const sourcePath = getAirentSourcePath();
  const sha = git(["rev-parse", "HEAD"], sourcePath);
  const remote = git(["config", "--get", "remote.origin.url"], sourcePath);
  const remoteCommits = git(["ls-remote", "origin"], sourcePath)
    .split("\n")
    .map((line) => line.split("\t")[0]);

  if (!remoteCommits.includes(sha)) {
    throw new Error(`airent-js HEAD ${sha} is not on origin yet. Push airent-js before updating plugins.`);
  }
  return `${githubPackageUrl(remote)}#${sha}`;
}

function updateManifest(manifestPath, airentReference) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  let changed = false;

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = manifest[section];
    if (!dependencies || !("airent" in dependencies)) continue;
    if (dependencies.airent === airentReference) continue;
    dependencies.airent = airentReference;
    changed = true;
  }

  if (changed && !dryRun) {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return changed;
}

function updateLockfile(packagePath) {
  const args = ["install", "--package-lock-only", "--ignore-scripts", "--workspaces=false"];
  const options = { cwd: packagePath, stdio: "inherit" };
  if (process.platform === "win32") {
    cp.execSync([NPM, ...args].join(" "), options);
  } else {
    cp.execFileSync(NPM, args, options);
  }
}

function main() {
  const airentReference = getAirentReference();
  const changedPackages = [];

  for (const entry of fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packagePath = path.join(PACKAGES_ROOT, entry.name);
    const manifestPath = path.join(packagePath, "package.json");
    if (!fs.existsSync(manifestPath)) continue;

    if (updateManifest(manifestPath, airentReference)) changedPackages.push({ entry, packagePath });
  }

  console.log(`airent: ${airentReference}`);
  if (changedPackages.length === 0) {
    console.log("All package manifests already use this airent commit.");
    return;
  }

  for (const { entry, packagePath } of changedPackages) {
    console.log(`${dryRun ? "Would update" : "Updated"}: ${entry.name}`);
    if (!dryRun) updateLockfile(packagePath);
  }
}

main();