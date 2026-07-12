#!/usr/bin/env node
// Kill whatever is listening on the given TCP port(s). Parallel MAIS sessions
// orphan `next-server` children that survive normal task termination and keep
// serving stale builds; `kill-port` cleans them reliably.
//
// Usage: node scripts/kill-port.mjs 3163 3164
import { execFileSync } from "node:child_process";

const ports = process.argv.slice(2).filter((value) => /^\d+$/.test(value));
if (ports.length === 0) {
  console.error("Usage: node scripts/kill-port.mjs <port> [port...]");
  process.exit(1);
}

let killedAny = false;
for (const port of ports) {
  let pids = [];
  try {
    const output = execFileSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
    pids = output.split("\n").map((line) => line.trim()).filter(Boolean);
  } catch {
    // lsof exits non-zero when nothing is listening; treat as empty.
    pids = [];
  }

  if (pids.length === 0) {
    console.log(`port ${port}: nothing listening`);
    continue;
  }

  for (const pid of pids) {
    try {
      process.kill(Number(pid), "SIGKILL");
      console.log(`port ${port}: killed pid ${pid}`);
      killedAny = true;
    } catch (error) {
      console.warn(`port ${port}: could not kill pid ${pid}: ${(error && error.message) || error}`);
    }
  }
}

process.exit(killedAny || true ? 0 : 0);
