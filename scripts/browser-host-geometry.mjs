import { lstatSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

const CANONICAL_STARSHIP_ROOT = "/Volumes/Starship";

function isStrictDescendant(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function canonicalExistingDirectory(label, candidate) {
  if (typeof candidate !== "string" || !path.isAbsolute(candidate)) {
    throw new Error(`${label} must be an absolute path.`);
  }
  const absolute = path.resolve(candidate);
  const entry = lstatSync(absolute, { throwIfNoEntry: false });
  if (!entry) throw new Error(`${label} must already exist: ${absolute}`);
  if (entry.isSymbolicLink()) throw new Error(`${label} must not be a symlink: ${absolute}`);
  if (!entry.isDirectory()) throw new Error(`${label} must be a directory: ${absolute}`);
  const canonical = realpathSync(absolute);
  if (canonical !== absolute) {
    throw new Error(`${label} must have no symlink chain and be canonical: ${absolute}`);
  }
  return canonical;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function validateCanonicalBrowserHostGeometry({
  filesystemRoot,
  repoDevice,
  repoRoot,
  rootDevice,
  volumeDevice,
  volumeRoot
} = {}) {
  if (volumeRoot !== CANONICAL_STARSHIP_ROOT) {
    throw new Error(`canonical Starship mount must resolve exactly to ${CANONICAL_STARSHIP_ROOT}.`);
  }
  if (filesystemRoot !== path.parse(volumeRoot).root) {
    throw new Error("canonical Starship filesystem root is invalid.");
  }
  if (typeof repoRoot !== "string" || !isStrictDescendant(repoRoot, volumeRoot)) {
    throw new Error(`browser repository root must be a strict descendant of ${volumeRoot}.`);
  }
  if (volumeDevice === rootDevice) {
    throw new Error(`${volumeRoot} is not a physically distinct mounted filesystem.`);
  }
  if (repoDevice !== volumeDevice) {
    throw new Error(`browser repository root is not physically stored on ${volumeRoot}.`);
  }
  return deepFreeze({ repoRoot, volumeDevice, volumeRoot });
}

export function assertCanonicalStarshipBrowserHost({ repoRoot } = {}) {
  const volumeRoot = canonicalExistingDirectory(
    "canonical Starship mount",
    CANONICAL_STARSHIP_ROOT
  );
  const canonicalRepoRoot = canonicalExistingDirectory("browser repository root", repoRoot);
  const filesystemRoot = path.parse(volumeRoot).root;
  return validateCanonicalBrowserHostGeometry({
    filesystemRoot,
    repoDevice: String(statSync(canonicalRepoRoot).dev),
    repoRoot: canonicalRepoRoot,
    rootDevice: String(statSync(filesystemRoot).dev),
    volumeDevice: String(statSync(volumeRoot).dev),
    volumeRoot
  });
}
