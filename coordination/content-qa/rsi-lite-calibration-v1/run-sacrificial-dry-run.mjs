import { mkdir, realpath } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  buildSacrificialBundle,
  runAllSacrificialArms,
  writeSacrificialAttempt
} from "./sacrificial-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../../..");

class AuthorizationBoundaryError extends Error {}

function optionValue(name, { required = false } = {}) {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    if (required) throw new AuthorizationBoundaryError(`${name} requires a value.`);
    return undefined;
  }
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new AuthorizationBoundaryError(`${name} requires a value.`);
  return value;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function externalTemporaryOutputRoot() {
  if (process.argv.includes("--output-dir")) {
    throw new AuthorizationBoundaryError("--output-dir is a legacy fixed-output option and is not authorized in F2-R.");
  }
  const raw = optionValue("--output-root", { required: true });
  const resolved = path.resolve(raw);
  if (isInside(repositoryRoot, resolved)) {
    throw new AuthorizationBoundaryError("--output-root requires an external temporary root outside the source worktree.");
  }
  await mkdir(resolved, { recursive: true, mode: 0o700 });
  const [realOutputRoot, realTemporaryRoot] = await Promise.all([realpath(resolved), realpath(os.tmpdir())]);
  if (!isInside(realTemporaryRoot, realOutputRoot)) {
    throw new AuthorizationBoundaryError("--output-root requires an external temporary root under the operating-system temp directory.");
  }
  return realOutputRoot;
}

function holdBeforeCommitMilliseconds() {
  const value = optionValue("--test-hold-before-commit-ms");
  if (value === undefined) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
    throw new AuthorizationBoundaryError("--test-hold-before-commit-ms requires an integer from 0 through 10000.");
  }
  return parsed;
}

const forbidden = ["--formal-run", "--live-provider", "--production", "--deploy"]
  .find((flag) => process.argv.includes(flag));
if (forbidden) {
  process.stderr.write(`${forbidden} is not authorized during F2-R.\n`);
  process.exitCode = 2;
} else {
  const abortController = new AbortController();
  let terminationSignal = null;
  const onTermination = (signal) => {
    if (terminationSignal) return;
    terminationSignal = signal;
    abortController.abort(new Error(`Received ${signal} before sacrificial attempt commit.`));
  };
  const onSigterm = () => onTermination("SIGTERM");
  const onSigint = () => onTermination("SIGINT");
  process.once("SIGTERM", onSigterm);
  process.once("SIGINT", onSigint);
  try {
    const outputRoot = await externalTemporaryOutputRoot();
    const attemptId = optionValue("--attempt-id", { required: true });
    const holdMilliseconds = holdBeforeCommitMilliseconds();
    const bundle = buildSacrificialBundle();
    const started = process.hrtime.bigint();
    const receipts = await runAllSacrificialArms(bundle);
    const observedRoleExecutionMilliseconds = Number(process.hrtime.bigint() - started) / 1_000_000;
    const runtimeObservation = {
      protocolId: bundle.protocolId,
      protocolVersion: bundle.protocolVersion,
      sourceBaseline: bundle.sourceBaseline,
      attemptId,
      status: "candidate-only",
      executionMode: "offline-deterministic",
      observedRoleExecutionMilliseconds,
      providerCalls: 0,
      apiCost: 0,
      browserLaunches: 0,
      liveProviderCalibrated: false,
      formalExecutionAuthorized: false,
      productionAuthorized: false,
      interpretation: "Sacrificial role execution time only; not live-model latency, browser-render time, formal execution, or production evidence."
    };
    const committed = await writeSacrificialAttempt({
      outputRoot,
      attemptId,
      bundle,
      receipts,
      runtimeObservation,
      beforeCommit: holdMilliseconds > 0
        ? ({ signal }) => delay(holdMilliseconds, undefined, { signal })
        : undefined,
      signal: abortController.signal
    });
    process.removeListener("SIGTERM", onSigterm);
    process.removeListener("SIGINT", onSigint);
    process.stdout.write(`offline-deterministic: committed attempt ${committed.attemptId}; live provider, browser estimand, formal execution, and production remain disabled.\n`);
  } catch (error) {
    process.removeListener("SIGTERM", onSigterm);
    process.removeListener("SIGINT", onSigint);
    if (terminationSignal) {
      process.kill(process.pid, terminationSignal);
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Sacrificial dry run failed: ${message}\n`);
    process.exitCode = error instanceof AuthorizationBoundaryError ? 2 : 1;
  }
}
