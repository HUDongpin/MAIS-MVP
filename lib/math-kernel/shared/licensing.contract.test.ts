import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

function repositoryFile(path: string): Buffer {
  return readFileSync(resolve(process.cwd(), path));
}

function sha256(path: string): string {
  return createHash("sha256").update(repositoryFile(path)).digest("hex");
}

test("public Edulab Apache-2.0 license and notice are byte-identical preserved copies", () => {
  for (const [source, published] of [
    ["third_party/edulab/LICENSE", "public/third-party/edulab/LICENSE.txt"],
    ["third_party/edulab/NOTICE", "public/third-party/edulab/NOTICE.txt"],
  ] as const) {
    assert.deepEqual(repositoryFile(published), repositoryFile(source));
  }
  assert.equal(
    sha256("third_party/edulab/LICENSE"),
    "26521cea181aa48ce3cacab5710d2047fb0e6d82b319f043fcc33615cf0dc5fe",
  );
  assert.equal(
    sha256("third_party/edulab/NOTICE"),
    "cb891d5f4642fb111ba36c928f006f03f6a5b594941c71e3b29f2b85230a62ea",
  );
});

test("server-only CAS and transitive complex licenses match the installed pinned packages", () => {
  assert.equal(
    sha256("third_party/cortex-js-compute-engine/LICENSE"),
    "f9270498fcb583f1a8aa4664e1986910d005303ff9c5cbab432bb4d1f292f225",
  );
  assert.equal(
    sha256("third_party/complex-esm/LICENSE"),
    "5bce81708ac83821fc48be1e97d89a5c8e733632ddb375d2c7101fb60dbfe6b2",
  );
  assert.deepEqual(
    repositoryFile("third_party/cortex-js-compute-engine/LICENSE"),
    repositoryFile("node_modules/@cortex-js/compute-engine/LICENSE"),
  );
  assert.deepEqual(
    repositoryFile("third_party/complex-esm/LICENSE"),
    repositoryFile("node_modules/complex-esm/LICENSE"),
  );
});

test("package and lock contracts keep CAS dependencies at the reviewed exact versions", () => {
  const packageJson = JSON.parse(repositoryFile("package.json").toString("utf8")) as {
    dependencies: Record<string, string>;
  };
  const lock = JSON.parse(repositoryFile("package-lock.json").toString("utf8")) as {
    packages: Record<string, { version?: string; integrity?: string }>;
  };
  assert.equal(packageJson.dependencies["@cortex-js/compute-engine"], "0.118.1");
  assert.equal(packageJson.dependencies["server-only"], "0.0.1");
  assert.equal(lock.packages["node_modules/@cortex-js/compute-engine"].version, "0.118.1");
  assert.equal(lock.packages["node_modules/complex-esm"].version, "2.1.1-esm1");
  assert.equal(lock.packages["node_modules/server-only"].version, "0.0.1");
  for (const path of [
    "node_modules/@cortex-js/compute-engine",
    "node_modules/complex-esm",
    "node_modules/server-only",
  ]) {
    assert.match(lock.packages[path].integrity ?? "", /^sha512-/);
  }
});
