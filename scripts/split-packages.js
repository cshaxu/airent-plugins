#!/usr/bin/env node

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(ROOT, "packages");
const DEPENDENCY_SECTIONS = ["dependencies", "peerDependencies", "devDependencies"];
const dryRun = process.argv.includes("--dry-run");

function git(args, options = {}) {
  return cp.execFileSync("git", args, {
    cwd: options.cwd ?? ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function readManifest(packagePath) {
  return JSON.parse(fs.readFileSync(path.join(packagePath, "package.json"), "utf8"));
}

function getDistributionRepository() {
  if (process.env.DISTRIBUTION_REPOSITORY) return process.env.DISTRIBUTION_REPOSITORY;

  const remote = git(["config", "--get", "remote.origin.url"]);
  const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) {
    throw new Error(
      `Cannot derive a GitHub package URL from origin ${JSON.stringify(remote)}. Set DISTRIBUTION_REPOSITORY instead.`,
    );
  }
  return `github:${match[1]}`;
}

function discoverPackages() {
  const packageByName = new Map();

  for (const entry of fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const packagePath = path.join(PACKAGES_ROOT, entry.name);
    if (!fs.existsSync(path.join(packagePath, "package.json"))) continue;

    const manifest = readManifest(packagePath);
    if (!manifest.name) throw new Error(`${packagePath} has no package name`);
    if (packageByName.has(manifest.name)) throw new Error(`Duplicate package name ${manifest.name}`);

    packageByName.set(manifest.name, {
      directory: entry.name,
      name: manifest.name,
      packagePath,
      internalDependencies: new Set(),
    });
  }

  for (const packageInfo of packageByName.values()) {
    const manifest = readManifest(packageInfo.packagePath);
    for (const section of DEPENDENCY_SECTIONS) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        if (!version.startsWith("file:")) continue;

        const relativePath = version.slice("file:".length);
        const dependencyPath = path.resolve(packageInfo.packagePath, relativePath);
        const dependencyManifestPath = path.join(dependencyPath, "package.json");
        if (!fs.existsSync(dependencyManifestPath)) {
          throw new Error(`${packageInfo.name} references missing local package ${version}`);
        }

        const dependencyName = readManifest(dependencyPath).name;
        if (dependencyName !== name) {
          throw new Error(`${packageInfo.name} maps ${name} to ${version}, which is ${dependencyName}`);
        }
        if (!packageByName.has(name)) {
          throw new Error(`${packageInfo.name} references local package ${name} outside packages/`);
        }
        packageInfo.internalDependencies.add(name);
      }
    }
  }

  return packageByName;
}

function sortPackages(packageByName) {
  const states = new Map();
  const ordered = [];

  function visit(name, chain = []) {
    const state = states.get(name);
    if (state === "done") return;
    if (state === "visiting") throw new Error(`Internal package dependency cycle: ${[...chain, name].join(" -> ")}`);

    states.set(name, "visiting");
    const packageInfo = packageByName.get(name);
    for (const dependencyName of [...packageInfo.internalDependencies].sort()) {
      visit(dependencyName, [...chain, name]);
    }
    states.set(name, "done");
    ordered.push(packageInfo);
  }

  for (const name of [...packageByName.keys()].sort()) visit(name);
  return ordered;
}

function rewriteInternalDependencies(packageInfo, packagePath, distributionShaByName, distributionRepository) {
  const manifestPath = path.join(packagePath, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = manifest[section] ?? {};
    for (const name of packageInfo.internalDependencies) {
      if (!(name in dependencies)) continue;
      if (!dependencies[name].startsWith("file:")) {
        throw new Error(`${manifest.name} must use a file: dependency for ${name} on main`);
      }
      const distributionSha = distributionShaByName[name];
      if (!distributionSha) throw new Error(`No split SHA available for ${name}`);
      dependencies[name] = `${distributionRepository}#${distributionSha}`;
    }
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function installDistributionLockfile(packagePath) {
  cp.execFileSync("npm", ["install", "--package-lock-only", "--ignore-scripts", "--workspaces=false"], {
    cwd: packagePath,
    stdio: "inherit",
  });
}

function createDistributionCommit(packageInfo, distributionShaByName, distributionRepository) {
  const baseCommit = git(["subtree", "split", "--prefix", `packages/${packageInfo.directory}`]);
  const temporaryWorktree = fs.mkdtempSync(path.join(os.tmpdir(), "airent-plugin-split-"));

  try {
    git(["worktree", "add", "--detach", temporaryWorktree, baseCommit]);
    rewriteInternalDependencies(packageInfo, temporaryWorktree, distributionShaByName, distributionRepository);
    installDistributionLockfile(temporaryWorktree);
    git(["add", "--all"], { cwd: temporaryWorktree });
    git(["commit", "-m", `chore: prepare ${packageInfo.name} distribution`], {
      cwd: temporaryWorktree,
    });
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
  const distributionRepository = getDistributionRepository();
  const packageByName = discoverPackages();
  const packages = sortPackages(packageByName);
  const distributionShaByName = {};

  for (const packageInfo of packages) {
    const distributionSha = createDistributionCommit(
      packageInfo,
      distributionShaByName,
      distributionRepository,
    );
    distributionShaByName[packageInfo.name] = distributionSha;
    console.log(`${packageInfo.name}: ${distributionSha}`);

    if (!dryRun) {
      git(["branch", "-f", `split/${packageInfo.directory}`, distributionSha]);
      git(["push", "origin", `split/${packageInfo.directory}`, "--force"]);
    }
  }
}

main();