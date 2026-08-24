import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { once } from "node:events";
import { sqliteHolderPids } from "./isolated-app";

async function stopChild(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await once(child, "exit");
}

test("SQLite preflight uses procfs when lsof is unavailable", { timeout: 10_000 }, async () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-preflight-"));
  const dbPath = path.join(root, "holder.sqlite");
  const procRoot = path.join(root, "proc");
  const child = spawn(process.execPath, [
    "-e",
    [
      "const { DatabaseSync } = require('node:sqlite');",
      "globalThis.database = new DatabaseSync(process.argv[1]);",
      "globalThis.database.exec('CREATE TABLE holder (id INTEGER PRIMARY KEY)');",
      "process.stdout.write('ready\\n');",
      "setInterval(() => {}, 1_000);"
    ].join("\n"),
    dbPath
  ]);

  try {
    await once(child.stdout, "data");
    assert.ok(child.pid);
    const fdRoot = path.join(procRoot, String(child.pid), "fd");
    mkdirSync(fdRoot, { recursive: true });
    symlinkSync(dbPath, path.join(fdRoot, "11"));

    assert.deepEqual(
      sqliteHolderPids(dbPath, {
        lsofCommand: path.join(root, "missing-lsof"),
        platform: "linux",
        procRoot
      }),
      [String(child.pid)]
    );
  } finally {
    await stopChild(child);
    rmSync(root, { recursive: true, force: true });
  }
});

test("SQLite preflight fails closed when no holder inspector is available", () => {
  const root = mkdtempSync(path.join(tmpdir(), "mais-isolated-preflight-"));
  const dbPath = path.join(root, "unused.sqlite");

  try {
    writeFileSync(dbPath, "sqlite-inspection-sentinel");
    assert.throws(
      () => sqliteHolderPids(dbPath, {
        lsofCommand: path.join(root, "missing-lsof"),
        platform: "linux",
        procRoot: path.join(root, "missing-proc")
      }),
      /Preflight failed: no SQLite holder inspector is available/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
