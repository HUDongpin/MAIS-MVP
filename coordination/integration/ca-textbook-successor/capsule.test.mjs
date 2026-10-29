import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { registeredFixture } from "./test-fixtures.mjs";
import { validatePhase, authenticateRelease } from "./contract.mjs";
import { observe } from "./runtime.mjs";
import { dependency, GIT_ENV } from "./repository.mjs";
import { hash, parse } from "./common.mjs";
import { ROOT } from "./constants.mjs";

test("registered synthetic phase and release baseline remain valid", () =>
  registeredFixture((f) => {
    f.repo.clean();
    assert.equal(validatePhase(f.repo, f.m, f.manifestPath), f.execution);
    assert.equal(authenticateRelease(f.repo, f.m).bundleDigest, f.bundleDigest);
  }));
for (const attack of ["nested", "self-reference"]) {
  test(
    "A11-CA-V2-01 phase rejects tracked " + attack + " evidence payload",
    () =>
      registeredFixture(
        (f) =>
          assert.throws(
            () => validatePhase(f.repo, f.m, f.manifestPath),
            /CA_EVIDENCE_SCOPE|CA_EVIDENCE_PATH/,
          ),
        { trackedAttack: attack },
      ),
  );
  test(
    "A11-CA-V2-01 release authentication rejects tracked " +
      attack +
      " evidence payload",
    () =>
      registeredFixture(
        (f) =>
          assert.throws(
            () => authenticateRelease(f.repo, f.m),
            /CA_EVIDENCE_SCOPE|CA_EVIDENCE_PATH/,
          ),
        { trackedAttack: attack },
      ),
  );
  test(
    "A11-CA-V2-01 actual phase/auth/observer chain never executes " +
      attack +
      " marker",
    () =>
      registeredFixture(
        async (f) => {
          try {
            validatePhase(f.repo, f.m, f.manifestPath);
            authenticateRelease(f.repo, f.m);
            await observe(
              f.repo,
              f.m,
              f.registry,
              f.ledger.dependencies[0],
              f.candidate,
            );
          } catch {}
          assert.equal(
            existsSync(f.marker),
            false,
            "Unreviewed resolver wrapper executed before rejection",
          );
        },
        { trackedAttack: attack, realTypescript: true },
      ),
  );
}
for (const attack of [null, "nested", "self-reference"])
  test(
    "captured observer measures exact dependency despite " +
      (attack ?? "no") +
      " ignored local metadata",
    () =>
      registeredFixture(
        async (f) => {
          f.repo.clean();
          assert.equal(validatePhase(f.repo, f.m, f.manifestPath), f.execution);
          authenticateRelease(f.repo, f.m);
          const capsulePath = new URL("./capsule.mjs", import.meta.url);
          assert.ok(
            existsSync(fileURLToPath(capsulePath)),
            "Separate code capsule must be implemented",
          );
          const { runCapturedObserver } = await import(capsulePath);
          const result = await runCapturedObserver(
            f.repo,
            f.m,
            f.registry,
            f.ledger.dependencies[0],
          );
          assert.equal(existsSync(f.marker), false);
          assert.equal(result.dependencyResolution.entryExecuted, true);
          assert.equal(result.dependencyResolution.version, "5.8.3");
          assert.equal(
            result.dependencyResolution.entrySha256,
            hash(
              readFileSync(
                f.root + "/node_modules/typescript/lib/typescript.js",
              ),
            ),
          );
          assert.equal(
            result.dependencyResolution.dependencyTreeDigest,
            dependency(f.root).binding.treeDigest,
          );
          assert.equal(
            result.dependencyResolution.sourceSnapshotExecuted,
            false,
          );
          assert.equal(result.dependencyResolution.codeAndDataSeparated, true);
        },
        { ignoredAttack: attack, realTypescript: true },
      ),
  );

for (const [option, code] of [
  ["sourcePayload", "CA_SOURCE_NAMESPACE"],
  ["releasePayload", "CA_RELEASE_SCOPE"],
  ["declaredPayload", "CA_EVIDENCE_PATH"],
])
  test(
    "exact phase inventory rejects " +
      option +
      " even when namespace/reference looks local",
    () =>
      registeredFixture(
        (f) => {
          assert.throws(
            () => validatePhase(f.repo, f.m, f.manifestPath),
            new RegExp(code),
          );
          assert.throws(
            () => authenticateRelease(f.repo, f.m),
            new RegExp(code),
          );
        },
        { [option]: true },
      ),
  );
test("registered execution never accepts a stored-head bypass flag", () =>
  registeredFixture((f) =>
    assert.throws(
      () => validatePhase(f.repo, f.m, f.manifestPath, { stored: true }),
      /CA_EXECUTION_CHECKOUT/,
    ),
  ));
test("both parser consumers use the captured file specifier, never package-name resolution", () => {
  for (const name of ["observer.mjs", "canonical-observer-ca-v1.mjs"]) {
    const source = readFileSync(new URL("./" + name, import.meta.url), "utf8");
    assert.match(
      source,
      /\.\.\/\.\.\/\.\.\/node_modules\/typescript\/lib\/typescript\.js/u,
    );
    assert.doesNotMatch(source, /(?:from\s*|import\(\s*)["']typescript["']/u);
  }
});

for (const attack of ["nested", "self-reference"])
  test(
    "capsule entry rejects unexpected " +
      attack +
      " metadata before any parser import",
    () =>
      registeredFixture(
        (f) => {
          validatePhase(f.repo, f.m, f.manifestPath);
          authenticateRelease(f.repo, f.m);
          const codeRoot = realpathSync(mkdtempSync("/tmp/ca-capsule-tamper-"));
          try {
            const write = (file, bytes, mode = "100644") => {
              mkdirSync(path.dirname(path.join(codeRoot, file)), {
                recursive: true,
              });
              writeFileSync(path.join(codeRoot, file), bytes, {
                mode: mode === "100755" ? 0o700 : 0o600,
              });
            };
            for (const binding of f.ledger.files) {
              const file = f.repo.read(f.release, binding);
              write(file.path, file.bytes, file.mode);
            }
            const dep = dependency(f.root);
            for (const file of dep.files)
              write(
                "node_modules/typescript/" + file.path,
                file.bytes,
                file.mode,
              );
            const request = Buffer.from(
              JSON.stringify({
                manifest: f.m,
                registry: f.registry,
                executionCommit: f.execution,
              }),
            );
            write("observer-input.json", request);
            const descriptor = {
              schemaVersion: "ca-code-capsule.v1",
              snapshotRoot: f.root,
              executionCommit: f.execution,
              checkerReleaseCommit: f.release,
              checkerBundleDigest: f.bundleDigest,
              files: f.ledger.files,
              dependency: dep.binding,
              dependencyFiles: dep.files.map(({ bytes, ...row }) => row),
              input: { path: "observer-input.json", sha256: hash(request) },
            };
            const raw = Buffer.from(JSON.stringify(descriptor));
            write("capsule.json", raw);
            const wrapper =
              'import {writeFileSync} from "node:fs";writeFileSync(' +
              JSON.stringify(f.marker) +
              ',"unreviewed");export default {};';
            if (attack === "nested") {
              write(
                ROOT + "/node_modules/typescript/package.json",
                JSON.stringify({
                  name: "typescript",
                  type: "module",
                  main: "index.js",
                }),
              );
              write(ROOT + "/node_modules/typescript/index.js", wrapper);
            } else {
              write(
                ROOT + "/package.json",
                JSON.stringify({
                  name: "typescript",
                  type: "module",
                  exports: "./shadow-parser.mjs",
                }),
              );
              write(ROOT + "/shadow-parser.mjs", wrapper);
            }
            const child = spawnSync(
              process.execPath,
              [
                path.join(codeRoot, ROOT, "capsule-entry.mjs"),
                path.join(codeRoot, "capsule.json"),
                hash(raw),
              ],
              { cwd: codeRoot, env: GIT_ENV, encoding: "utf8" },
            );
            assert.equal(child.status, 2);
            const result = parse(Buffer.from(child.stdout));
            assert.equal(result.code, "CA_CAPSULE_SCOPE");
            assert.equal(result.dependencyResolution, null);
            assert.equal(existsSync(f.marker), false);
          } finally {
            rmSync(codeRoot, { recursive: true, force: true });
          }
        },
        { realTypescript: true },
      ),
  );
