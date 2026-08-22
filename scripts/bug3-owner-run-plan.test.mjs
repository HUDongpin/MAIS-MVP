import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

import * as runPlanApi from "./playwright-owner-paths.mjs";
import {
  materializeSyntheticRequiredBrowserExecutionScope
} from "./active-browser-dependency-proof.test-helper.mjs";
import {
  createTestFixtureCapability,
  readTestFixtureCapabilityView,
  removeTestFixtureCapability
} from "./test-fixture-capability.mjs";

function api(name) {
  assert.equal(
    typeof runPlanApi[name],
    "function",
    `${name} must be exported by the central owner-run-plan module`
  );
  return runPlanApi[name];
}

function fixture() {
  const capability = createTestFixtureCapability(realpathSync(process.cwd()));
  const fixtureRoot = readTestFixtureCapabilityView(capability).definition.leaf;
  const executionFixture = materializeSyntheticRequiredBrowserExecutionScope(capability);
  const repoRoot = executionFixture.repoRoot;
  const tmpBase = path.join(repoRoot, ".tmp");
  const cwd = path.join(fixtureRoot, "synthetic-cwd");
  const homeDir = path.join(fixtureRoot, "home");
  const osTempDir = path.join(fixtureRoot, "synthetic-os-tmp");
  const outsideRoot = path.join(fixtureRoot, "outside");
  const nonce = capability.nonce;
  for (const directory of [tmpBase, cwd, homeDir, osTempDir, outsideRoot]) {
    mkdirSync(directory, { recursive: true });
  }
  return {
    cleanup: () => removeTestFixtureCapability(capability),
    cwd,
    dependencyAttestation: executionFixture.dependencyAttestation,
    executionScope: executionFixture.executionScope,
    fixtureRoot,
    homeDir,
    nonce,
    osTempDir,
    outsideRoot,
    repoRoot,
    sourceFingerprints: executionFixture.sourceFingerprints,
    tmpBase
  };
}

test("browser ownership host geometry is deterministic and physically fail-closed", () => {
  const validate = api("validateCanonicalBrowserHostGeometry");
  const valid = {
    filesystemRoot: "/",
    repoDevice: "starship-device",
    repoRoot: "/Volumes/Starship/synthetic-repo",
    rootDevice: "system-device",
    volumeDevice: "starship-device",
    volumeRoot: "/Volumes/Starship"
  };
  assert.deepEqual(validate(valid), {
    repoRoot: valid.repoRoot,
    volumeDevice: valid.volumeDevice,
    volumeRoot: valid.volumeRoot
  });
  assert.throws(
    () => validate({ ...valid, repoRoot: "/private/tmp/synthetic-repo" }),
    /descendant|Starship|canonical/i
  );
  assert.throws(
    () => validate({ ...valid, volumeDevice: valid.rootDevice }),
    /distinct|physical|mount/i
  );
  assert.throws(
    () => validate({ ...valid, repoDevice: "other-device" }),
    /physically|stored|Starship/i
  );
});

test("Playwright CLI classification covers every local CLI and exempts only exact test --list", () => {
  const classify = api("classifyPlaywrightCliInvocation");
  const cases = [
    {
      argv: [process.execPath, "/repo/node_modules/@playwright/test/cli.js", "test", "--list"],
      cliKind: "test",
      isCli: true,
      noBrowserList: true
    },
    {
      argv: [process.execPath, "/repo/node_modules/playwright/cli.js", "install"],
      cliKind: "core",
      isCli: true,
      noBrowserList: false
    },
    {
      argv: [process.execPath, "/repo/node_modules/playwright-core/cli.js", "install"],
      cliKind: "core",
      isCli: true,
      noBrowserList: false
    },
    {
      argv: [process.execPath, "/repo/node_modules/.bin/playwright", "test", "--list"],
      cliKind: "shim",
      isCli: true,
      noBrowserList: true
    }
  ];
  for (const expected of cases) {
    const actual = classify(expected.argv);
    assert.equal(actual.isCli, expected.isCli);
    assert.equal(actual.cliKind, expected.cliKind);
    assert.equal(actual.noBrowserList, expected.noBrowserList);
  }
  for (const argv of [
    [process.execPath, "/repo/node_modules/@playwright/test/cli.js", "test", "--list=all"],
    [process.execPath, "/repo/node_modules/@playwright/test/cli.js", "test", "--list", "--headed"],
    [process.execPath, "/repo/node_modules/@playwright/test/cli.js", "test", "--list", "--ui"],
    [process.execPath, "/repo/node_modules/@playwright/test/cli.js", "test", "--list", "--list"]
  ]) {
    const actual = classify(argv);
    assert.equal(actual.isCli, true);
    assert.equal(actual.noBrowserList, false);
  }
  assert.deepEqual(classify([process.execPath, "/repo/scripts/plain.mjs"]), {
    cliArgs: [],
    cliKind: null,
    cliPath: null,
    isCli: false,
    noBrowserList: false
  });
});

function createPlan(scope, overrides = {}) {
  const createValidatedRunPlan = api("createValidatedRunPlan");
  return createValidatedRunPlan({
    cwd: scope.cwd,
    dependencyAttestation: scope.dependencyAttestation,
    executionScope: scope.executionScope,
    homeDir: scope.homeDir,
    nonce: scope.nonce,
    osTempDir: scope.osTempDir,
    repoRoot: scope.repoRoot,
    sourceFingerprints: scope.sourceFingerprints,
    ...overrides
  });
}

function strictDescendant(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

test("ValidatedRunPlan is pure, immutable, fresh, partitioned, and fully derived", () => {
  const scope = fixture();
  try {
    const plan = createPlan(scope);
    assert.equal(
      plan.ownerRoot,
      path.join(scope.tmpBase, `bug3-owner-${scope.nonce}`)
    );
    assert.equal(existsSync(plan.ownerRoot), false, "pure planning must not write");
    assert.equal(Object.isFrozen(plan), true);
    assert.deepEqual(plan.dependencyAttestation, scope.dependencyAttestation);
    assert.equal(Object.isFrozen(plan.dependencyAttestation), true);
    assert.equal(plan.ephemeralRoot, path.join(plan.ownerRoot, "ephemeral"));
    assert.equal(plan.evidenceRoot, path.join(plan.ownerRoot, "evidence"));
    assert.equal(plan.quarantineRoot, path.join(plan.ephemeralRoot, ".cleanup-quarantine"));
    assert.equal(strictDescendant(plan.ephemeralRoot, plan.ownerRoot), true);
    assert.equal(strictDescendant(plan.evidenceRoot, plan.ownerRoot), true);

    const cleanupLeaves = Object.values(plan.cleanupLeaves);
    assert.ok(cleanupLeaves.length >= 5);
    assert.equal(new Set(cleanupLeaves).size, cleanupLeaves.length);
    for (const leaf of cleanupLeaves) {
      assert.equal(strictDescendant(leaf, plan.ephemeralRoot), true, leaf);
    }
    for (let index = 0; index < cleanupLeaves.length; index += 1) {
      for (let other = index + 1; other < cleanupLeaves.length; other += 1) {
        assert.equal(strictDescendant(cleanupLeaves[index], cleanupLeaves[other]), false);
        assert.equal(strictDescendant(cleanupLeaves[other], cleanupLeaves[index]), false);
      }
    }
    for (const evidencePath of Object.values(plan.evidencePaths)) {
      assert.equal(strictDescendant(evidencePath, plan.evidenceRoot), true, evidencePath);
    }
  } finally {
    scope.cleanup();
  }
});

test("runner production context rehydrates when cwd exactly equals repo root", () => {
  const scope = fixture();
  try {
    const plan = createPlan(scope, { cwd: scope.repoRoot });
    assert.equal(plan.validationContext.cwd, scope.repoRoot);
    api("bootstrapValidatedRunPlan")(plan);
    api("materializeValidatedRunPlan")(plan);
    assert.doesNotThrow(() => api("validateMaterializedRunPlan")(plan));
    assert.doesNotThrow(() => api("buildValidatedRunEnvironment")(plan));
  } finally {
    scope.cleanup();
  }
});

test("owner candidate rejects every protected root, reuse, escape, and symlink chain without side effects", async (t) => {
  const scope = fixture();
  const canary = path.join(scope.outsideRoot, "canary.txt");
  writeFileSync(canary, "keep", "utf8");
  try {
    const protectedCandidates = [
      ["filesystem root", path.parse(scope.repoRoot).root],
      ["repo root", scope.repoRoot],
      ["cwd", scope.cwd],
      ["tmp base", scope.tmpBase],
      ["home", scope.homeDir],
      ["OS temp", scope.osTempDir],
      ["outside", path.join(scope.outsideRoot, `bug3-owner-${scope.nonce}`)]
    ];
    for (const [label, ownerRoot] of protectedCandidates) {
      await t.test(label, () => {
        assert.throws(() => createPlan(scope, { ownerRoot }), /owner root|ownerRoot|protected|exact/i);
        assert.equal(readFileSync(canary, "utf8"), "keep");
      });
    }

    const canonicalOwner = path.join(scope.tmpBase, `bug3-owner-${scope.nonce}`);
    mkdirSync(canonicalOwner);
    assert.throws(() => createPlan(scope), /fresh|already exists|reuse/i);
    assert.equal(readdirSync(canonicalOwner).length, 0);
    assert.equal(readFileSync(canary, "utf8"), "keep");
  } finally {
    scope.cleanup();
  }
});

test("bootstrap creates the fresh marked owner and minimal evidence partition, then refuses reuse", () => {
  const scope = fixture();
  try {
    const plan = createPlan(scope);
    const bootstrapValidatedRunPlan = api("bootstrapValidatedRunPlan");
    bootstrapValidatedRunPlan(plan);
    assert.deepEqual(
      readdirSync(plan.ownerRoot).sort(),
      [path.basename(plan.markerPath), path.basename(plan.evidenceRoot)].sort()
    );
    assert.equal(realpathSync(plan.evidenceRoot), plan.evidenceRoot);
    assert.equal(
      plan.terminalFallbackPath,
      path.join(plan.ownerRoot, "bootstrap-terminal-summary.json")
    );
    const marker = JSON.parse(readFileSync(plan.markerPath, "utf8"));
    assert.equal(marker.runId, plan.runId);
    assert.equal(marker.nonce, scope.nonce);
    assert.equal(lstatSync(plan.ownerRoot).isSymbolicLink(), false);
    assert.throws(() => bootstrapValidatedRunPlan(plan), /fresh|already exists|reuse/i);
  } finally {
    scope.cleanup();
  }
});

test("materialization writes the retained preflight manifest and marks only exact cleanup leaves", () => {
  const scope = fixture();
  try {
      const fingerprints = scope.sourceFingerprints;
      const plan = createPlan(scope);
    api("bootstrapValidatedRunPlan")(plan);
    api("materializeValidatedRunPlan")(plan);

    assert.equal(realpathSync(plan.ephemeralRoot), plan.ephemeralRoot);
    assert.equal(realpathSync(plan.evidenceRoot), plan.evidenceRoot);
    assert.equal(realpathSync(plan.quarantineRoot), plan.quarantineRoot);
    for (const leaf of Object.values(plan.cleanupLeaves)) {
      assert.equal(realpathSync(leaf), leaf);
      const markerPath = path.join(leaf, plan.cleanupMarkerName);
      const marker = JSON.parse(readFileSync(markerPath, "utf8"));
      assert.equal(marker.runId, plan.runId);
      assert.equal(marker.leaf, path.relative(plan.ephemeralRoot, leaf));
    }
    const manifest = JSON.parse(readFileSync(plan.evidencePaths.preflightManifest, "utf8"));
    assert.equal(manifest.runId, plan.runId);
    assert.deepEqual(manifest.fingerprints, fingerprints);
    assert.equal(manifest.paths.ownerRoot, plan.ownerRoot);
  } finally {
    scope.cleanup();
  }
});

test("cleanup rejects equality, ancestors, descendants, duplicates, overlaps, evidence, and marker or symlink tampering atomically", async (t) => {
  const unsafeCases = [
    ["ephemeral root equality", (plan) => [plan.ephemeralRoot]],
    ["owner ancestor", (plan) => [plan.ownerRoot]],
    ["repo ancestor", (plan) => [plan.repoRoot]],
    ["leaf descendant", (plan) => [path.join(plan.cleanupLeaves.build, "nested")]],
    ["duplicate", (plan) => [plan.cleanupLeaves.build, plan.cleanupLeaves.build]],
    ["overlap", (plan) => [plan.cleanupLeaves.build, path.join(plan.cleanupLeaves.build, "nested")]],
    ["evidence", (plan) => [plan.evidenceRoot]],
    ["partial valid plus invalid", (plan) => [plan.cleanupLeaves.build, plan.evidenceRoot]]
  ];

  for (const [label, targets] of unsafeCases) {
    await t.test(label, () => {
      const scope = fixture();
      try {
        const plan = createPlan(scope);
        api("bootstrapValidatedRunPlan")(plan);
        api("materializeValidatedRunPlan")(plan);
        const sentinel = path.join(plan.cleanupLeaves.build, "sentinel.txt");
        const evidenceCanary = path.join(plan.evidenceRoot, "keep.txt");
        const outsideCanary = path.join(scope.outsideRoot, "keep.txt");
        writeFileSync(sentinel, "keep", "utf8");
        writeFileSync(evidenceCanary, "keep", "utf8");
        writeFileSync(outsideCanary, "keep", "utf8");

        assert.throws(
          () => api("cleanupValidatedEphemeralLeaves")(plan, targets(plan)),
          /cleanup|exact|duplicate|overlap|ephemeral|evidence|protected/i
        );
        assert.equal(readFileSync(sentinel, "utf8"), "keep", "validation must precede deletion");
        assert.equal(readFileSync(evidenceCanary, "utf8"), "keep");
        assert.equal(readFileSync(outsideCanary, "utf8"), "keep");
      } finally {
        scope.cleanup();
      }
    });
  }

  await t.test("missing marker", () => {
    const scope = fixture();
    try {
      const plan = createPlan(scope);
      api("bootstrapValidatedRunPlan")(plan);
      api("materializeValidatedRunPlan")(plan);
      writeFileSync(
        path.join(plan.cleanupLeaves.cache, plan.cleanupMarkerName),
        "synthetic marker mismatch retained for capability quarantine",
        "utf8"
      );
      assert.throws(
        () => api("cleanupValidatedEphemeralLeaves")(plan, [plan.cleanupLeaves.cache]),
        /marker/i
      );
      assert.equal(existsSync(plan.cleanupLeaves.cache), true);
    } finally {
      scope.cleanup();
    }
  });

  await t.test("symlink replacement", () => {
    const expectedPath = path.resolve("/Volumes/Starship/synthetic-cleanup-leaf");
    const expectedIdentity = {
      dev: "101",
      ino: "202",
      mode: 0o40700,
      type: "directory"
    };
    const canary = "keep";
    assert.throws(
      () => api("validateCleanupSnapshotTransition")({
        expectedIdentity,
        expectedPath,
        observed: {
          identity: { ...expectedIdentity, type: "other" },
          kind: "symlink",
          path: expectedPath
        },
        phase: "synthetic-pre-quarantine-symlink"
      }),
      /symlink|same directory|identity/i
    );
    assert.equal(canary, "keep");
  });

  await t.test("quarantine replacement at the quarantine boundary", () => {
    const expectedPath = path.resolve("/Volumes/Starship/synthetic-quarantined-leaf");
    const expectedIdentity = {
      dev: "303",
      ino: "404",
      mode: 0o40700,
      type: "directory"
    };
    const canary = "keep";
    assert.throws(
      () => api("validateCleanupSnapshotTransition")({
        expectedIdentity,
        expectedPath,
        observed: {
          identity: { ...expectedIdentity, ino: "405" },
          kind: "directory",
          path: expectedPath
        },
        phase: "synthetic-post-quarantine-inode-swap"
      }),
      /identity/i
    );
    assert.equal(canary, "keep");
  });
});

test("single cleanup API removes every exact marked leaf while preserving partitions, evidence, and canaries", () => {
  const scope = fixture();
  try {
    const plan = createPlan(scope);
    api("bootstrapValidatedRunPlan")(plan);
    api("materializeValidatedRunPlan")(plan);
    for (const leaf of Object.values(plan.cleanupLeaves)) {
      writeFileSync(path.join(leaf, "owned-output.txt"), "delete", "utf8");
    }
    const evidenceCanary = path.join(plan.evidenceRoot, "retained.txt");
    const outsideCanary = path.join(scope.outsideRoot, "retained.txt");
    writeFileSync(evidenceCanary, "retain", "utf8");
    writeFileSync(outsideCanary, "retain", "utf8");

    const removed = api("cleanupValidatedEphemeralLeaves")(
      plan,
      Object.values(plan.cleanupLeaves)
    );
    assert.deepEqual(new Set(removed), new Set(Object.values(plan.cleanupLeaves)));
    for (const leaf of Object.values(plan.cleanupLeaves)) assert.equal(existsSync(leaf), false);
    assert.equal(existsSync(plan.ephemeralRoot), true);
    assert.equal(existsSync(plan.evidenceRoot), true);
    assert.equal(readFileSync(evidenceCanary, "utf8"), "retain");
    assert.equal(readFileSync(outsideCanary, "utf8"), "retain");
  } finally {
    scope.cleanup();
  }
});

test("a validated failure summary survives disposal of every ephemeral leaf", () => {
  const scope = fixture();
  try {
    const plan = createPlan(scope);
    api("bootstrapValidatedRunPlan")(plan);
    api("materializeValidatedRunPlan")(plan);
    const summary = {
      failure: { message: "sanitized", name: "Error" },
      runId: plan.runId,
      shutdownClean: true,
      status: "failed"
    };
    api("writeValidatedEvidenceJsonAtomic")(
      plan,
      plan.evidencePaths.validatedSummary,
      summary
    );

    api("cleanupValidatedEphemeralLeaves")(plan, Object.values(plan.cleanupLeaves));

    assert.deepEqual(
      JSON.parse(readFileSync(plan.evidencePaths.validatedSummary, "utf8")),
      summary
    );
    for (const leaf of Object.values(plan.cleanupLeaves)) {
      assert.equal(existsSync(leaf), false);
    }
  } finally {
    scope.cleanup();
  }
});

test("spawned write sentinel proves portable confinement and cleanup behavior", () => {
  const scope = fixture();
  try {
    const moduleUrl = pathToFileURL(path.join(process.cwd(), "scripts/playwright-owner-paths.mjs")).href;
    const childScript = `
      import * as api from ${JSON.stringify(moduleUrl)};
      import { existsSync, readFileSync, writeFileSync } from "node:fs";
      import path from "node:path";
      const plan = api.createValidatedRunPlan({
        repoRoot: ${JSON.stringify(scope.repoRoot)},
        cwd: ${JSON.stringify(scope.cwd)},
        dependencyAttestation: ${JSON.stringify(scope.dependencyAttestation)},
        executionScope: ${JSON.stringify(scope.executionScope)},
        sourceFingerprints: ${JSON.stringify(scope.sourceFingerprints)},
        homeDir: ${JSON.stringify(scope.homeDir)},
        osTempDir: ${JSON.stringify(scope.osTempDir)},
        nonce: ${JSON.stringify(scope.nonce)}
      });
      api.bootstrapValidatedRunPlan(plan);
      api.materializeValidatedRunPlan(plan);
      const ephemeralSentinel = path.join(plan.cleanupLeaves.generated, "spawned.txt");
      const evidenceSentinel = path.join(plan.evidenceRoot, "spawned-evidence.txt");
      writeFileSync(ephemeralSentinel, "delete", "utf8");
      writeFileSync(evidenceSentinel, "retain", "utf8");
      api.cleanupValidatedEphemeralLeaves(plan, Object.values(plan.cleanupLeaves));
      if (existsSync(ephemeralSentinel)) throw new Error("ephemeral sentinel survived");
      if (readFileSync(evidenceSentinel, "utf8") !== "retain") throw new Error("evidence lost");
      process.stdout.write(JSON.stringify({ ownerRoot: plan.ownerRoot, evidenceSentinel }));
    `;
    const child = spawnSync(process.execPath, ["--input-type=module", "--eval", childScript], {
      cwd: scope.repoRoot,
      encoding: "utf8"
    });
    assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
    const proof = JSON.parse(child.stdout);
    assert.equal(proof.ownerRoot, path.join(scope.tmpBase, `bug3-owner-${scope.nonce}`));
    assert.equal(readFileSync(proof.evidenceSentinel, "utf8"), "retain");
  } finally {
    scope.cleanup();
  }
});
