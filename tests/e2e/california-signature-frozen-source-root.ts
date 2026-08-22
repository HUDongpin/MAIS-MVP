import assert from "node:assert/strict";
import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";

export const CALIFORNIA_SIGNATURE_FROZEN_SOURCE_ROOT_ENV =
  "CA_SIGNATURE_FROZEN_SOURCE_ROOT";

type CaliforniaSignatureFrozenSourceEnvironment = Pick<
  NodeJS.ProcessEnv,
  | "CA_SIGNATURE_FROZEN_SOURCE_ROOT"
  | "CA_SIGNATURE_QA_STAGING_ROOT"
  | "CA_VIZ_COMPOSED_QA_BUILD"
  | "CA_VIZ_SOURCE_SNAPSHOT_SHA256"
>;

function assertAbsoluteNormalizedPath(value: string, label: string) {
  assert.ok(path.isAbsolute(value), `${label} must be an explicit absolute path`);
  assert.equal(path.resolve(value), value, `${label} must be normalized`);
  return value;
}

function assertRegularPhysicalDirectory(value: string, label: string) {
  const identity = lstatSync(value);
  assert.ok(identity.isDirectory() && !identity.isSymbolicLink(),
    `${label} must be one regular non-symlink directory`);
  assert.equal(realpathSync(value), value, `${label} must not traverse a symlink`);
}

/**
 * Resolve the pristine authored-source side of the composed Layer B QA pair.
 *
 * The browser must execute the instrumented `layer-b/source` tree, while all
 * source-derived manifests and Canvas/oracle contracts must be rebuilt from
 * the immutable sibling `frozen-source` tree.  Refusing every other topology
 * prevents a composed source file from silently redefining its own oracle.
 */
export function resolveCaliforniaSignatureFrozenSourceRoot(options: {
  cwd?: string;
  env?: CaliforniaSignatureFrozenSourceEnvironment;
} = {}) {
  const env = options.env ?? process.env;
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const composed = env.CA_VIZ_COMPOSED_QA_BUILD?.trim();
  const suppliedFrozenRoot = env.CA_SIGNATURE_FROZEN_SOURCE_ROOT?.trim();

  if (composed !== "1") {
    assert.ok(!suppliedFrozenRoot,
      `${CALIFORNIA_SIGNATURE_FROZEN_SOURCE_ROOT_ENV} is reserved for a composed Layer B QA build`);
    return cwd;
  }

  assert.ok(suppliedFrozenRoot,
    `${CALIFORNIA_SIGNATURE_FROZEN_SOURCE_ROOT_ENV} is required for a composed Layer B QA build`);
  const frozenRoot = assertAbsoluteNormalizedPath(
    suppliedFrozenRoot,
    CALIFORNIA_SIGNATURE_FROZEN_SOURCE_ROOT_ENV
  );
  const suppliedStagingRoot = env.CA_SIGNATURE_QA_STAGING_ROOT?.trim();
  assert.ok(suppliedStagingRoot,
    "CA_SIGNATURE_QA_STAGING_ROOT is required with the frozen source root");
  const stagingRoot = assertAbsoluteNormalizedPath(
    suppliedStagingRoot,
    "CA_SIGNATURE_QA_STAGING_ROOT"
  );
  assert.equal(path.basename(stagingRoot), "source",
    "California composed staging root must be the exact layer-b/source directory");
  const layerBRoot = path.dirname(stagingRoot);
  assert.equal(path.basename(layerBRoot), "layer-b",
    "California composed staging root must be nested under layer-b");
  const runRoot = path.dirname(layerBRoot);
  assert.equal(
    frozenRoot,
    path.join(runRoot, "frozen-source"),
    "California frozen source root must be the exact sibling of layer-b"
  );
  assert.ok(runRoot.startsWith(`/Volumes/Starship${path.sep}`),
    "California composed source pair must remain on /Volumes/Starship");
  assert.notEqual(frozenRoot, stagingRoot,
    "California frozen source and composed staging roots must be disjoint");
  assert.match(
    env.CA_VIZ_SOURCE_SNAPSHOT_SHA256?.trim() ?? "",
    /^[a-f0-9]{64}$/,
    "CA_VIZ_SOURCE_SNAPSHOT_SHA256 must bind the composed source pair"
  );
  assertRegularPhysicalDirectory(runRoot, "California acceptance run root");
  assertRegularPhysicalDirectory(layerBRoot, "California Layer B root");
  assertRegularPhysicalDirectory(stagingRoot, "California composed staging root");
  assertRegularPhysicalDirectory(frozenRoot, "California frozen source root");
  assert.equal(lstatSync(frozenRoot).mode & 0o222, 0,
    "California frozen source root must remain read-only");
  return frozenRoot;
}
