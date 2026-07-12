#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = gitRoot();
const outputPath = path.join(
  root,
  "coordination",
  "release-intake",
  "latest-A25-no-staged-changes-gate.json"
);
const json = process.argv.includes("--json");

function gitRoot() {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function main() {
  const stagedEntries = git(["diff", "--cached", "--name-status"])
    .split("\n")
    .filter(Boolean);
  const payload = {
    checkedAt: new Date().toISOString(),
    root,
    stagedEntryCount: stagedEntries.length,
    stagedSample: stagedEntries.slice(0, 25),
    passed: stagedEntries.length === 0
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log("A25 no-staged-changes gate");
    console.log(`Staged entries: ${payload.stagedEntryCount}`);
  }

  if (!payload.passed) {
    console.error("A25 no-staged-changes gate failed.");
    for (const entry of payload.stagedSample) console.error(`- ${entry}`);
    process.exit(1);
  }
}

main();
