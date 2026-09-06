import { spawn } from "node:child_process";

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function signalProcessTree(child, signal, detached) {
  if (!child.pid) return false;
  try {
    if (detached && process.platform !== "win32") process.kill(-child.pid, signal);
    else child.kill(signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

export class ProcessTimeoutError extends Error {
  constructor({ label, phase = "runtime", timeoutMilliseconds, childPid, terminationEscalated, finalSignal, stdout, stderr }) {
    super(`${label}${phase === "runtime" ? "" : ` ${phase}`} timed out after ${timeoutMilliseconds}ms and was fully reaped.`);
    this.name = "ProcessTimeoutError";
    this.timedOut = true;
    this.phase = phase;
    this.childPid = childPid;
    this.terminationEscalated = terminationEscalated;
    this.finalSignal = finalSignal;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

export async function runBoundedProcess({
  executable,
  args = [],
  options = {},
  input,
  readyPattern,
  timeoutMilliseconds = 10_000,
  startupTimeoutMilliseconds = timeoutMilliseconds,
  terminationGraceMilliseconds = 250,
  label = "Child process"
}) {
  if (typeof executable !== "string" || executable.length === 0) throw new Error("A child executable is required.");
  if (!Number.isInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) throw new Error("timeoutMilliseconds must be a positive integer.");
  if (readyPattern !== undefined && readyPattern !== null) {
    if (!(typeof readyPattern === "string" && readyPattern.length > 0) && !(readyPattern instanceof RegExp)) {
      throw new Error("readyPattern must be a non-empty string or regular expression.");
    }
    if (!Number.isInteger(startupTimeoutMilliseconds) || startupTimeoutMilliseconds <= 0) {
      throw new Error("startupTimeoutMilliseconds must be a positive integer when readyPattern is provided.");
    }
  }
  if (!Number.isInteger(terminationGraceMilliseconds) || terminationGraceMilliseconds < 0) throw new Error("terminationGraceMilliseconds must be a non-negative integer.");
  const detached = options.detached ?? process.platform !== "win32";
  const child = spawn(executable, args, {
    ...options,
    detached,
    stdio: ["pipe", "pipe", "pipe"]
  });
  const childPid = child.pid;
  let stdout = "";
  let stderr = "";
  let resolveReady;
  let readyObserved = false;
  const readiness = new Promise((resolve) => { resolveReady = resolve; });
  const outputMatchesReadyPattern = () => {
    if (typeof readyPattern === "string") return stdout.includes(readyPattern);
    if (readyPattern instanceof RegExp) {
      readyPattern.lastIndex = 0;
      return readyPattern.test(stdout);
    }
    return false;
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (!readyObserved && outputMatchesReadyPattern()) {
      readyObserved = true;
      resolveReady();
    }
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.stdin.end(input);

  const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  const terminateAndThrow = async ({ phase, phaseTimeoutMilliseconds }) => {
    signalProcessTree(child, "SIGTERM", detached);
    let terminationEscalated = false;
    let final = await Promise.race([
      completed,
      delay(terminationGraceMilliseconds).then(() => null)
    ]);
    if (final === null) {
      terminationEscalated = signalProcessTree(child, "SIGKILL", detached);
      final = await completed;
    }
    throw new ProcessTimeoutError({
      label,
      phase,
      timeoutMilliseconds: phaseTimeoutMilliseconds,
      childPid,
      terminationEscalated,
      finalSignal: final.signal ?? (terminationEscalated ? "SIGKILL" : "SIGTERM"),
      stdout,
      stderr
    });
  };

  if (readyPattern !== undefined && readyPattern !== null) {
    const startupTimeoutMarker = Symbol("startup-timeout");
    const readyMarker = Symbol("ready");
    let startupTimeoutId;
    const startupTimeout = new Promise((resolve) => {
      startupTimeoutId = setTimeout(() => resolve(startupTimeoutMarker), startupTimeoutMilliseconds);
    });
    const startupOutcome = await Promise.race([
      completed,
      readiness.then(() => readyMarker),
      startupTimeout
    ]);
    clearTimeout(startupTimeoutId);
    if (startupOutcome === startupTimeoutMarker) {
      return terminateAndThrow({ phase: "startup", phaseTimeoutMilliseconds: startupTimeoutMilliseconds });
    }
    if (startupOutcome !== readyMarker) return { ...startupOutcome, stdout, stderr, childPid };
  }

  const timeoutMarker = Symbol("runtime-timeout");
  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(timeoutMarker), timeoutMilliseconds);
  });
  const outcome = await Promise.race([completed, timeout]);
  clearTimeout(timeoutId);
  if (outcome !== timeoutMarker) return { ...outcome, stdout, stderr, childPid };
  return terminateAndThrow({ phase: "runtime", phaseTimeoutMilliseconds: timeoutMilliseconds });
}
