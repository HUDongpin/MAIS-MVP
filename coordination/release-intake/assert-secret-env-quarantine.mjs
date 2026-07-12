#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseIntakeDir = path.join(root, "coordination", "release-intake");
const allowedEnvExamples = new Set([".env.example", ".env.local.example"]);
const secretFileNames = new Set(["All API Keys.docx", "default accounts.md"]);

function git(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const filePath = line.slice(3).split(" -> ").at(-1) ?? line.slice(3);
  return { status, path: filePath };
}

function isEnvPath(filePath) {
  return filePath === ".env" || filePath.startsWith(".env.");
}

function main() {
  const entries = git(["status", "--porcelain=v1", "-uall"])
    .split("\n")
    .filter(Boolean)
    .map(parseStatusLine);

  const envEntries = entries.filter((entry) => isEnvPath(entry.path));
  const blockedEnvEntries = envEntries.filter((entry) => !allowedEnvExamples.has(entry.path));
  const blockedSecretEntries = entries.filter((entry) => secretFileNames.has(path.basename(entry.path)));
  const failures = [...blockedEnvEntries, ...blockedSecretEntries];

  const payload = {
    checkedAt: new Date().toISOString(),
    allowedEnvExamples: [...allowedEnvExamples].sort(),
    envEntries,
    blockedSecretEntries,
    failures
  };

  fs.writeFileSync(path.join(releaseIntakeDir, "latest-A25-secret-env-quarantine-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("A25 secret/env quarantine gate failed.");
    for (const failure of failures) console.error(`- ${failure.status.trim() || "M"} ${failure.path}`);
    process.exit(1);
  }

  console.log("A25 secret/env quarantine gate passed");
  console.log(`Env status entries: ${envEntries.length}`);
  console.log(`Blocked secret entries: ${blockedSecretEntries.length}`);
}

main();
