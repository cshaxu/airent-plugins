#!/usr/bin/env node

const cp = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const timeoutSeconds = Number(process.env.SPLIT_WAIT_TIMEOUT_SECONDS ?? 600);
const pollIntervalMs = 5000;

function git(args) {
  return cp.execFileSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  }).trim();
}

function getRepository() {
  const remote = git(["config", "--get", "remote.origin.url"]);
  const match = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot derive GitHub repository from ${JSON.stringify(remote)}`);
  return match[1];
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const repository = getRepository();
  const headSha = git(["rev-parse", "HEAD"]);
  const deadline = Date.now() + timeoutSeconds * 1000;
  const url = `https://api.github.com/repos/${repository}/actions/workflows/split-packages.yml/runs?head_sha=${headSha}`;

  console.log(`Waiting for split-packages.yml for ${headSha}`);
  while (Date.now() < deadline) {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "airent-plugins-split-waiter" },
    });
    if (!response.ok) throw new Error(`GitHub Actions query failed: ${response.status} ${response.statusText}`);

    const payload = await response.json();
    const run = payload.workflow_runs?.[0];
    if (!run) {
      await sleep(pollIntervalMs);
      continue;
    }
    if (run.status !== "completed") {
      console.log(`  ${run.status}: ${run.html_url}`);
      await sleep(pollIntervalMs);
      continue;
    }
    if (run.conclusion !== "success") {
      throw new Error(`Split workflow ${run.conclusion}: ${run.html_url}`);
    }
    console.log(`Split workflow succeeded: ${run.html_url}`);
    return;
  }
  throw new Error(`Timed out after ${timeoutSeconds}s waiting for the split workflow.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});