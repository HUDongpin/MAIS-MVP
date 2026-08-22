import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

export const EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SOURCE = String.raw`
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { createHash } from "node:crypto";
import { registerHooks, syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const auditVirtualPath = path.resolve(process.argv[1]);
const labVirtualPath = path.resolve(process.argv[2]);
const expectedLabRead = process.argv[3] === "1";
const expectedAuditSha256 = process.argv[4];
const expectedLabSha256 = process.argv[5];
const ALLOWED_AUDIT_MODULE_SPECIFIERS = new Set([
  "fs",
  "node:fs",
  "node:fs/promises",
  "node:path",
  "node:url",
]);
const ALLOWED_AUDIT_MODULE_URLS = new Set([
  "node:fs",
  "node:fs/promises",
  "node:path",
  "node:url",
]);
const ALLOWED_DATA_MODULE_PREFIX = "data:text/javascript;base64,";
const originalReadFileSync = fs.readFileSync;
const auditBytes = originalReadFileSync(3);
const labBytes = originalReadFileSync(4);
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
if (!/^[a-f0-9]{64}$/u.test(expectedAuditSha256) ||
    !/^[a-f0-9]{64}$/u.test(expectedLabSha256)) {
  throw new Error("signature audit capsule expected digest argv drifted");
}
if (digest(auditBytes) !== expectedAuditSha256) {
  throw new Error("signature audit descriptor digest mismatch");
}
if (digest(labBytes) !== expectedLabSha256) {
  throw new Error("signature Lab descriptor digest mismatch");
}
const auditSource = auditBytes.toString("utf8");
let auditLabReadCount = 0;

function normalizedReadTarget(target) {
  if (target instanceof URL) return fileURLToPath(target);
  if (Buffer.isBuffer(target)) return path.resolve(target.toString("utf8"));
  return typeof target === "string" ? path.resolve(target) : null;
}

function boundLabValue(options) {
  const encoding = typeof options === "string" ? options : options?.encoding;
  return encoding ? labBytes.toString(encoding) : Buffer.from(labBytes);
}

function readBoundLab(target, options) {
  if (normalizedReadTarget(target) !== labVirtualPath) {
    throw new Error("signature audit capsule rejected an undeclared file read");
  }
  auditLabReadCount += 1;
  return boundLabValue(options);
}

function denyUnboundFileSystemAccess() {
  throw new Error("signature audit capsule rejected unbound filesystem access");
}

function denyUnboundBuiltinAcquisition() {
  throw new Error("signature audit capsule rejected an undeclared builtin acquisition");
}

function replaceUnboundCallableExports(target, allowedNames, denial, label) {
  for (const name of Reflect.ownKeys(target)) {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (typeof descriptor?.value !== "function" || allowedNames.has(name)) continue;
    if (descriptor.writable !== true) {
      throw new Error(label + " callable " + String(name) + " cannot be confined");
    }
    Object.defineProperty(target, name, {
      ...descriptor,
      value: denial,
    });
  }
}

replaceUnboundCallableExports(fs, new Set(["readFileSync"]),
  denyUnboundFileSystemAccess, "node:fs");
replaceUnboundCallableExports(fsPromises, new Set(["readFile"]),
  denyUnboundFileSystemAccess, "node:fs/promises");
fs.readFileSync = readBoundLab;
fsPromises.readFile = async (target, options) => readBoundLab(target, options);

const originalNextTick = process.nextTick;
const originalFatalException = process._fatalException;
const originalCwd = process.cwd;
function controlledAuditExit(code) {
  const requested = code === undefined ? Number(process.exitCode ?? 0) : Number(code);
  if (!Number.isInteger(requested) || requested < 0 || requested > 255) {
    throw new Error("signature audit capsule rejected an invalid exit status");
  }
  process.exitCode = requested;
  if (requested !== 0) {
    throw new Error("signature audit requested a nonzero exit status");
  }
}
replaceUnboundCallableExports(process,
  new Set(["_fatalException", "cwd", "exit", "nextTick"]),
  denyUnboundBuiltinAcquisition, "process");
process.exit = controlledAuditExit;

function assertCallableSurfaceConfined(target, allowed, denial, label) {
  for (const name of Reflect.ownKeys(target)) {
    const value = Object.getOwnPropertyDescriptor(target, name)?.value;
    if (typeof value !== "function") continue;
    const expected = allowed.get(name) ?? denial;
    if (value !== expected) {
      throw new Error(label + " callable " + String(name) + " escaped confinement");
    }
  }
}

assertCallableSurfaceConfined(fs, new Map([["readFileSync", readBoundLab]]),
  denyUnboundFileSystemAccess, "node:fs");
assertCallableSurfaceConfined(fsPromises,
  new Map([["readFile", fsPromises.readFile]]), denyUnboundFileSystemAccess,
  "node:fs/promises");
assertCallableSurfaceConfined(process,
  new Map([
    ["_fatalException", originalFatalException],
    ["cwd", originalCwd],
    ["exit", controlledAuditExit],
    ["nextTick", originalNextTick],
  ]),
  denyUnboundBuiltinAcquisition, "process");
syncBuiltinESMExports();

const auditUrl = pathToFileURL(auditVirtualPath).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === auditUrl) return { url: auditUrl, shortCircuit: true };
    if (ALLOWED_AUDIT_MODULE_SPECIFIERS.has(specifier) ||
        specifier.startsWith(ALLOWED_DATA_MODULE_PREFIX)) {
      return nextResolve(specifier, context);
    }
    throw new Error("signature audit capsule rejected an undeclared module import");
  },
  load(url, context, nextLoad) {
    if (url === auditUrl) {
      return {
        format: "module",
        source: auditSource,
        shortCircuit: true,
      };
    }
    if (ALLOWED_AUDIT_MODULE_URLS.has(url) ||
        url.startsWith(ALLOWED_DATA_MODULE_PREFIX)) {
      return nextLoad(url, context);
    }
    throw new Error("signature audit capsule rejected an undeclared module load");
  },
});

await import(auditUrl);
if (expectedLabRead !== (auditLabReadCount > 0)) {
  throw new Error("signature audit capsule Lab-read contract drifted");
}
`;

export const EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SHA256 = createHash("sha256")
  .update(EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SOURCE)
  .digest("hex");

export function assertRootOwnedExecutableChain(nodePath) {
  if (typeof nodePath !== "string" || nodePath === "" ||
      !path.isAbsolute(nodePath) || path.normalize(nodePath) !== nodePath) {
    throw new Error("root-owned executable chain requires one normalized absolute path");
  }
  const executableRealPath = realpathSync(nodePath);
  if (executableRealPath !== nodePath) {
    throw new Error("root-owned executable chain cannot contain a symlink");
  }
  const executableStat = lstatSync(executableRealPath, { bigint: true });
  if (!executableStat.isFile() || executableStat.isSymbolicLink() ||
      executableStat.uid !== 0n || (executableStat.mode & 0o022n) !== 0n ||
      (executableStat.mode & 0o111n) === 0n || executableStat.nlink < 1n) {
    throw new Error("root-owned executable chain leaf is not an immutable executable");
  }

  const ancestors = [];
  for (let current = path.dirname(executableRealPath);;) {
    const currentRealPath = realpathSync(current);
    const currentStat = lstatSync(current, { bigint: true });
    if (currentRealPath !== current || !currentStat.isDirectory() ||
        currentStat.isSymbolicLink() || currentStat.uid !== 0n ||
        (currentStat.mode & 0o022n) !== 0n || currentStat.nlink < 1n) {
      throw new Error("root-owned executable chain contains a writable or unowned ancestor");
    }
    ancestors.push(Object.freeze({
      path: current,
      dev: currentStat.dev.toString(),
      ino: currentStat.ino.toString(),
      mode: Number(currentStat.mode & 0o7777n),
    }));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return Object.freeze({
    path: executableRealPath,
    dev: executableStat.dev.toString(),
    ino: executableStat.ino.toString(),
    mode: Number(executableStat.mode & 0o7777n),
    ancestors: Object.freeze(ancestors),
  });
}

function assertExecutionOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("bound signature audit options must be one object");
  }
  const expectedKeys = [
    "auditFd",
    "auditVirtualPath",
    "cwd",
    "environment",
    "expectedAuditSha256",
    "expectedLabRead",
    "expectedLabSha256",
    "labFd",
    "labVirtualPath",
    "nodePath",
  ];
  const actualKeys = Object.keys(options).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error("bound signature audit option schema drifted");
  }
  if (!Number.isSafeInteger(options.auditFd) || options.auditFd < 0 ||
      !Number.isSafeInteger(options.labFd) || options.labFd < 0 ||
      options.auditFd === options.labFd) {
    throw new Error("bound signature audit descriptors are invalid");
  }
  for (const [label, value] of [
    ["nodePath", options.nodePath],
    ["auditVirtualPath", options.auditVirtualPath],
    ["labVirtualPath", options.labVirtualPath],
    ["cwd", options.cwd],
  ]) {
    if (typeof value !== "string" || value === "") {
      throw new Error(`${label} must be one nonempty string`);
    }
  }
  if (typeof options.expectedLabRead !== "boolean" ||
      !/^[a-f0-9]{64}$/u.test(options.expectedAuditSha256) ||
      !/^[a-f0-9]{64}$/u.test(options.expectedLabSha256) ||
      options.environment === null || typeof options.environment !== "object" ||
      Array.isArray(options.environment)) {
    throw new Error("bound signature audit read/environment contract is invalid");
  }
}

export function exactBoundSignatureAuditArgv({
  nodePath,
  auditVirtualPath,
  labVirtualPath,
  expectedLabRead,
  expectedAuditSha256,
  expectedLabSha256,
}) {
  if (typeof nodePath !== "string" || nodePath === "" ||
      typeof auditVirtualPath !== "string" || auditVirtualPath === "" ||
      typeof labVirtualPath !== "string" || labVirtualPath === "" ||
      typeof expectedLabRead !== "boolean" ||
      !/^[a-f0-9]{64}$/u.test(expectedAuditSha256) ||
      !/^[a-f0-9]{64}$/u.test(expectedLabSha256)) {
    throw new Error("bound signature audit argv contract is invalid");
  }
  return Object.freeze([
    nodePath,
    "--input-type=module",
    "--eval",
    EXACT_BOUND_SIGNATURE_AUDIT_CAPSULE_SOURCE,
    auditVirtualPath,
    labVirtualPath,
    expectedLabRead ? "1" : "0",
    expectedAuditSha256,
    expectedLabSha256,
  ]);
}

export function runExactBoundSignatureAudit(options) {
  assertExecutionOptions(options);
  assertRootOwnedExecutableChain(options.nodePath);
  const [command, ...args] = exactBoundSignatureAuditArgv(options);
  try {
    return spawnSync(command, args, {
      cwd: options.cwd,
      env: options.environment,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe", options.auditFd, options.labFd],
    });
  } catch (error) {
    return {
      error,
      status: null,
      signal: null,
      stdout: Buffer.alloc(0),
      stderr: Buffer.alloc(0),
    };
  }
}
