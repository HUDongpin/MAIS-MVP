import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SUITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_CLIS = [
  "mais-rsi-machine-qa-workflow/scripts/validate-machine-qa-packet.mjs",
  "mais-rsi-machine-qa-workflow/scripts/safe-receipt-summary.mjs",
  "mais-natural-sample-evaluation/scripts/resolve-evaluation-state.mjs",
  "mais-natural-sample-evaluation/scripts/verify-evidence-envelope.mjs",
  "mais-natural-sample-evaluation/scripts/audit-protected-custody.mjs",
  "mais-natural-sample-evaluation/scripts/validate-redacted-export.mjs",
  "mais-content-promotion-gate/scripts/discover-promotion-gate.mjs",
  "mais-content-promotion-gate/scripts/run-native-gate.mjs",
  "mais-content-promotion-gate/scripts/compare-receipts.mjs",
];

function run(relative, args, cwd) {
  return spawnSync(process.execPath, [path.join(SUITE_DIR, relative), ...args], {
    cwd,
    encoding: "utf8",
    timeout: 10_000,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      OPENAI_API_KEY: "never-emit-test-secret-openai",
      DEEPSEEK_API_KEY: "never-emit-test-secret-deepseek",
      NODE_OPTIONS: "",
    },
  });
}

test("every published CLI exposes offline-safe help", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "mais-skill-cli-help-"));
  try {
    for (const relative of PUBLIC_CLIS) {
      const result = run(relative, ["--help"], cwd);
      assert.equal(result.signal, null, `${relative} signal`);
      assert.equal(result.status, 0, `${relative}: ${result.stderr}`);
      assert.match(result.stdout, /Usage:/u, `${relative} help`);
      assert.doesNotMatch(result.stdout + result.stderr, /never-emit-test-secret/u, relative);
    }
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test("no-argument defaults fail closed without writing or exposing credentials", () => {
  for (const relative of PUBLIC_CLIS) {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "mais-skill-cli-default-"));
    try {
      const before = fs.readdirSync(cwd).sort();
      const result = run(relative, [], cwd);
      const after = fs.readdirSync(cwd).sort();
      assert.equal(result.signal, null, `${relative} signal`);
      assert.notEqual(result.status, 0, `${relative} must not treat an empty invocation as evidence`);
      assert.deepEqual(after, before, `${relative} wrote in its default working directory`);
      assert.doesNotMatch(result.stdout + result.stderr, /never-emit-test-secret/u, relative);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  }
});

test("published CLI source does not import network or provider clients", () => {
  const forbidden = /from\s+["']node:(?:http|https|http2|net|tls|dns)["']|\brequire\(["'](?:node:)?(?:http|https|http2|net|tls|dns)["']\)|\bfetch\s*\(|\b(?:openai|deepseek|anthropic)\b\s*\./giu;
  const findings = [];
  for (const relative of PUBLIC_CLIS) {
    const source = fs.readFileSync(path.join(SUITE_DIR, relative), "utf8");
    for (const match of source.matchAll(forbidden)) findings.push({ file: relative, token: match[0] });
  }
  assert.deepEqual(findings, []);
});
