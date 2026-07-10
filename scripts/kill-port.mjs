#!/usr/bin/env node
// Kill whatever is listening on the given TCP port(s). Parallel MAIS sessions
// orphan `next-server` children that survive normal task termination and keep
// serving stale builds; `kill-port` cleans them reliably.
//
// Usage: node scripts/kill-port.mjs 3163 3164
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const defaultGraceMs = 1000;

function fail(message) {
  console.error(`kill-port: ${message}`);
  process.exit(1);
}

function validatedPort(value) {
  if (!/^[1-9]\d*$/.test(value)) fail("every port must be a decimal integer from 1 to 65535");
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
    fail("every port must be a decimal integer from 1 to 65535");
  }
  return String(port);
}

function validatedGraceMs(value) {
  if (value === undefined || value === "") return defaultGraceMs;
  if (!/^\d+$/.test(value)) fail("KILL_PORT_GRACE_MS must be a positive integer");
  const grace = Number(value);
  if (!Number.isSafeInteger(grace) || grace <= 0) {
    fail("KILL_PORT_GRACE_MS must be a positive integer");
  }
  return grace;
}

function listenerPids(port) {
  try {
    const output = execFileSync(
      "lsof",
      ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return [...new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => /^[1-9]\d*$/.test(line))
        .map(Number)
        .filter(Number.isSafeInteger)
    )];
  } catch (error) {
    if (error?.status === 1 && !error?.stdout?.toString?.().trim()) return [];
    throw Object.assign(new Error(`lsof listener query failed for port ${port}`), {
      code: error?.code,
      status: error?.status
    });
  }
}

function sendSignal(pid, signal) {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw Object.assign(new Error(`could not send ${signal} to pid ${pid}`), {
      code: error?.code
    });
  }
}

const rawPorts = process.argv.slice(2);
if (rawPorts.length === 0) {
  fail("usage: node scripts/kill-port.mjs <port> [port...]");
}
const ports = [...new Set(rawPorts.map(validatedPort))];
const graceMs = validatedGraceMs(process.env.KILL_PORT_GRACE_MS);
let failed = false;

for (const port of ports) {
  try {
    const initial = listenerPids(port);
    if (initial.length === 0) {
      console.log(`port ${port}: nothing listening`);
      continue;
    }

    for (const pid of initial) sendSignal(pid, "SIGTERM");
    await delay(graceMs);

    const initialSet = new Set(initial);
    const remaining = listenerPids(port).filter((pid) => initialSet.has(pid));
    const remainingSet = new Set(remaining);
    for (const pid of initial.filter((candidate) => !remainingSet.has(candidate))) {
      console.log(`port ${port}: terminated pid ${pid} with SIGTERM`);
    }

    if (remaining.length === 0) continue;
    for (const pid of remaining) {
      sendSignal(pid, "SIGKILL");
      console.log(`port ${port}: force-killed pid ${pid} after SIGTERM grace`);
    }
    await delay(Math.min(graceMs, 250));
    const survivors = listenerPids(port).filter((pid) => remainingSet.has(pid));
    if (survivors.length > 0) {
      failed = true;
      console.error(`port ${port}: listener pids still present after SIGKILL: ${survivors.join(", ")}`);
    }
  } catch (error) {
    failed = true;
    console.error(`port ${port}: ${error?.message ?? "termination failed"}${error?.code ? ` (${error.code})` : ""}`);
  }
}

process.exitCode = failed ? 1 : 0;
