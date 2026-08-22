import { lstatSync, realpathSync } from "node:fs";
import path from "node:path";

export const CALIFORNIA_SIGNATURE_PRODUCT_PROJECT_ROOT_ENV =
  "CA_SIGNATURE_PRODUCT_PROJECT_ROOT";

type CaliforniaSignatureProductRootEnvironment = Record<string, string | undefined>;

function exactPhysicalDirectory(value: string, label: string) {
  if (!value || value.trim() !== value) {
    throw new Error(`${label} must be one non-empty path without surrounding whitespace`);
  }
  if (!path.isAbsolute(value) || path.resolve(value) !== value) {
    throw new Error(`${label} must be one normalized absolute path`);
  }
  const identity = lstatSync(value);
  if (!identity.isDirectory() || identity.isSymbolicLink()) {
    throw new Error(`${label} must be one physical directory`);
  }
  const physical = realpathSync(value);
  if (physical !== value) {
    throw new Error(`${label} must name its exact physical directory`);
  }
  return physical;
}

function containsPath(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

/**
 * Resolve the immutable product source boundary for every static exhaustive
 * collector. In formal composed QA the process cwd is intentionally the
 * instrumented staging copy, so falling back to cwd would let instrumentation
 * redefine its own expected source contract.
 */
export function resolveCaliforniaSignatureProductProjectRoot(options: {
  cwd?: string;
  env?: CaliforniaSignatureProductRootEnvironment;
} = {}) {
  const env = options.env ?? process.env;
  const cwd = exactPhysicalDirectory(
    options.cwd ?? process.cwd(),
    "California signature collection cwd"
  );
  const composed = env.CA_VIZ_COMPOSED_QA_BUILD;
  if (composed !== undefined && composed !== "1") {
    throw new Error("CA_VIZ_COMPOSED_QA_BUILD must be exactly 1 when present");
  }
  const requested = env[CALIFORNIA_SIGNATURE_PRODUCT_PROJECT_ROOT_ENV];
  if (composed !== "1") {
    if (requested !== undefined) {
      throw new Error(
        `${CALIFORNIA_SIGNATURE_PRODUCT_PROJECT_ROOT_ENV} is reserved for formal composed QA`
      );
    }
    return cwd;
  }
  if (requested === undefined || requested.length === 0) {
    throw new Error(
      `${CALIFORNIA_SIGNATURE_PRODUCT_PROJECT_ROOT_ENV} is required for formal composed collection`
    );
  }
  const productRoot = exactPhysicalDirectory(
    requested,
    CALIFORNIA_SIGNATURE_PRODUCT_PROJECT_ROOT_ENV
  );
  const stagingValue = env.CA_SIGNATURE_QA_STAGING_ROOT;
  if (stagingValue === undefined || stagingValue.length === 0) {
    throw new Error("CA_SIGNATURE_QA_STAGING_ROOT is required for formal composed collection");
  }
  const stagingRoot = exactPhysicalDirectory(
    stagingValue,
    "CA_SIGNATURE_QA_STAGING_ROOT"
  );
  if (cwd !== stagingRoot) {
    throw new Error("formal composed collection cwd must equal CA_SIGNATURE_QA_STAGING_ROOT");
  }
  if (containsPath(productRoot, stagingRoot) || containsPath(stagingRoot, productRoot)) {
    throw new Error("formal product and instrumented staging roots must be disjoint");
  }
  return productRoot;
}
