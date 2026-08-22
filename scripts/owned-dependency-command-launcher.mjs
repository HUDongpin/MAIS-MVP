import { spawn } from "node:child_process";
import { lstatSync, realpathSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function launchOwnedDependencyCommand(argv = process.argv.slice(2)) {
  const [target, ...args] = argv;
  if (typeof target !== "string" || !isAbsolute(target)) {
    throw new Error("Owned dependency launcher target must be an absolute file path.");
  }
  const entry = lstatSync(target, { throwIfNoEntry: false });
  if (!entry || !entry.isFile() || entry.isSymbolicLink() || realpathSync(target) !== target) {
    throw new Error("Owned dependency launcher target must be a canonical physical file.");
  }
  process.umask(0o077);
  const child = spawn(process.execPath, [target, ...args], {
    detached: false,
    env: process.env,
    stdio: "inherit"
  });
  const outcome = await new Promise((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", (status, signal) => resolvePromise({ signal, status }));
  });
  if (outcome.signal) return 1;
  return Number.isInteger(outcome.status) ? outcome.status : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  launchOwnedDependencyCommand().then(
    (status) => { process.exitCode = status; },
    () => { process.exitCode = 1; }
  );
}
