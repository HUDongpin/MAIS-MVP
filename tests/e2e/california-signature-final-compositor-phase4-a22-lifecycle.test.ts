import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CALIFORNIA_PHASE4_A22_LIFECYCLE_SCHEMA_VERSION,
  CALIFORNIA_PHASE4_EXPECTED_RASTER_BLOCKER
} from "./california-signature-final-compositor-phase4-a22-lifecycle-contract";
import {
  publishCaliforniaPhase4A22DiagnosticLifecycle
} from "./california-signature-final-compositor-phase4-a22-lifecycle";
import {
  californiaSignatureFinalCompositorPhase4InternalSha256 as sha256,
  californiaSignatureFinalCompositorPhase4InternalStableJson as stableJson
} from "./california-signature-final-compositor-phase4-real-driver-internal";
import {
  californiaPhase4A22LifecycleTestFixture as fixture
} from "./california-signature-final-compositor-phase4-a22-lifecycle.test-fixture";

const WORKTREE = "/Volumes/Starship/MAIS-ca-viz-labs-wt";

test("A22 publishes one process-held diagnostic lifecycle with authorization false", async () => {
  const harness = fixture.createHarness();
  assert.equal(harness.publish.length, 0);
  const lease = await harness.publish();
  try {
    assert.equal(lease.formalExecutionAuthorized, false);
    assert.equal(lease.independentExpectedRasterAvailable, false);
    assert.equal(lease.publication.status, "diagnostic-a22-lifecycle-publication-v1");
    assert.equal(lease.publication.schemaVersion,
      CALIFORNIA_PHASE4_A22_LIFECYCLE_SCHEMA_VERSION);
    assert.equal(lease.publication.formalExecutionAuthorized, false);
    assert.equal(lease.publication.independentExpectedRasterAvailable, false);
    assert.equal(lease.publication.independentExpectedRasterBlocker,
      CALIFORNIA_PHASE4_EXPECTED_RASTER_BLOCKER);
    assert.equal(lease.publication.worktreeRoot, WORKTREE);
    const { publicationSha256, ...base } = lease.publication;
    assert.equal(publicationSha256, sha256(stableJson(base)));
    assert.equal(Object.isFrozen(lease.publication), true);
    assert.equal(await lease.checkpoint(), lease.publication);
    assert.deepEqual(harness.observations(), {
      checkpointCount: 6,
      cleanupCount: 0,
      directoryCreateCount: 1,
      heldEvidenceReadCount: 1,
      publicationWriteCount: 1
    });
  } finally {
    await lease.close();
    await lease.close();
  }
  assert.equal(harness.observations().cleanupCount, 1);
  await assert.rejects(() => lease.checkpoint(), /lease is closed/i);
});

test("production lifecycle publisher is zero-argument HOLD and has no importable authority seam",
async () => {
  assert.equal(publishCaliforniaPhase4A22DiagnosticLifecycle.length, 0);
  await assert.rejects(
    () => (publishCaliforniaPhase4A22DiagnosticLifecycle as unknown as
      (forged: unknown) => Promise<unknown>)({ receipt: "copied" }),
    /takes no caller-authored authority or receipt/i
  );
  await assert.rejects(
    () => publishCaliforniaPhase4A22DiagnosticLifecycle(),
    /HOLD.*formal execution authorization remains false/i
  );
  const productionPath = path.join(WORKTREE, "tests/e2e",
    "california-signature-final-compositor-phase4-a22-lifecycle.ts");
  const productionSource = readFileSync(productionPath, "utf8");
  assert.doesNotMatch(productionSource, /NODE_TEST_CONTEXT|Symbol\.for|globalThis|process\.env|argv/);
  const supportSpecifier =
    "california-signature-final-compositor-phase4-a22-lifecycle." + "test-support";
  assert.equal(productionSource.includes(supportSpecifier), false);
  const result = spawnSync("rg", [
    "-l", "--fixed-strings", supportSpecifier, "app", "components", "data", "lib", "scripts",
    "tests/e2e"
  ], { cwd: WORKTREE, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split(/\r?\n/), [
    "tests/e2e/california-signature-final-compositor-phase4-a22-lifecycle.test-fixture.ts"
  ]);
});

test("one branded A22 lifecycle publisher is one-shot and accepts no caller data", async () => {
  const harness = fixture.createHarness();
  await assert.rejects(
    () => (harness.publish as unknown as (value: unknown) => Promise<unknown>)({}),
    /takes no caller-authored authority/i
  );
  const second = fixture.createHarness();
  const lease = await second.publish();
  try {
    await assert.rejects(() => second.publish(), /one-shot/i);
  } finally {
    await lease.close();
  }
});

test("lifecycle rejects cloned, moved, linked, public, stale, and mutating held artifacts",
async (t) => {
  for (const [fault, pattern] of [
    ["clone-authority", /uncloneable in-process authority/i],
    ["directory-moved", /directory moved.*branding/i],
    ["directory-public", /directory.*mode 0700/i],
    ["directory-symlink", /directory traverses a symlink/i],
    ["evidence-hardlink", /must have one hard link/i],
    ["evidence-identity-drift", /changed while read/i],
    ["evidence-public", /must be mode 0400/i],
    ["evidence-symlink", /traverses a symlink/i],
    ["expired", /stale or expired/i],
    ["publication-byte-drift", /canonical publication bytes drifted/i],
    ["publication-identity-drift", /changed while read/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ fault });
      await assert.rejects(() => harness.publish(), pattern);
      assert.equal(harness.observations().cleanupCount, 1,
        `${fault}: A22 lifecycle failure did not clean up exactly once`);
    });
  }
});

test("lifecycle binds source, plan, build, server, Chrome, Sharp, env, and storage identities",
async (t) => {
  for (const [fault, pattern] of [
    ["accepted-build-drift", /production build identity drifted/i],
    ["browser-drift", /Chrome runtime identity drifted/i],
    ["dependency-drift", /dependency identity drifted/i],
    ["environment-drift", /producer identity drifted/i],
    ["plan-drift", /execution subset drifted|subset hash is not exactly derived/i],
    ["server-drift", /accepted server identity drifted/i],
    ["sharp-drift", /Sharp\/libvips identity drifted/i],
    ["source-drift", /source snapshot drifted/i],
    ["storage-drift", /storage-state identity drifted/i]
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ fault });
      await assert.rejects(() => harness.publish(), pattern);
      assert.equal(harness.observations().publicationWriteCount, 0,
        `${fault}: invalid lifecycle identity reached publication`);
      assert.equal(harness.observations().cleanupCount, 1,
        `${fault}: invalid lifecycle identity did not clean up`);
    });
  }
});

test("every awaited lifecycle boundary revalidates the held in-process authority", async () => {
  const harness = fixture.createHarness({ fault: "checkpoint-drift" });
  await assert.rejects(() => harness.publish(), /held lifecycle checkpoint drifted/i);
  assert.equal(harness.observations().directoryCreateCount, 1);
  assert.equal(harness.observations().heldEvidenceReadCount, 0);
  assert.equal(harness.observations().publicationWriteCount, 0);
  assert.equal(harness.observations().cleanupCount, 1);
});

test("every post-acquisition checkpoint revalidates held directory dev, ino, and realpath",
async (t) => {
  for (const fault of [
    "directory-device-drift-after-acquisition",
    "directory-inode-replacement-after-acquisition",
    "directory-realpath-replacement-after-acquisition"
  ] as const) {
    await t.test(fault, async () => {
      const harness = fixture.createHarness({ fault });
      let lease: Awaited<ReturnType<typeof harness.publish>> | undefined;
      try {
        await assert.rejects(async () => {
          lease = await harness.publish();
        }, /held lifecycle directory identity drifted/i);
      } finally {
        await lease?.close();
      }
      assert.deepEqual(harness.observations(), {
        checkpointCount: 2,
        cleanupCount: 1,
        directoryCreateCount: 1,
        heldEvidenceReadCount: 0,
        publicationWriteCount: 0
      });
    });
  }
});
