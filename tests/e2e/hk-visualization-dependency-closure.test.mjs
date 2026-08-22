import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import * as dependencyClosureModule from "./hk-visualization-dependency-closure.mjs";
import {
  HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_IMPLEMENTATION_SOURCE_SHA256,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_POLICY,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA,
  HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA,
  assertHkVisualizationDependencyClosure,
  assertHkVisualizationDependencyClosureUnchanged,
  buildHkVisualizationDependencyClosureSummaryReceipt,
  captureHkVisualizationDependencyClosure,
  compareHkVisualizationDependencyClosures,
  validateHkVisualizationDependencyClosure,
} from "./hk-visualization-dependency-closure.mjs";

const workspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";
const implementationPath = join(
  workspace,
  "tests/e2e/hk-visualization-dependency-closure.mjs",
);
const independentlyObservedImplementationSourceSha256 = createHash("sha256")
  .update(readFileSync(implementationPath))
  .digest("hex");
const fixtureParent = join(
  workspace,
  ".tmp",
  `hk-viz-dependency-closure-tests-${process.pid}-${Date.now()}`,
);
mkdirSync(fixtureParent, { recursive: true });
after(() => rmSync(fixtureParent, { force: true, recursive: true }));

function makeWorkspace(label) {
  return mkdtempSync(join(fixtureParent, `${label}-`));
}

function write(root, relativePath, contents, mode = 0o644) {
  const destination = join(root, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, contents, { mode });
  return destination;
}

function createDependencyFixture(label, version = "15.5.23") {
  const root = makeWorkspace(label);
  write(
    root,
    "package.json",
    `${JSON.stringify({ dependencies: { next: version }, name: label })}\n`,
  );
  write(
    root,
    "package-lock.json",
    `${JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { dependencies: { next: version } },
        "node_modules/next": { version },
      },
    })}\n`,
  );
  write(
    root,
    "node_modules/next/package.json",
    `${JSON.stringify({ name: "next", version })}\n`,
  );
  write(root, "node_modules/alpha/index.js", "export const alpha = 1;\n");
  write(root, "node_modules/zeta/readme.txt", "zeta\n", 0o600);
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  symlinkSync("../alpha/index.js", join(root, "node_modules/.bin/alpha"));
  return root;
}

function expectedForFixture(manifest, expectedVersion = "15.5.23") {
  return {
    aggregateSha256: manifest.aggregateSha256,
    entryCount: manifest.entryCount,
    fileCount: manifest.fileCount,
    symlinkCount: manifest.symlinkCount,
    versions: {
      expected: expectedVersion,
      installed: expectedVersion,
      lockInstalled: expectedVersion,
      lockRoot: expectedVersion,
      required: expectedVersion,
    },
  };
}

function validationForExpected(expected) {
  return {
    expected,
    expectedImplementationSourceSha256:
      independentlyObservedImplementationSourceSha256,
  };
}

function artifactForManifest(manifest, artifactPath, expected) {
  const validation = validationForExpected(expected);
  const bytes =
    dependencyClosureModule.serializeHkVisualizationDependencyClosureManifest(
      manifest,
      validation,
    );
  return dependencyClosureModule.validateHkVisualizationDependencyClosureManifestArtifact(
    bytes,
    { ...validation, artifactPath },
  );
}

test(
  "reproduces and validates the exact current physical HK dependency closure once",
  { timeout: 180_000 },
  () => {
    const manifest = captureHkVisualizationDependencyClosure({ workspace });
    const validation = validationForExpected(
      HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
    );
    const fullManifestArtifact = artifactForManifest(
      manifest,
      join(fixtureParent, "canonical-dependency-manifest.json"),
      HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
    );
    const issues = validateHkVisualizationDependencyClosure(
      manifest,
      validation,
    );
    const summary = assertHkVisualizationDependencyClosure(manifest, {
      ...validation,
      fullManifestArtifact,
    });

    assert.deepEqual(issues, []);
    assert.equal(manifest.schemaVersion, HK_VISUALIZATION_DEPENDENCY_CLOSURE_SCHEMA);
    assert.deepEqual(manifest.policy, HK_VISUALIZATION_DEPENDENCY_CLOSURE_POLICY);
    assert.equal(manifest.entryCount, 22_716);
    assert.equal(manifest.fileCount, 22_690);
    assert.equal(manifest.symlinkCount, 26);
    assert.equal(
      manifest.aggregateSha256,
      "016dbf546dc90758211f65763935d7c4fe164071af30c5228e3f3e3c3c71a49d",
    );
    assert.deepEqual(
      {
        aggregateSha256: manifest.aggregateSha256,
        entryCount: manifest.entryCount,
        fileCount: manifest.fileCount,
        symlinkCount: manifest.symlinkCount,
        versions: manifest.versions,
      },
      HK_VISUALIZATION_CANONICAL_DEPENDENCY_CLOSURE,
    );
    assert.equal(lstatSync(join(workspace, "node_modules")).isSymbolicLink(), false);
    assert.equal(lstatSync(join(workspace, "node_modules")).isDirectory(), true);
    assert.equal(
      manifest.nodeModulesIdentity.dev,
      manifest.starshipIdentity.dev,
    );
    assert.equal(manifest.nodeModulesPhysical, true);

    assert.equal(
      manifest.algorithm.frozenReferenceSha256,
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
    );
    assert.equal(
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_FROZEN_REFERENCE_SHA256,
      "da263e501296e5240d08c357d0ffa3222ef294820cff46daab87dcb8e4ac7c94",
    );
    assert.match(
      manifest.algorithm.implementationSourceSha256,
      /^[a-f0-9]{64}$/,
    );
  assert.equal(
    manifest.algorithm.implementationSourceSha256,
    HK_VISUALIZATION_DEPENDENCY_CLOSURE_IMPLEMENTATION_SOURCE_SHA256,
  );
  assert.equal(
    manifest.algorithm.implementationSourceSha256,
    independentlyObservedImplementationSourceSha256,
  );
    assert.equal(manifest.algorithm.nodeVersion, process.version);
    assert.equal(
      manifest.algorithm.locale,
      new Intl.Collator().resolvedOptions().locale,
    );

    const fileEntry = manifest.entries.find(({ type }) => type === "file");
    const symlinkEntry = manifest.entries.find(
      ({ type }) => type === "symlink",
    );
    assert.deepEqual(Object.keys(fileEntry), [
      "path",
      "type",
      "mode",
      "size",
      "sha256",
    ]);
    assert.deepEqual(Object.keys(symlinkEntry), [
      "path",
      "type",
      "mode",
      "size",
      "target",
      "resolvedRelative",
      "insideRoot",
      "broken",
      "sha256",
    ]);
    assert.equal(symlinkEntry.insideRoot, true);
    assert.equal(symlinkEntry.broken, false);

    assert.equal(
      summary.schemaVersion,
      HK_VISUALIZATION_DEPENDENCY_CLOSURE_SUMMARY_SCHEMA,
    );
    assert.equal(summary.status, "PASS");
    assert.deepEqual(summary.issues, []);
    assert.match(summary.summaryAggregateSha256, /^[a-f0-9]{64}$/);
    assert.equal(
      summary.receiptAggregateSha256,
      manifest.receiptAggregateSha256,
    );
    assert.deepEqual(
      summary.fullManifestArtifact,
      fullManifestArtifact.descriptor,
    );
    const serializedSummary = JSON.stringify(summary);
    assert.equal(serializedSummary.includes(workspace), false);
    assert.equal(serializedSummary.includes(symlinkEntry.target), false);
    assert.equal("entries" in summary, false);
  },
);

test("captures exact file and symlink fields with per-directory localeCompare traversal", () => {
  const root = createDependencyFixture("field-order");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const expected = expectedForFixture(manifest);

  assert.deepEqual(
    validateHkVisualizationDependencyClosure(
      manifest,
      validationForExpected(expected),
    ),
    [],
  );
  assert.deepEqual(
    manifest.entries.map(({ path }) => path),
    [
      ".bin/alpha",
      "alpha/index.js",
      "next/package.json",
      "zeta/readme.txt",
    ],
  );
  assert.equal(
    manifest.aggregateSha256,
    hashEntriesForAssertion(manifest.entries),
  );
  assert.equal(manifest.entries.some(({ type }) => type === "directory"), false);
});

function hashEntriesForAssertion(entries) {
  // Keep the test oracle independent of implementation helpers while matching
  // the frozen reference's exact aggregate expression.
  return createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
}

test("compares pre/post closures and fails closed on content, mode, and membership drift", () => {
  const root = createDependencyFixture("drift");
  const dependencyFile = join(root, "node_modules/alpha/index.js");
  const before = captureHkVisualizationDependencyClosure({ workspace: root });

  writeFileSync(dependencyFile, "export const alpha = 2;\n");
  chmodSync(dependencyFile, 0o755);
  write(root, "node_modules/alpha/new.js", "new entry\n");
  const after = captureHkVisualizationDependencyClosure({ workspace: root });
  const comparison = compareHkVisualizationDependencyClosures(before, after);

  assert.equal(comparison.equal, false);
  assert.ok(comparison.issues.includes("entry-count-drift"));
  assert.ok(comparison.issues.includes("dependency-aggregate-drift"));
  assert.ok(comparison.issues.includes("receipt-aggregate-drift"));
  assert.throws(
    () => assertHkVisualizationDependencyClosureUnchanged(before, after),
    /dependency-aggregate-drift/,
  );
});

test("rejects an internal-tree symlink that resolves outside node_modules", () => {
  const root = createDependencyFixture("symlink-escape");
  symlinkSync(
    "../../package.json",
    join(root, "node_modules/alpha/outside-root"),
  );
  assert.throws(
    () => captureHkVisualizationDependencyClosure({ workspace: root }),
    /dependency-symlink-escape; path=alpha\/outside-root/,
  );
});

test("rejects a broken dependency symlink", () => {
  const root = createDependencyFixture("symlink-broken");
  symlinkSync("../missing-target", join(root, "node_modules/alpha/broken"));
  assert.throws(
    () => captureHkVisualizationDependencyClosure({ workspace: root }),
    /dependency-symlink-broken; path=alpha\/broken/,
  );
});

test("rejects an internal symlink alias to the node_modules root itself", () => {
  const root = createDependencyFixture("symlink-same-root-alias");
  symlinkSync("..", join(root, "node_modules/alpha/root-alias"));
  assert.throws(
    () => captureHkVisualizationDependencyClosure({ workspace: root }),
    /dependency-symlink-root-alias; path=alpha\/root-alias/,
  );
});

test("rejects unsupported dependency entry types", () => {
  const root = createDependencyFixture("unsupported-type");
  const fifoPath = join(root, "node_modules/alpha/unsupported-fifo");
  execFileSync("/usr/bin/mkfifo", [fifoPath], {
    env: {
      HOME: fixtureParent,
      LANG: "en_US.UTF-8",
      LC_ALL: "en_US.UTF-8",
      TMPDIR: fixtureParent,
    },
    stdio: "ignore",
  });
  assert.throws(
    () => captureHkVisualizationDependencyClosure({ workspace: root }),
    /unsupported-dependency-entry-type; path=alpha\/unsupported-fifo/,
  );
});

test("rejects a node_modules physical-directory alias", () => {
  const root = makeWorkspace("physical-alias");
  mkdirSync(join(root, "actual-dependencies"), { recursive: true });
  symlinkSync("actual-dependencies", join(root, "node_modules"));
  assert.throws(
    () => captureHkVisualizationDependencyClosure({ workspace: root }),
    /node-modules-must-be-physical-Starship-directory/,
  );
});

test("fails canonical validation for required, lock, and installed Next version drift", () => {
  const root = createDependencyFixture("version-mismatch", "15.5.20");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const expected = expectedForFixture(manifest, "15.5.23");
  const validation = validationForExpected(expected);
  const issues = validateHkVisualizationDependencyClosure(manifest, validation);

  assert.ok(issues.includes("next-required-version-mismatch"));
  assert.ok(issues.includes("next-lockRoot-version-mismatch"));
  assert.ok(issues.includes("next-lockInstalled-version-mismatch"));
  assert.ok(issues.includes("next-installed-version-mismatch"));
  assert.throws(
    () => assertHkVisualizationDependencyClosure(manifest, validation),
    /next-required-version-mismatch/,
  );
});

test("binds frozen reference, implementation source, Node version, and locale", () => {
  const root = createDependencyFixture("algorithm-binding");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const tampered = JSON.parse(JSON.stringify(manifest));
  tampered.algorithm.nodeVersion = "v0.0.0-tampered";
  tampered.algorithm.locale = "zz-ZZ";
  tampered.algorithm.frozenReferenceSha256 = "0".repeat(64);
  tampered.algorithm.implementationSourceSha256 = "1".repeat(64);

  const issues = validateHkVisualizationDependencyClosure(tampered, {
    canonical: false,
  });
  assert.ok(issues.includes("frozen-reference-sha-drift"));
  assert.ok(issues.includes("implementation-source-sha-drift"));
  assert.ok(issues.includes("node-version-drift"));
  assert.ok(issues.includes("locale-drift"));
  assert.ok(issues.includes("receipt-aggregate-invalid"));
});

test("requires an independently supplied implementation source SHA", () => {
  const root = createDependencyFixture("external-implementation-pin");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const issues = validateHkVisualizationDependencyClosure(manifest, {
    canonical: false,
    expectedImplementationSourceSha256: "0".repeat(64),
  });

  assert.ok(issues.includes("implementation-source-sha-mismatch"));
});

test("fails canonical validation when the independent implementation pin is absent", () => {
  const root = createDependencyFixture("missing-external-implementation-pin");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const issues = validateHkVisualizationDependencyClosure(manifest, {
    expected: expectedForFixture(manifest),
  });

  assert.ok(issues.includes("expected-implementation-source-sha-required"));
});

test("distinguishes declared reference provenance from a verified reference file", () => {
  const root = createDependencyFixture("reference-verification");
  const provenanceOnly = captureHkVisualizationDependencyClosure({
    workspace: root,
  });
  assert.deepEqual(provenanceOnly.algorithm.referenceVerification, {
    observedSha256: null,
    pathFingerprint: null,
    status: "provenance-only",
  });

  const referenceBytes = "generic fixture reference\n";
  const referencePath = write(root, "reference/freeze-audit.mjs", referenceBytes);
  const referenceSha256 = createHash("sha256")
    .update(referenceBytes)
    .digest("hex");
  const verified = captureHkVisualizationDependencyClosure({
    frozenReferencePath: referencePath,
    frozenReferenceSha256: referenceSha256,
    workspace: root,
  });
  assert.equal(verified.algorithm.frozenReferenceSha256, referenceSha256);
  assert.equal(verified.algorithm.referenceVerification.status, "verified");
  assert.equal(
    verified.algorithm.referenceVerification.observedSha256,
    referenceSha256,
  );
  assert.deepEqual(
    Object.keys(verified.algorithm.referenceVerification.pathFingerprint).sort(),
    ["length", "sha256"],
  );
  assert.equal(
    JSON.stringify(verified.algorithm).includes(referencePath),
    false,
  );

  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        frozenReferencePath: referencePath,
        frozenReferenceSha256: "f".repeat(64),
        workspace: root,
      }),
    /dependency-frozen-reference-sha-mismatch/,
  );
});

test("serializes and deeply validates a canonical full-manifest artifact", () => {
  assert.equal(
    typeof dependencyClosureModule.serializeHkVisualizationDependencyClosureManifest,
    "function",
  );
  assert.equal(
    typeof dependencyClosureModule.validateHkVisualizationDependencyClosureManifestArtifact,
    "function",
  );

  const root = createDependencyFixture("full-manifest-artifact");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const artifactPath = join(root, "evidence/dependency-before.json");
  const validation = {
    artifactPath,
    expected: expectedForFixture(manifest),
    expectedImplementationSourceSha256:
      independentlyObservedImplementationSourceSha256,
  };
  const bytes =
    dependencyClosureModule.serializeHkVisualizationDependencyClosureManifest(
      manifest,
      validation,
    );
  const evidence =
    dependencyClosureModule.validateHkVisualizationDependencyClosureManifestArtifact(
      bytes,
      validation,
    );

  assert.equal(Buffer.isBuffer(bytes), true);
  assert.equal(bytes.at(-1), 0x0a);
  assert.deepEqual(evidence.manifest, manifest);
  assert.equal(evidence.descriptor.size, bytes.length);
  assert.equal(
    evidence.descriptor.sha256,
    createHash("sha256").update(bytes).digest("hex"),
  );
  assert.deepEqual(Object.keys(evidence.descriptor.pathFingerprint).sort(), [
    "length",
    "sha256",
  ]);
  assert.deepEqual(Object.keys(evidence.descriptor), [
    "pathFingerprint",
    "schemaVersion",
    "sha256",
    "size",
  ]);
  assert.equal(
    evidence.descriptor.schemaVersion,
    dependencyClosureModule.HK_VISUALIZATION_DEPENDENCY_CLOSURE_ARTIFACT_SCHEMA,
  );
  assert.equal(JSON.stringify(evidence.descriptor).includes(artifactPath), false);
});

test("deep-validates a privacy-safe summary against its full-manifest artifact", () => {
  assert.equal(
    typeof dependencyClosureModule.validateHkVisualizationDependencyClosureSummaryReceipt,
    "function",
  );

  const root = createDependencyFixture("deep-summary");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const artifactPath = join(root, "evidence/dependency-before.json");
  const validation = {
    expected: expectedForFixture(manifest),
    expectedImplementationSourceSha256:
      independentlyObservedImplementationSourceSha256,
  };
  const bytes =
    dependencyClosureModule.serializeHkVisualizationDependencyClosureManifest(
      manifest,
      validation,
    );
  const fullManifestArtifact =
    dependencyClosureModule.validateHkVisualizationDependencyClosureManifestArtifact(
      bytes,
      { ...validation, artifactPath },
    );
  const summary = buildHkVisualizationDependencyClosureSummaryReceipt(manifest, {
    ...validation,
    fullManifestArtifact,
  });

  assert.deepEqual(summary.fullManifestArtifact, fullManifestArtifact.descriptor);
  assert.deepEqual(
    dependencyClosureModule.validateHkVisualizationDependencyClosureSummaryReceipt(
      summary,
      { ...validation, fullManifestArtifact },
    ),
    [],
  );
  assert.equal(JSON.stringify(summary).includes(root), false);

  const forged = JSON.parse(JSON.stringify(summary));
  forged.entryCount = -1;
  forged.algorithm.rawPrivateMarker = "/private/a11-marker";
  forged.fullManifestArtifact.pathFingerprint = {
    raw: "/private/a11-manifest",
  };
  const forgedPayload = { ...forged };
  delete forgedPayload.summaryAggregateSha256;
  forged.summaryAggregateSha256 = createHash("sha256")
    .update(JSON.stringify(forgedPayload))
    .digest("hex");
  const forgedIssues =
    dependencyClosureModule.validateHkVisualizationDependencyClosureSummaryReceipt(
      forged,
      { ...validation, fullManifestArtifact },
    );
  assert.ok(forgedIssues.includes("summary-entry-count-invalid"));
  assert.ok(forgedIssues.includes("summary-algorithm-drift"));
  assert.ok(forgedIssues.includes("summary-full-manifest-artifact-drift"));

  const unboundIssues =
    dependencyClosureModule.validateHkVisualizationDependencyClosureSummaryReceipt(
      summary,
      validation,
    );
  assert.ok(unboundIssues.includes("expected-full-manifest-artifact-required"));
});

test("rejects tampered and noncanonical full-manifest artifact bytes", () => {
  const root = createDependencyFixture("full-manifest-tamper");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const expected = expectedForFixture(manifest);
  const validation = {
    artifactPath: join(root, "evidence/dependency.json"),
    ...validationForExpected(expected),
  };
  const bytes =
    dependencyClosureModule.serializeHkVisualizationDependencyClosureManifest(
      manifest,
      validation,
    );
  const tampered = Buffer.from(bytes);
  const marker = Buffer.from(manifest.entries[0].sha256);
  const markerOffset = tampered.indexOf(marker);
  assert.ok(markerOffset > 0);
  tampered[markerOffset] = tampered[markerOffset] === 0x61 ? 0x62 : 0x61;
  assert.throws(
    () =>
      dependencyClosureModule.validateHkVisualizationDependencyClosureManifestArtifact(
        tampered,
        validation,
      ),
    /dependency-aggregate-invalid|receipt-aggregate-invalid/,
  );

  const noncanonical = Buffer.from(JSON.stringify(manifest));
  assert.throws(
    () =>
      dependencyClosureModule.validateHkVisualizationDependencyClosureManifestArtifact(
        noncanonical,
        validation,
      ),
    /dependency-full-manifest-artifact-noncanonical/,
  );
});

test("capture-and-assert returns exact bytes, artifact evidence, manifest, and summary", () => {
  const root = createDependencyFixture("capture-artifact-bundle");
  const artifactPath = join(root, "evidence/dependency-before.json");
  const baseline = captureHkVisualizationDependencyClosure({ workspace: root });
  const expected = expectedForFixture(baseline);
  const result =
    dependencyClosureModule.captureAndAssertHkVisualizationCanonicalDependencyClosure(
      {
        expectedImplementationSourceSha256:
          independentlyObservedImplementationSourceSha256,
        expected,
        fullManifestArtifactPath: artifactPath,
        workspace: root,
      },
    );

  assert.deepEqual(Object.keys(result).sort(), [
    "fullManifestArtifact",
    "fullManifestArtifactBytes",
    "manifest",
    "summary",
  ]);
  assert.equal(Buffer.isBuffer(result.fullManifestArtifactBytes), true);
  assert.deepEqual(
    result.summary.fullManifestArtifact,
    result.fullManifestArtifact.descriptor,
  );
  assert.deepEqual(
    dependencyClosureModule.validateHkVisualizationDependencyClosureSummaryReceipt(
      result.summary,
      {
        expected,
        expectedImplementationSourceSha256:
          independentlyObservedImplementationSourceSha256,
        fullManifestArtifact: result.fullManifestArtifact,
      },
    ),
    [],
  );
});

test("fails closed when a regular file changes after its descriptor read", () => {
  const root = createDependencyFixture("regular-file-race");
  const dependencyFile = join(root, "node_modules/alpha/index.js");
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          afterRegularFileRead({ relativePath }) {
            if (relativePath === "alpha/index.js") {
              writeFileSync(dependencyFile, "export const alpha = 2;\n");
            }
          },
        },
        workspace: root,
      }),
    /dependency-regular-file-changed-during-scan; path=alpha\/index\.js/,
  );
});

test("fails closed when directory membership changes during a scan", () => {
  const root = createDependencyFixture("directory-membership-race");
  let mutated = false;
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          afterDirectoryChildrenRead({ relativeDirectory }) {
            if (!mutated && relativeDirectory === "alpha") {
              mutated = true;
              write(root, "node_modules/alpha/late.js", "late\n");
            }
          },
        },
        workspace: root,
      }),
    /dependency-directory-changed-during-scan; path=alpha/,
  );
});

test("fails closed when a symlink changes during capture", () => {
  const root = createDependencyFixture("symlink-race");
  const linkPath = join(root, "node_modules/.bin/alpha");
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          afterSymlinkRead({ relativePath }) {
            if (relativePath === ".bin/alpha") {
              rmSync(linkPath);
              symlinkSync("../zeta/readme.txt", linkPath);
            }
          },
        },
        workspace: root,
      }),
    /dependency-symlink-changed-during-scan; path=\.bin\/alpha/,
  );
});

test("requires two identical consecutive dependency scans", () => {
  const root = createDependencyFixture("double-scan-race");
  const dependencyFile = join(root, "node_modules/alpha/index.js");
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          afterScan({ scanIndex }) {
            if (scanIndex === 0) {
              writeFileSync(dependencyFile, "export const alpha = 2;\n");
            }
          },
        },
        workspace: root,
      }),
    /dependency-tree-changed-between-consecutive-scans/,
  );
});

test("detects transient directory membership changes between scans", () => {
  const root = createDependencyFixture("transient-directory-race");
  const transientPath = join(root, "node_modules/alpha/transient.js");
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          afterScan({ scanIndex }) {
            if (scanIndex !== 0) return;
            writeFileSync(transientPath, "transient\n");
            rmSync(transientPath);
          },
        },
        workspace: root,
      }),
    /dependency-tree-changed-between-consecutive-scans/,
  );
});

test("rejects a same-content node_modules directory replacement between scans", () => {
  const root = createDependencyFixture("directory-identity-race");
  const nodeModules = join(root, "node_modules");
  const displaced = join(root, "node_modules-displaced");
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          afterScan({ scanIndex }) {
            if (scanIndex !== 0) return;
            renameSync(nodeModules, displaced);
            write(
              root,
              "node_modules/next/package.json",
              `${JSON.stringify({ name: "next", version: "15.5.23" })}\n`,
            );
            write(
              root,
              "node_modules/alpha/index.js",
              "export const alpha = 1;\n",
            );
            write(root, "node_modules/zeta/readme.txt", "zeta\n", 0o600);
            mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
            symlinkSync("../alpha/index.js", join(root, "node_modules/.bin/alpha"));
          },
        },
        workspace: root,
      }),
    /dependency-tree-changed-between-consecutive-scans|node-modules-changed-during-capture/,
  );
});

test("opens regular files without following symlinks and verifies fd identity", () => {
  const root = createDependencyFixture("stable-fd");
  const filePath = join(root, "node_modules/alpha/index.js");
  assert.throws(
    () =>
      captureHkVisualizationDependencyClosure({
        scanHooks: {
          beforeRegularFileOpen({ relativePath }) {
            if (relativePath === "alpha/index.js") {
              rmSync(filePath);
              symlinkSync("../zeta/readme.txt", filePath);
            }
          },
        },
        workspace: root,
      }),
    /dependency-regular-file-open-failed; path=alpha\/index\.js/,
  );
});

test("summary receipt exposes fingerprints and exact counts but no raw roots, targets, or entries", () => {
  const root = createDependencyFixture("summary-privacy");
  const manifest = captureHkVisualizationDependencyClosure({ workspace: root });
  const expected = expectedForFixture(manifest);
  const validation = validationForExpected(expected);
  const fullManifestArtifact = artifactForManifest(
    manifest,
    join(root, "evidence/dependency-summary.json"),
    expected,
  );
  const summary = buildHkVisualizationDependencyClosureSummaryReceipt(manifest, {
    ...validation,
    fullManifestArtifact,
  });
  const serialized = JSON.stringify(summary);

  assert.equal(summary.status, "PASS");
  assert.match(summary.nodeModulesRootFingerprint.sha256, /^[a-f0-9]{64}$/);
  assert.match(summary.workspaceRootFingerprint.sha256, /^[a-f0-9]{64}$/);
  assert.equal(serialized.includes(root), false);
  assert.equal(serialized.includes("../alpha/index.js"), false);
  assert.equal("entries" in summary, false);
  assert.equal("workspaceIdentity" in summary, false);
  assert.equal("nodeModulesIdentity" in summary, false);
  assert.equal("path" in summary.fullManifestArtifact, false);
  assert.equal(
    serialized.includes(fullManifestArtifact.descriptor.pathFingerprint.sha256),
    true,
  );
});
