import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER,
  instrumentCaliforniaCanvasGraphicsStagingTree,
  instrumentCaliforniaCanvasGraphicsSourceText
} from "./california-canvas-graphics-instrumentation";
import {
  assertCaliforniaCanvasGraphicsSourceContractFrozen,
  buildCaliforniaCanvasGraphicsSourceContract
} from
  "./california-canvas-graphics-source-contract";

const realProjectRoot = process.cwd();
const contract = buildCaliforniaCanvasGraphicsSourceContract(realProjectRoot);
assertCaliforniaCanvasGraphicsSourceContractFrozen(contract);
const realSourceSnapshot = new Map(contract.sources.map((source) => [
  source.sourcePath,
  readFileSync(path.join(realProjectRoot, source.sourcePath))
]));

function assertSourceSnapshot(
  root: string,
  snapshot: ReadonlyMap<string, Buffer>,
  label: string
) {
  for (const [sourcePath, bytes] of snapshot) {
    assert.deepEqual(readFileSync(path.join(root, sourcePath)), bytes,
      `${label}/${sourcePath}: source bytes changed`);
  }
}

function makeCanvasStagingFixture(t: test.TestContext) {
  const fixtureRunRoot = mkdtempSync(path.join(tmpdir(), "ca-canvas-graphics-fixture-"));
  const productRoot = path.join(fixtureRunRoot, "product-fixture");
  const stagingRoot = path.join(fixtureRunRoot, "staging-fixture");
  const ancestorSymlinkCanaryRoot = path.join(fixtureRunRoot, "ancestor-symlink-canary");
  for (const root of [productRoot, stagingRoot, ancestorSymlinkCanaryRoot]) {
    mkdirSync(root, { recursive: true });
  }
  for (const source of contract.sources) {
    for (const destinationRoot of [productRoot, ancestorSymlinkCanaryRoot]) {
      const destination = path.join(destinationRoot, source.sourcePath);
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(path.join(realProjectRoot, source.sourcePath), destination);
      assert.deepEqual(readFileSync(destination), realSourceSnapshot.get(source.sourcePath),
        `${destination}: fixture source is not byte-exact`);
    }
  }
  const productContract = buildCaliforniaCanvasGraphicsSourceContract(productRoot);
  assertCaliforniaCanvasGraphicsSourceContractFrozen(productContract);
  assert.deepEqual(productContract, contract,
    "product fixture Canvas contract differs from the real read-only source");
  const productSnapshot = new Map(productContract.sources.map((source) => [
    source.sourcePath,
    readFileSync(path.join(productRoot, source.sourcePath))
  ]));
  t.after(() => {
    try {
      assertSourceSnapshot(realProjectRoot, realSourceSnapshot, "real project");
      assertSourceSnapshot(productRoot, productSnapshot, "product fixture");
    } finally {
      rmSync(fixtureRunRoot, { force: true, recursive: true });
    }
  });
  return { ancestorSymlinkCanaryRoot, productRoot, stagingRoot };
}

function sourceFor(benchId: string) {
  const identity = contract.sources.find((source) => source.benchId === benchId);
  if (!identity) throw new Error(`missing fixture source ${benchId}`);
  return {
    identity,
    source: readFileSync(identity.sourcePath, "utf8")
  };
}

test("all 186 staged sources receive exactly 190 context and 2,372 paint wrappers", () => {
  let animationCancellations = 0;
  let animationSchedules = 0;
  let contexts = 0;
  let paints = 0;
  for (const identity of contract.sources) {
    const result = instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: String(identity.benchId),
      contract,
      source: readFileSync(identity.sourcePath, "utf8"),
      sourcePath: identity.sourcePath
    });
    contexts += result.contextRegistrations;
    paints += result.paintInvocations;
    animationCancellations += result.animationCancellations;
    animationSchedules += result.animationSchedules;
    assert.match(result.source, new RegExp(CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER));
  }
  assert.equal(contexts, 190);
  assert.equal(paints, 2_372);
  assert.equal(animationSchedules, 150);
  assert.equal(animationCancellations, 96);
});

test("CountingLab maps every canonical source identity without trusting a forged count", () => {
  const { identity, source } = sourceFor("CountingLab");
  const expected = contract.paintSites.filter((site) => site.benchId === "CountingLab");
  const result = instrumentCaliforniaCanvasGraphicsSourceText({
    benchId: "CountingLab",
    contract,
    source,
    sourcePath: identity.sourcePath
  });
  assert.equal(result.contextRegistrations, 1);
  assert.equal(result.paintInvocations, expected.length);
  assert.deepEqual(result.sourceSiteKeys, expected.map((site) => site.sourceSiteKey));
  for (const key of result.sourceSiteKeys) assert.match(result.source, new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("a missing middle terminal site makes staging fail closed", () => {
  const { identity, source } = sourceFor("CountingLab");
  const missingMiddle = source.replace("ctx.fillRect(bx, by, tw + 24, 26);", "void bx;");
  assert.notEqual(missingMiddle, source);
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: "CountingLab",
      contract,
      source: missingMiddle,
      sourcePath: identity.sourcePath
    }),
    /paint-site coverage is not exact/
  );
});

test("an unknown Canvas API is rejected before instrumentation", () => {
  const { identity, source } = sourceFor("CountingLab");
  const unsupported = source.replace(
    "ctx.clearRect(0, 0, W, H);",
    "ctx.clearRect(0, 0, W, H); ctx.drawImage(image, 0, 0);"
  );
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: "CountingLab",
      contract,
      source: unsupported,
      sourcePath: identity.sourcePath
    }),
    /unsupported Canvas API drawImage/
  );
});

test("authored getImageData stays fail-closed while QA readback is not a source paint site", () => {
  const { identity, source } = sourceFor("CountingLab");
  const unsupported = source.replace(
    "ctx.clearRect(0, 0, W, H);",
    "ctx.clearRect(0, 0, W, H); ctx.getImageData(0, 0, 1, 1);"
  );
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: "CountingLab",
      contract,
      source: unsupported,
      sourcePath: identity.sourcePath
    }),
    /unsupported Canvas API getImageData/
  );
  assert.equal(contract.paintSites.length, 2_372);
  assert.equal(contract.paintSites.filter((site) => site.role === "essential").length, 2_370);
});

test("double instrumentation and a forged marker are rejected", () => {
  const { identity, source } = sourceFor("CountingLab");
  const first = instrumentCaliforniaCanvasGraphicsSourceText({
    benchId: "CountingLab",
    contract,
    source,
    sourcePath: identity.sourcePath
  });
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: "CountingLab",
      contract,
      source: first.source,
      sourcePath: identity.sourcePath
    }),
    /already instrumented/
  );
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsSourceText({
      benchId: "CountingLab",
      contract,
      source: `/* ${CALIFORNIA_CANVAS_GRAPHICS_INSTRUMENTATION_MARKER} */\n${source}`,
      sourcePath: identity.sourcePath
    }),
    /already instrumented/
  );
});

test("staging instrumentation rejects the project tree and an ancestor-symlink escape", (t) => {
  const { ancestorSymlinkCanaryRoot, productRoot, stagingRoot } = makeCanvasStagingFixture(t);
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsStagingTree({
      projectRoot: productRoot,
      stagingRoot: productRoot
    }),
    /project and staging roots overlap/
  );

  mkdirSync(path.join(stagingRoot, "components"), { recursive: true });
  symlinkSync(
    path.join(ancestorSymlinkCanaryRoot, "components", "visualizations"),
    path.join(stagingRoot, "components", "visualizations"),
    "dir"
  );
  assert.throws(
    () => instrumentCaliforniaCanvasGraphicsStagingTree({
      projectRoot: productRoot,
      stagingRoot
    }),
    /staging source escapes its root/
  );
  assertSourceSnapshot(realProjectRoot, realSourceSnapshot, "real project");
});
