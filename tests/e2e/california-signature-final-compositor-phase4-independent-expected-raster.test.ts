import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT
} from "./california-signature-final-compositor-phase4-independent-expected-raster-contract";
import {
  californiaPhase4IndependentExpectedRasterAvailability,
  readCaliforniaPhase4IndependentExpectedRaster
} from "./california-signature-final-compositor-phase4-independent-expected-raster";
import {
  californiaPhase4IndependentExpectedRasterTestFixture as fixture
} from "./california-signature-final-compositor-phase4-independent-expected-raster.test-fixture";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";

test("independent expected raster is an explicit zero-argument diagnostic HOLD", async () => {
  assert.deepEqual(californiaPhase4IndependentExpectedRasterAvailability, {
    blocker: "independent-reviewed-four-class-expected-raster-unavailable",
    classCount: CALIFORNIA_PHASE4_INDEPENDENT_EXPECTED_RASTER_CLASS_COUNT,
    formalExecutionAuthorized: false,
    independentExpectedRasterAvailable: false
  });
  assert.equal(Object.isFrozen(californiaPhase4IndependentExpectedRasterAvailability), true);
  assert.equal(readCaliforniaPhase4IndependentExpectedRaster.length, 0);
  await assert.rejects(
    () => (readCaliforniaPhase4IndependentExpectedRaster as unknown as
      (candidate: unknown) => Promise<unknown>)({ pixels: "same-page" }),
    /takes no caller-authored package/i
  );
  await assert.rejects(
    () => readCaliforniaPhase4IndependentExpectedRaster(),
    /HOLD.*separately rendered.*human-reviewed.*four-class.*unavailable.*authorization remains false/i
  );
  const harness = fixture.createHarness();
  assert.equal(harness.readReviewedPackage.length, 0);
  await assert.rejects(() => harness.readReviewedPackage(),
    /independent reviewed four-class expected raster is unavailable/i);
});

test.todo(
  "independent raster reader accepts four exact class rasters only after a separate renderer and human review publish them"
);

test("independent raster package rejects provenance, freshness, manifest, and target attacks",
async (t) => {
  for (const [attack, pattern] of [
    ["clone-package", /uncloneable package provenance/i],
    ["moved-package", /package was cloned or moved/i],
    ["directory-symlink", /directory traverses a symlink/i],
    ["manifest-symlink", /manifest.*traverses a symlink/i],
    ["stale-package", /package is stale or expired/i],
    ["manifest-hash-drift", /manifest hash drifted/i],
    ["noncanonical-manifest", /manifest is not canonical JSON bytes/i],
    ["missing-class", /requires exactly four class entries|lost or gained a class entry/i],
    ["extra-class", /requires exactly four class entries|lost or gained a class entry/i],
    ["duplicate-class", /contains a duplicate class/i],
    ["order-drift", /class order drifted/i],
    ["dimension-drift", /dimensions drifted/i],
    ["wrong-renderer-origin", /same-page Canvas readback/i]
  ] as const) {
    await t.test(attack, async () => {
      const harness = fixture.createHarness();
      await assert.rejects(() => harness.rejectAttack(attack), pattern);
      assert.equal(harness.observations().cleanupCount, 1,
        `${attack}: rejected raster package did not clean up exactly once`);
    });
  }
});

test("independent raster package rejects pixel hash, zero-fill, false-zero, and symlink attacks",
async (t) => {
  for (const [attack, pattern] of [
    ["pixel-hash-drift", /pixel hash drifted/i],
    ["all-zero-pixels", /cannot be all-zero pixels/i],
    ["false-zero-audit", /false-zero audit has unequal pixel hashes/i],
    ["raster-symlink", /\.rgba.*traverses a symlink/i]
  ] as const) {
    await t.test(attack, async () => {
      const harness = fixture.createHarness();
      await assert.rejects(() => harness.rejectAttack(attack), pattern);
      assert.equal(harness.observations().cleanupCount, 1,
        `${attack}: rejected pixel package did not clean up exactly once`);
      assert.ok(harness.observations().rasterReadCount > 0,
        `${attack}: pixel attack was not checked against held raster bytes`);
    });
  }
});

test("ordinary imports expose no same-page, Canvas, screenshot, or test-support raster bridge", () => {
  const productionPath = path.join(WORKTREE, "tests/e2e",
    "california-signature-final-compositor-phase4-independent-expected-raster.ts");
  const productionSource = readFileSync(productionPath, "utf8");
  assert.doesNotMatch(productionSource,
    /getImageData|toDataURL|canvas\.toBlob|page\.screenshot|captureMaximumEnvelope|globalThis|Symbol\.for/);
  const supportSpecifier =
    "california-signature-final-compositor-phase4-independent-expected-raster." + "test-support";
  assert.equal(productionSource.includes(supportSpecifier), false);
  const result = spawnSync("rg", [
    "-l", "--fixed-strings", supportSpecifier, "app", "components", "data", "lib", "scripts",
    "tests/e2e"
  ], { cwd: WORKTREE, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/), [
    "tests/e2e/california-signature-final-compositor-phase4-independent-expected-raster.test-fixture.ts"
  ]);
});

