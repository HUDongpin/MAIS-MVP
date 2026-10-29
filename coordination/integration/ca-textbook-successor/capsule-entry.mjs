// Internal entrypoint of a newly owned, byte-verified code capsule.
import { readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { syncBuiltinESMExports } from "node:module";
import { parse, hash, need } from "./common.mjs";
import { validateSchema } from "./schema.mjs";
import { verifyCapsuleTree, TYPESCRIPT_ENTRY } from "./capsule.mjs";
const codeRoot = realpathSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."),
);
let dependencyResolution = null;
try {
  need(
    !process.env.NODE_OPTIONS &&
      !process.env.NODE_PATH &&
      process.execArgv.length === 0,
    "CA_CAPSULE_LOADER_HOOK",
  );
  const [descriptorPath, expectedHash] = process.argv.slice(2);
  need(
    descriptorPath === path.join(codeRoot, "capsule.json") &&
      /^[a-f0-9]{64}$/.test(expectedHash ?? ""),
    "CA_CAPSULE_ARGUMENT",
  );
  const bytes = readFileSync(descriptorPath);
  need(hash(bytes) === expectedHash, "CA_CAPSULE_DESCRIPTOR");
  const descriptor = parse(bytes),
    verified = verifyCapsuleTree(codeRoot, descriptor, expectedHash);
  const inputBytes = readFileSync(path.join(codeRoot, descriptor.input.path));
  need(hash(inputBytes) === descriptor.input.sha256, "CA_CAPSULE_INPUT");
  const request = parse(inputBytes);
  validateSchema("manifest", request.manifest);
  need(
    request.executionCommit === descriptor.executionCommit &&
      request.manifest.checkerReleaseCommit ===
        descriptor.checkerReleaseCommit &&
      request.manifest.checkerBundleDigest === descriptor.checkerBundleDigest,
    "CA_CAPSULE_REQUEST",
  );
  const blocked = () => {
    throw new Error("CA_NETWORK_FORBIDDEN");
  };
  globalThis.fetch = blocked;
  net.Socket.prototype.connect = blocked;
  http.request = blocked;
  https.request = blocked;
  dns.lookup = blocked;
  syncBuiltinESMExports();
  // This exact file specifier is shared by the observer and its checked-in derivative.
  // Package names, exports, self-reference and NODE_PATH cannot select another parser.
  const resolved = import.meta
    .resolve("../../../node_modules/typescript/lib/typescript.js");
  need(resolved === verified.entryUrl, "CA_DEPENDENCY_RESOLUTION");
  const loaded = await import(resolved);
  need(
    loaded.default.version === descriptor.dependency.version &&
      loaded.default.version === "5.8.3",
    "CA_DEPENDENCY_VERSION",
  );
  dependencyResolution = {
    schemaVersion: "ca-dependency-resolution.v1",
    strategy: "explicit-captured-file-url",
    entryRelativePath: TYPESCRIPT_ENTRY,
    entrySha256: verified.entrySha256,
    dependencyTreeDigest: descriptor.dependency.treeDigest,
    version: loaded.default.version,
    checkerReleaseCommit: descriptor.checkerReleaseCommit,
    checkerBundleDigest: descriptor.checkerBundleDigest,
    entryExecuted: true,
    sourceSnapshotExecuted: false,
    codeAndDataSeparated: true,
  };
  const { observeSnapshot } = await import("./observer.mjs");
  const result = await observeSnapshot(descriptor.snapshotRoot, request);
  verifyCapsuleTree(codeRoot, descriptor, expectedHash);
  process.stdout.write(
    JSON.stringify({ ...result, dependencyResolution, liveAllowed: false }) +
      "\n",
  );
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      result: "blocked",
      code: /^CA_[A-Z_]+$/.test(error.code ?? error.message ?? "")
        ? (error.code ?? error.message)
        : "CA_OBSERVER_FAILED",
      dependencyResolution,
      liveAllowed: false,
    }) + "\n",
  );
  process.exitCode = 2;
}
