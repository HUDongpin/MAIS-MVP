import { spawn, type ChildProcess } from "node:child_process";
import { renameSync, rmSync, writeFileSync } from "node:fs";

export type IsolatedAppProcessSupervisorMarker = never;

const [registrationPath, command, ...args] = process.argv.slice(2);
if (!registrationPath || !command || process.platform === "win32") {
  process.stderr.write("isolated app process supervisor requires POSIX, a registration path, and a command\n");
  process.exit(2);
}

const registrationTempPath = `${registrationPath}.${process.pid}.tmp`;
try {
  writeFileSync(registrationTempPath, `${process.pid}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  renameSync(registrationTempPath, registrationPath);
} finally {
  rmSync(registrationTempPath, { force: true });
}

// The guardian persists this supervisor PID and birth identity while the whole
// process group is stopped. Only after that durable acknowledgement does it
// send SIGCONT and allow the real app command to start.
process.kill(process.pid, "SIGSTOP");

let childExited = false;
let childExitCode = 1;
let childSignal: NodeJS.Signals | null = null;

// Group-wide teardown already delivers these signals to the app and all of its
// descendants. Keeping the supervisor alive preserves a verifiable group-leader
// identity until every other member exits or the worker escalates to SIGKILL.
for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
  process.on(signal, () => {
    // Intentionally retain the supervisor until group membership is empty.
  });
}

let appProcess: ChildProcess;
try {
  appProcess = spawn(command, args, {
    cwd: process.cwd(),
    detached: false,
    env: process.env,
    stdio: "inherit"
  });
} catch (error) {
  process.stderr.write(`isolated app command spawn failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(127);
}

appProcess.once("error", (error) => {
  process.stderr.write(`isolated app command error: ${error.message}\n`);
  childExited = true;
  childExitCode = 127;
});
appProcess.once("exit", (code, signal) => {
  childExited = true;
  childExitCode = code ?? 1;
  childSignal = signal;
});

function processGroupMemberPids() {
  return new Promise<number[] | null>((resolve) => {
    const inspection = spawn("ps", ["-axo", "pid=,pgid="], {
      // The inspector must not join the app group it is inspecting; otherwise
      // it observes its own temporary PID and the supervisor can never prove
      // that every other group member has exited.
      detached: true,
      stdio: ["ignore", "pipe", "ignore"]
    });
    let output = "";
    let settled = false;
    const finish = (pids: number[] | null) => {
      if (settled) return;
      settled = true;
      resolve(pids);
    };
    inspection.stdout.setEncoding("utf8");
    inspection.stdout.on("data", (chunk: string) => {
      output += chunk;
    });
    inspection.once("error", () => finish(null));
    inspection.once("close", (code) => {
      if (code !== 0) return finish(null);
      finish(
        output
          .split("\n")
          .map((line) => line.trim().split(/\s+/u).map(Number))
          .filter(([pid, processGroupId]) => Number.isSafeInteger(pid) && processGroupId === process.pid)
          .map(([pid]) => pid)
      );
    });
  });
}

let groupInspectionInProgress = false;
const groupMonitor = setInterval(() => {
  if (!childExited || groupInspectionInProgress) return;
  groupInspectionInProgress = true;
  void processGroupMemberPids()
    .then((groupMembers) => {
      if (!groupMembers || groupMembers.some((pid) => pid !== process.pid)) return;
      clearInterval(groupMonitor);
      if (childSignal) process.stderr.write(`isolated app command exited from signal ${childSignal}\n`);
      process.exit(childExitCode);
    })
    .finally(() => {
      groupInspectionInProgress = false;
    });
}, 25);
