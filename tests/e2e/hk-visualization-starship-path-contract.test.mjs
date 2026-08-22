import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import test from "node:test";
import * as starshipPathContract from "./hk-visualization-starship-path-contract.mjs";
import {
  HK_VISUALIZATION_STARSHIP_ROOT,
  assertHkVisualizationBrowserProfilePaths,
  assertHkVisualizationStarshipPath,
  buildHkVisualizationE2eTsconfig,
  buildHkVisualizationManagedWebServerCommand,
  buildHkVisualizationStarshipPathManifest,
  parseHkVisualizationBrowserProfilePaths,
  validateHkVisualizationStarshipPathManifest,
} from "./hk-visualization-starship-path-contract.mjs";

const captureHkVisualizationMaterializedArtifactRootIdentity = (...args) =>
  starshipPathContract.captureHkVisualizationMaterializedArtifactRootIdentity(
    ...args,
  );
const captureHkVisualizationPhysicalPathIdentity = (...args) =>
  starshipPathContract.captureHkVisualizationPhysicalPathIdentity(...args);
const captureHkVisualizationManagedToolchainIdentity = (...args) =>
  starshipPathContract.captureHkVisualizationManagedToolchainIdentity(...args);
const validateHkVisualizationMaterializedArtifactRootIdentity = (...args) =>
  starshipPathContract.validateHkVisualizationMaterializedArtifactRootIdentity(
    ...args,
  );

const workspace = "/Volumes/Starship/MAIS-hk-viz-labs-wt";

test("builds one exact absolute Starship-only runtime path manifest", () => {
  const manifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-path-contract-positive",
    workspace,
  });

  assert.equal(HK_VISUALIZATION_STARSHIP_ROOT, "/Volumes/Starship");
  assert.deepEqual(validateHkVisualizationStarshipPathManifest(manifest), []);
  assert.equal(manifest.workspace, workspace);
  assert.ok(manifest.artifactRoot.startsWith(`${workspace}/.tmp/`));
  assert.ok(manifest.browserProfileParent.startsWith(manifest.artifactRoot));
  assert.ok(manifest.nextDistDir.startsWith(manifest.artifactRoot));
  assert.equal(
    manifest.nextTsconfigPath,
    `${workspace}/tsconfig.playwright-hk-viz-path-contract-positive.tmp.json`,
  );
  assert.ok(manifest.nodeCompileCacheDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.npmCacheDir.startsWith(manifest.artifactRoot));
  assert.equal(manifest.npmLogsDir, `${manifest.npmCacheDir}/_logs`);
  assert.ok(manifest.sqliteTmpDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.outputDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.reportDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.jsonReport.startsWith(manifest.artifactRoot));
  assert.ok(manifest.databasePath.startsWith(manifest.artifactRoot));
  assert.ok(manifest.serviceLogDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.servicePidDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.runtimeTmpDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.xdgCacheDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.xdgConfigDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.xdgStateDir.startsWith(manifest.artifactRoot));
  assert.ok(manifest.pathManifestFile.startsWith(manifest.artifactRoot));
  assert.equal(
    manifest.releaseSourceReceiptPath,
    `${manifest.artifactRoot}/release-source-receipt.json`,
  );
  assert.ok(
    manifest.runtimeProfileReceiptPath.startsWith(manifest.artifactRoot),
  );
  assert.equal(
    manifest.globalProfileMonitorDir,
    `${manifest.artifactRoot}/global-profile-monitor`,
  );
  assert.equal(
    manifest.globalProfileMonitorTmpDir,
    `${manifest.globalProfileMonitorDir}/runtime-tmp`,
  );
  for (const monitorPath of [
    manifest.globalProfileMonitorReceiptPath,
    manifest.globalProfileMonitorReadyPath,
    manifest.globalProfileMonitorStopPath,
    manifest.globalProfileMonitorPidPath,
    manifest.globalProfileMonitorLogPath,
  ]) {
    assert.ok(monitorPath.startsWith(`${manifest.globalProfileMonitorDir}/`));
  }
  assert.equal(
    manifest.workloadSupervisorDir,
    `${manifest.artifactRoot}/workload-supervisor`,
  );
  assert.equal(
    manifest.workloadSupervisorTmpDir,
    `${manifest.workloadSupervisorDir}/runtime-tmp`,
  );
  for (const supervisorPath of [
    manifest.workloadSupervisorReceiptPath,
    manifest.workloadSupervisorReadyPath,
    manifest.workloadSupervisorStartPath,
    manifest.workloadSupervisorPidPath,
    manifest.workloadSupervisorLeaderPath,
    manifest.workloadSupervisorLogPath,
    manifest.workloadSupervisorNextEnvSnapshotPath,
    manifest.workloadSupervisorLockPath,
  ]) {
    assert.ok(supervisorPath.startsWith(`${manifest.workloadSupervisorDir}/`));
  }
  assert.match(manifest.manifestHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(manifest.volumeIdentity).sort(), [
    "starshipRoot",
    "systemRoot",
    "workspace",
  ]);
  for (const [name, identity] of Object.entries(manifest.volumeIdentity)) {
    assert.deepEqual(
      Object.keys(identity).sort(),
      ["device", "inode", "path", "realpath"],
      `${name} must expose the exact physical identity key set`,
    );
    assert.match(identity.device, /^[1-9][0-9]*$/);
    assert.match(identity.inode, /^[1-9][0-9]*$/);
    assert.equal(identity.path, identity.realpath);
  }
  assert.equal(manifest.volumeIdentity.systemRoot.path, "/");
  assert.equal(
    manifest.volumeIdentity.starshipRoot.path,
    HK_VISUALIZATION_STARSHIP_ROOT,
  );
  assert.equal(manifest.volumeIdentity.workspace.path, workspace);
  assert.equal(
    manifest.volumeIdentity.starshipRoot.device,
    manifest.volumeIdentity.workspace.device,
  );
  assert.notEqual(
    manifest.volumeIdentity.systemRoot.device,
    manifest.volumeIdentity.starshipRoot.device,
  );
  assert.ok(
    Object.values(manifest.paths).every(
      (value) =>
        typeof value === "string" &&
        value.startsWith(`${HK_VISUALIZATION_STARSHIP_ROOT}/`),
    ),
  );
});

test("builds one canonical managed webServer command from the exact path manifest", () => {
  const manifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-path-contract-webserver",
    workspace,
  });
  const command = buildHkVisualizationManagedWebServerCommand({ manifest });
  const toolchainIdentity =
    captureHkVisualizationManagedToolchainIdentity(manifest);

  assert.deepEqual(Object.keys(toolchainIdentity).sort(), [
    "nextBuildScript",
    "nextCli",
    "nodeExecutable",
  ]);
  for (const [name, identity] of Object.entries(toolchainIdentity)) {
    assert.deepEqual(
      Object.keys(identity).sort(),
      ["device", "inode", "path", "realpath"],
      `${name} must expose the exact physical tool identity key set`,
    );
    assert.equal(identity.path, identity.realpath);
  }
  assert.equal(toolchainIdentity.nodeExecutable.path, process.execPath);
  assert.equal(
    toolchainIdentity.nextBuildScript.path,
    `${workspace}/scripts/next-clean-build.mjs`,
  );
  assert.equal(
    toolchainIdentity.nextCli.path,
    `${workspace}/node_modules/next/dist/bin/next`,
  );

  const outerRunnerOnlyKeys = new Set([
    "nextTsconfigPath",
    "pathManifestFile",
    "releaseSourceReceiptPath",
    "globalProfileMonitorDir",
    "globalProfileMonitorTmpDir",
    "globalProfileMonitorReceiptPath",
    "globalProfileMonitorReadyPath",
    "globalProfileMonitorStopPath",
    "globalProfileMonitorPidPath",
    "globalProfileMonitorLogPath",
    "workloadSupervisorDir",
    "workloadSupervisorTmpDir",
    "workloadSupervisorReceiptPath",
    "workloadSupervisorReadyPath",
    "workloadSupervisorStartPath",
    "workloadSupervisorPidPath",
    "workloadSupervisorLeaderPath",
    "workloadSupervisorLogPath",
    "workloadSupervisorNextEnvSnapshotPath",
    "workloadSupervisorLockPath",
  ]);
  for (const [key, requiredPath] of Object.entries(manifest.paths)) {
    if (outerRunnerOnlyKeys.has(key)) continue;
    assert.ok(command.includes(requiredPath), requiredPath);
  }
  for (const key of outerRunnerOnlyKeys) {
    const outerOnlyPath = manifest.paths[key];
    if (outerOnlyPath) {
      assert.ok(
        !command.includes(outerOnlyPath),
        `${key} must survive the managed webServer cleanup for outer-runner monitoring.`,
      );
    }
  }
  assert.equal(
    command.match(/SQLITE_TMPDIR=/g)?.length,
    2,
    "build and start must share the exact SQLite temporary directory",
  );
  assert.equal(
    command.match(/(?:^| )HOME=/g)?.length,
    2,
    "build and start must share the exact Starship-managed runtime home",
  );
  assert.equal(
    command.match(/NODE_OPTIONS='--max-old-space-size=8192'/g)?.length ?? 0,
    2,
    "build and start must use the fixed canonical 8 GiB heap without inheriting caller NODE_OPTIONS",
  );
  assert.ok(!command.includes("npm run build"));
  assert.ok(!command.includes("npm run start"));
  assert.ok(!/(?:^|[;&|]\s*)npm(?:\s|$)/.test(command));
  assert.ok(command.startsWith("/bin/rm -rf "));
  assert.ok(command.includes(" && /bin/rm -f "));
  assert.ok(command.includes(" && /bin/mkdir -p "));
  assert.ok(!command.includes(" && env "));
  assert.equal(
    command.match(
      new RegExp(
        `'${toolchainIdentity.nodeExecutable.path.replaceAll("'", "'\\''")}'`,
        "g",
      ),
    )?.length,
    2,
  );
  assert.ok(
    command.includes(`'${toolchainIdentity.nextBuildScript.path}'`),
  );
  assert.ok(command.includes(`'${toolchainIdentity.nextCli.path}' start`));
  assert.ok(
    command.includes("NEXT_DIST_DIR='.tmp/hk-viz-path-contract-webserver/next-dist'"),
    "next-clean-build must receive a repository-relative .tmp path while the evidence manifest retains the exact absolute Starship path",
  );
  assert.ok(
    !command.includes(`NEXT_DIST_DIR='${manifest.nextDistDir}'`),
    "next-clean-build rejects an absolute NEXT_DIST_DIR even when it is inside the Starship workspace",
  );
  assert.ok(
    command.includes(
      "NEXT_TSCONFIG_PATH='tsconfig.playwright-hk-viz-path-contract-webserver.tmp.json'",
    ),
    "Next must receive the unique worktree-root disposable tsconfig path",
  );
  assert.ok(
    !command.includes(`/bin/rm -f '${manifest.nextTsconfigPath}'`),
    "the managed server must retain the runner-prewritten tsconfig for Playwright worker config reloads; the workload supervisor owns terminal cleanup",
  );
  assert.ok(!command.includes("/tmp/"));
  assert.ok(!command.includes("/var/folders/"));
  assert.ok(!/\/Users\/[^/]+\/Desktop\//.test(command));
});

test("generated E2E tsconfig resolves extends, includes, and excludes from the Starship workspace", () => {
  const manifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-path-contract-tsconfig",
    workspace,
  });
  const config = buildHkVisualizationE2eTsconfig({
    workspace,
    nextDistDir: manifest.nextDistDir,
    exclude: ["node_modules", "private/**/*"],
  });

  assert.equal(
    manifest.nextTsconfigPath,
    `${workspace}/tsconfig.playwright-hk-viz-path-contract-tsconfig.tmp.json`,
  );
  assert.equal(config.extends, "./tsconfig.json");
  assert.deepEqual(config.include, [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".tmp/hk-viz-path-contract-tsconfig/next-dist/types/**/*.ts",
  ]);
  assert.deepEqual(config.exclude, ["node_modules", "private/**/*"]);
});

test("rejects relative, system-temp, Desktop, Starship-root, and lexical escape paths", () => {
  for (const [label, value] of [
    ["relative", ".tmp/evidence"],
    ["system tmp", "/tmp/hk-viz"],
    ["system var", "/var/folders/hk-viz"],
    ["Desktop", "/Users/dongpinhu/Desktop/MAIS-MVP/.tmp/hk-viz"],
    ["Starship root", "/Volumes/Starship"],
    ["lexical escape", `${workspace}/../..`],
  ]) {
    assert.throws(
      () => assertHkVisualizationStarshipPath(label, value),
      /absolute.*\/Volumes\/Starship|inside.*\/Volumes\/Starship|root itself|escape/i,
    );
  }
});

test("rejects same-Starship and dangling symlink aliases in every existing path segment", () => {
  const parent = join(workspace, ".tmp");
  mkdirSync(parent, { recursive: true });
  const fixture = mkdtempSync(join(parent, "hk-viz-path-symlink-"));
  const physicalTarget = join(fixture, "physical-target");
  const alias = join(fixture, "alias");
  const danglingAlias = join(fixture, "dangling-alias");
  try {
    mkdirSync(physicalTarget);
    symlinkSync(physicalTarget, alias);
    assert.throws(
      () =>
        assertHkVisualizationStarshipPath(
          "same-Starship symlink alias",
          join(alias, "hk-viz-artifact"),
        ),
      /symlink alias/i,
    );
    symlinkSync(join(fixture, "missing-target"), danglingAlias);
    assert.throws(
      () =>
        assertHkVisualizationStarshipPath(
          "dangling symlink alias",
          join(danglingAlias, "hk-viz-artifact"),
        ),
      /symlink alias/i,
    );
  } finally {
    rmSync(fixture, { force: true, recursive: true });
  }
});

test("physical identity capture rejects a symlink even when its target stays on Starship", () => {
  const parent = join(workspace, ".tmp");
  mkdirSync(parent, { recursive: true });
  const fixture = mkdtempSync(join(parent, "hk-viz-physical-identity-symlink-"));
  const physicalTarget = join(fixture, "physical-target");
  const alias = join(fixture, "root-alias");
  try {
    mkdirSync(physicalTarget);
    symlinkSync(physicalTarget, alias);
    assert.throws(
      () =>
        captureHkVisualizationPhysicalPathIdentity(
          "simulated Starship root",
          alias,
        ),
      /symlink/i,
    );
  } finally {
    rmSync(fixture, { force: true, recursive: true });
  }
});

test("manifest validation rejects missing, extra, relative, foreign, swapped, and hash-drift paths", async (t) => {
  const canonical = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-path-contract-negative",
    workspace,
  });
  const cases = [
    ["missing", (manifest) => delete manifest.paths.outputDir],
    ["extra", (manifest) => (manifest.paths.extra = `${workspace}/.tmp/extra`)],
    ["relative", (manifest) => (manifest.paths.reportDir = ".tmp/report")],
    ["foreign", (manifest) => (manifest.paths.runtimeTmpDir = "/tmp/runtime")],
    [
      "swapped",
      (manifest) =>
        ([manifest.paths.outputDir, manifest.paths.reportDir] = [
          manifest.paths.reportDir,
          manifest.paths.outputDir,
        ]),
    ],
    ["hash drift", (manifest) => (manifest.manifestHash = "0".repeat(64))],
    ["extra top-level key", (manifest) => (manifest.extra = "forbidden")],
    [
      "release source receipt path drift",
      (manifest) =>
        (manifest.paths.releaseSourceReceiptPath =
          `${manifest.artifactRoot}/wrong-source-receipt.json`),
    ],
    [
      "release source receipt alias drift",
      (manifest) =>
        (manifest.releaseSourceReceiptPath = manifest.pathManifestFile),
    ],
    ["missing volume identity", (manifest) => delete manifest.volumeIdentity],
    [
      "extra volume identity",
      (manifest) =>
        (manifest.volumeIdentity.extra = structuredClone(
          manifest.volumeIdentity.workspace,
        )),
    ],
    [
      "missing workspace identity key",
      (manifest) => delete manifest.volumeIdentity.workspace.inode,
    ],
    [
      "extra workspace identity key",
      (manifest) => (manifest.volumeIdentity.workspace.extra = "forbidden"),
    ],
    [
      "Starship root alias",
      (manifest) =>
        (manifest.volumeIdentity.starshipRoot.realpath =
          manifest.volumeIdentity.workspace.path),
    ],
    [
      "workspace inode drift",
      (manifest) => (manifest.volumeIdentity.workspace.inode = "999999999"),
    ],
    [
      "workspace wrong device",
      (manifest) =>
        (manifest.volumeIdentity.workspace.device =
          manifest.volumeIdentity.systemRoot.device),
    ],
    [
      "Starship root on system device",
      (manifest) =>
        (manifest.volumeIdentity.starshipRoot.device =
          manifest.volumeIdentity.systemRoot.device),
    ],
  ];

  for (const [name, mutate] of cases) {
    await t.test(name, () => {
      const manifest = structuredClone(canonical);
      mutate(manifest);
      assert.notDeepEqual(validateHkVisualizationStarshipPathManifest(manifest), []);
    });
  }
});

test("captures and validates the materialized artifact root on the bound Starship device", () => {
  const runId = `hk-viz-path-contract-materialized-${process.pid}`;
  const manifest = buildHkVisualizationStarshipPathManifest({ runId, workspace });
  try {
    mkdirSync(manifest.artifactRoot, { recursive: true });
    const identity = captureHkVisualizationMaterializedArtifactRootIdentity(
      manifest,
    );

    assert.deepEqual(Object.keys(identity).sort(), [
      "device",
      "inode",
      "path",
      "realpath",
    ]);
    assert.equal(identity.path, manifest.artifactRoot);
    assert.equal(identity.realpath, manifest.artifactRoot);
    assert.equal(
      identity.device,
      manifest.volumeIdentity.starshipRoot.device,
    );
    assert.deepEqual(
      validateHkVisualizationMaterializedArtifactRootIdentity(
        manifest,
        identity,
      ),
      [],
    );
  } finally {
    rmSync(manifest.artifactRoot, { force: true, recursive: true });
  }
});

test("materialized artifact identity fails closed for missing, extra, drifted, aliased, and wrong-device evidence", async (t) => {
  const runId = `hk-viz-path-contract-materialized-negative-${process.pid}`;
  const manifest = buildHkVisualizationStarshipPathManifest({ runId, workspace });
  try {
    mkdirSync(manifest.artifactRoot, { recursive: true });
    const canonical = captureHkVisualizationMaterializedArtifactRootIdentity(
      manifest,
    );
    const cases = [
      ["missing", (identity) => delete identity.inode],
      ["extra", (identity) => (identity.extra = "forbidden")],
      ["inode drift", (identity) => (identity.inode = "999999999")],
      [
        "alias",
        (identity) => (identity.realpath = manifest.volumeIdentity.workspace.path),
      ],
      [
        "wrong device",
        (identity) =>
          (identity.device = manifest.volumeIdentity.systemRoot.device),
      ],
    ];

    for (const [name, mutate] of cases) {
      await t.test(name, () => {
        const identity = structuredClone(canonical);
        mutate(identity);
        assert.notDeepEqual(
          validateHkVisualizationMaterializedArtifactRootIdentity(
            manifest,
            identity,
          ),
          [],
        );
      });
    }
  } finally {
    rmSync(manifest.artifactRoot, { force: true, recursive: true });
  }
});

test("materialized artifact capture rejects a same-Starship symlink alias", () => {
  const runId = `hk-viz-path-contract-materialized-alias-${process.pid}`;
  const manifest = buildHkVisualizationStarshipPathManifest({ runId, workspace });
  const physicalTarget = `${manifest.artifactRoot}-physical`;
  try {
    mkdirSync(physicalTarget, { recursive: true });
    symlinkSync(physicalTarget, manifest.artifactRoot);
    assert.throws(
      () => captureHkVisualizationMaterializedArtifactRootIdentity(manifest),
      /symlink/i,
    );
  } finally {
    rmSync(manifest.artifactRoot, { force: true, recursive: true });
    rmSync(physicalTarget, { force: true, recursive: true });
  }
});

test("extracts and validates actual unique Playwright Chrome profiles under the run root", () => {
  const manifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-path-contract-profile",
    workspace,
  });
  const first = join(
    manifest.browserProfileParent,
    "playwright_chromiumdev_profile-first",
  );
  const second = join(
    manifest.browserProfileParent,
    "playwright_chromiumdev_profile-second",
  );
  const commands = [
    `Google Chrome --user-data-dir=${first} --remote-debugging-pipe --no-startup-window`,
    `Google Chrome Helper --user-data-dir=${first} --type=renderer`,
    `Google Chrome --user-data-dir=\"${second}\" --remote-debugging-pipe --no-startup-window`,
  ];

  assert.deepEqual(parseHkVisualizationBrowserProfilePaths(commands), [
    first,
    second,
  ]);
  assert.deepEqual(
    assertHkVisualizationBrowserProfilePaths(
      parseHkVisualizationBrowserProfilePaths(commands),
      manifest,
    ),
    [first, second],
  );
});

test("browser profile validation fails closed for no profile, duplicate input, wrong prefix, or foreign roots", () => {
  const manifest = buildHkVisualizationStarshipPathManifest({
    runId: "hk-viz-path-contract-profile-negative",
    workspace,
  });
  const valid = join(
    manifest.browserProfileParent,
    "playwright_chromiumdev_profile-valid",
  );
  for (const profiles of [
    [],
    [valid, valid],
    [join(manifest.browserProfileParent, "ordinary-profile")],
    ["/var/folders/playwright_chromiumdev_profile-forbidden"],
    [join(manifest.artifactRoot, "wrong-parent", "playwright_chromiumdev_profile-x")],
  ]) {
    assert.throws(
      () => assertHkVisualizationBrowserProfilePaths(profiles, manifest),
      /profile|duplicate|Starship|parent|prefix/i,
    );
  }
});
