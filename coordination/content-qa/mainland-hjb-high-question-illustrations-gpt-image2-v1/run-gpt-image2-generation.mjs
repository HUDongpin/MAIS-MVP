#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.join(__dirname, "prompts");
const candidatesDir = path.join(__dirname, "candidates");
const dryRunsDir = path.join(__dirname, "dry-runs");
const imageGenCli = "/Users/dongpinhu/.codex/skills/.system/imagegen/scripts/image_gen.py";
const pythonBin = process.env.PYTHON_BIN ?? "python3";

const model = "gpt-image-2";
const size = "1536x864";
const quality = "medium";
const outputFormat = "png";
const concurrency = readNumberFlag("--concurrency", 3);
const maxAttempts = readNumberFlag("--max-attempts", 4);
const mode = readStringFlag("--mode") ?? process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "smoke";
const chunk = readStringFlag("--chunk");
const dryRun = hasFlag("--dry-run");
const force = hasFlag("--force");
const failFast = hasFlag("--fail-fast");

fs.mkdirSync(candidatesDir, { recursive: true });
fs.mkdirSync(dryRunsDir, { recursive: true });

if (!dryRun && !process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set. Export it before running GPT Image2 generation.");
  process.exit(1);
}

const promptFiles = resolvePromptFiles(mode, chunk);
let totalJobs = 0;
let totalSkipped = 0;

for (const promptFile of promptFiles) {
  const jobs = readJsonl(promptFile);
  const runnableJobs = force ? jobs : jobs.filter((job) => !fs.existsSync(path.join(candidatesDir, String(job.out))));
  const skipped = jobs.length - runnableJobs.length;

  totalJobs += runnableJobs.length;
  totalSkipped += skipped;

  if (skipped > 0) {
    console.error(`[${path.basename(promptFile)}] skipped existing outputs: ${skipped}`);
  }

  if (runnableJobs.length === 0) {
    console.error(`[${path.basename(promptFile)}] no jobs to run`);
    continue;
  }

  const tempInput = writeTempJsonl(promptFile, runnableJobs, dryRun);
  const args = [
    imageGenCli,
    "generate-batch",
    "--input",
    tempInput,
    "--out-dir",
    candidatesDir,
    "--model",
    model,
    "--size",
    size,
    "--quality",
    quality,
    "--output-format",
    outputFormat,
    "--concurrency",
    String(concurrency),
    "--max-attempts",
    String(maxAttempts),
    "--no-augment"
  ];

  if (dryRun) args.push("--dry-run");
  if (force) args.push("--force");
  if (failFast) args.push("--fail-fast");

  console.error(`[${path.basename(promptFile)}] running ${runnableJobs.length} jobs${dryRun ? " (dry-run)" : ""}`);
  const result = spawnSync(pythonBin, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.error(`Done. Runnable jobs: ${totalJobs}; skipped existing outputs: ${totalSkipped}; mode: ${mode}.`);

function resolvePromptFiles(selectedMode, selectedChunk) {
  if (selectedMode === "smoke") {
    return [path.join(promptsDir, "smoke-by-template.jsonl")];
  }

  if (selectedMode === "chunk") {
    if (!selectedChunk) die("Use --chunk 001 with --mode chunk.");
    const normalized = String(selectedChunk).padStart(3, "0");
    return [path.join(promptsDir, `chunk-${normalized}.jsonl`)];
  }

  if (selectedMode === "full") {
    return fs.readdirSync(promptsDir)
      .filter((fileName) => /^chunk-\d{3}\.jsonl$/u.test(fileName))
      .sort()
      .map((fileName) => path.join(promptsDir, fileName));
  }

  die(`Unknown mode: ${selectedMode}. Use smoke, chunk, or full.`);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) die(`Prompt file not found: ${filePath}`);
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        die(`Invalid JSONL in ${filePath} line ${index + 1}: ${error.message}`);
      }
    });
}

function writeTempJsonl(promptFile, jobs, isDryRun) {
  const stamp = new Date().toISOString().replaceAll(/[:.]/gu, "-");
  const prefix = isDryRun ? "dry-run" : "run";
  const tempPath = path.join(dryRunsDir, `${prefix}-${path.basename(promptFile, ".jsonl")}-${stamp}.jsonl`);
  fs.writeFileSync(tempPath, jobs.map((job) => JSON.stringify(job)).join("\n") + "\n");
  return tempPath;
}

function readStringFlag(name) {
  const args = process.argv.slice(2);
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];
  const prefix = `${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function readNumberFlag(name, fallback) {
  const value = readStringFlag(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) die(`Invalid ${name}: ${value}`);
  return parsed;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function die(message) {
  console.error(message);
  process.exit(1);
}
