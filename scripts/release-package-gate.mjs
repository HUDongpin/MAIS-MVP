#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_MANIFEST = path.join(REPO_ROOT, "coordination", "release-intake", "owner-package-manifest.json");
const DEFAULT_OWNER_PATHSPECS = path.join(REPO_ROOT, "coordination", "release-intake", "owner-pathspecs.json");
const ALLOWED_FINAL_STATES = new Set([
  "reviewed commit",
  "owner-approved discard",
  "evidence archive",
  "blocker report"
]);

function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    ownerPathspecs: DEFAULT_OWNER_PATHSPECS,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--manifest") {
      options.manifest = resolvePath(argv[++index]);
    } else if (arg === "--owner-pathspecs") {
      options.ownerPathspecs = resolvePath(argv[++index]);
    } else if (arg === "--json") {
      options.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function resolvePath(value) {
  if (!value) throw new Error("Expected a path value.");
  return path.isAbsolute(value) ? value : path.resolve(REPO_ROOT, value);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export function compileOwnerPathspecManifest(manifest) {
  const packages = (manifest.packages ?? []).map((pkg, packageIndex) => ({
    ...pkg,
    packageIndex,
    precedence: Number(pkg.precedence ?? 0),
    matchers: (pkg.pathspecs ?? []).map((pathspec, pathspecIndex) => ({
      pathspec,
      pathspecIndex,
      matcher: pathspecToRegExp(pathspec),
      specificity: pathspecSpecificity(pathspec)
    }))
  }));
  return { manifest, packages };
}

export function resolveOwnerPath(filePath, compiledManifest) {
  const normalized = toPosix(String(filePath).replace(/^\/+/, ""));
  const matches = [];

  for (const pkg of compiledManifest.packages) {
    for (const matcher of pkg.matchers) {
      if (matcher.matcher.test(normalized)) {
        matches.push({
          pkg,
          pathspec: matcher.pathspec,
          pathspecIndex: matcher.pathspecIndex,
          specificity: matcher.specificity,
          precedence: pkg.precedence
        });
      }
    }
  }

  if (matches.length === 0) {
    return {
      status: "unmapped",
      ownerId: "UNMAPPED",
      packageId: "unmapped",
      finalOwners: [],
      rawMatchCount: 0,
      topCandidateCount: 0,
      matchedPathspec: null,
      secretQuarantine: false
    };
  }

  matches.sort(compareOwnerMatches);
  const best = matches[0];
  const topMatches = matches.filter(
    (candidate) => candidate.precedence === best.precedence && candidate.specificity === best.specificity
  );
  const finalOwners = [...new Set(topMatches.map((candidate) => candidate.pkg.owner))].sort();

  if (finalOwners.length !== 1) {
    return {
      status: "ambiguous",
      ownerId: "AMBIGUOUS",
      packageId: "ambiguous",
      finalOwners,
      rawMatchCount: matches.length,
      topCandidateCount: topMatches.length,
      matchedPathspec: null,
      specificity: best.specificity,
      precedence: best.precedence,
      secretQuarantine: false
    };
  }

  const selected = topMatches.find((candidate) => candidate.pkg.owner === finalOwners[0]);
  return {
    status: "resolved",
    ownerId: selected.pkg.owner,
    owner: `${selected.pkg.owner} ${selected.pkg.role ?? ""}`.trim(),
    role: selected.pkg.role,
    packageId: selected.pkg.id,
    slice: selected.pkg.slice,
    finalOwners,
    rawMatchCount: matches.length,
    topCandidateCount: topMatches.length,
    matchedPathspec: selected.pathspec,
    specificity: selected.specificity,
    precedence: selected.precedence,
    secretQuarantine: Boolean(selected.pkg.secretQuarantine)
  };
}

function compareOwnerMatches(left, right) {
  return right.precedence - left.precedence ||
    right.specificity - left.specificity ||
    left.pkg.packageIndex - right.pkg.packageIndex ||
    left.pathspecIndex - right.pathspecIndex;
}

function pathspecToRegExp(pathspec) {
  const normalized = toPosix(String(pathspec).replace(/^\/+/, ""));
  let pattern = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    const afterNext = normalized[index + 2];
    if (char === "*" && next === "*" && afterNext === "/") {
      pattern += "(?:.*/)?";
      index += 2;
    } else if (char === "*" && next === "*") {
      pattern += ".*";
      index += 1;
    } else if (char === "*") {
      pattern += "[^/]*";
    } else {
      pattern += escapeRegExp(char);
    }
  }
  return new RegExp(`^${pattern}$`);
}

function pathspecSpecificity(pathspec) {
  const text = String(pathspec);
  const literalLength = text.replace(/\*/g, "").length;
  const wildcardCount = (text.match(/\*/g) ?? []).length;
  return literalLength * 100 - wildcardCount;
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

export function validateOwnerPathspecManifest(manifest) {
  const errors = [];
  const packages = Array.isArray(manifest.packages) ? manifest.packages : [];
  const packageIds = new Set();
  const exactPathspecOwners = new Map();

  if (packages.length === 0) {
    errors.push("owner-pathspecs.json must contain at least one package.");
  }

  for (const [index, pkg] of packages.entries()) {
    const label = pkg?.id || `owner package[${index}]`;
    const pathspecs = Array.isArray(pkg?.pathspecs) ? pkg.pathspecs : [];
    if (!pkg?.id) {
      errors.push(`${label}: missing id.`);
    } else if (packageIds.has(pkg.id)) {
      errors.push(`${label}: duplicate id.`);
    } else {
      packageIds.add(pkg.id);
    }
    if (!pkg?.owner) errors.push(`${label}: missing owner.`);
    if (pathspecs.length === 0) errors.push(`${label}: missing pathspecs.`);
    if (pkg?.precedence !== undefined && !Number.isFinite(Number(pkg.precedence))) {
      errors.push(`${label}: precedence must be a finite number.`);
    }

    for (const pathspec of pathspecs) {
      if (typeof pathspec !== "string" || pathspec.trim() === "") {
        errors.push(`${label}: pathspecs must be non-empty strings.`);
        continue;
      }
      if (isForbiddenDotPathspec(pathspec)) {
        errors.push(`${label}: pathspec "${pathspec}" is forbidden because it enables git add .; use owner pathspecs instead.`);
      }
      if (pathspec.includes("\0")) errors.push(`${label}: pathspec contains a NUL byte.`);

      const normalized = toPosix(pathspec);
      const key = `${Number(pkg.precedence ?? 0)}\0${normalized}`;
      const owners = exactPathspecOwners.get(key) ?? new Set();
      owners.add(pkg.owner);
      exactPathspecOwners.set(key, owners);
    }
  }

  for (const [key, owners] of exactPathspecOwners) {
    if (owners.size > 1) {
      const pathspec = key.split("\0").at(-1);
      errors.push(`Owner pathspec "${pathspec}" has ambiguous equal-precedence owners: ${[...owners].sort().join(", ")}.`);
    }
  }

  const compiled = compileOwnerPathspecManifest(manifest);
  const resolutionChecks = Array.isArray(manifest.resolutionChecks) ? manifest.resolutionChecks : [];
  if (resolutionChecks.length === 0) {
    errors.push("owner-pathspecs.json must include resolutionChecks for known overlapping pathspecs.");
  }

  const resolutions = resolutionChecks.map((check, index) => {
    const resolution = resolveOwnerPath(check?.path ?? "", compiled);
    const label = check?.path || `resolutionChecks[${index}]`;
    if (resolution.status !== "resolved" || resolution.finalOwners.length !== 1) {
      errors.push(`${label}: expected exactly one final owner, got ${resolution.status} (${resolution.finalOwners.join(", ") || "none"}).`);
    } else if (check.expectedOwner && resolution.ownerId !== check.expectedOwner) {
      errors.push(`${label}: expected owner ${check.expectedOwner}, got ${resolution.ownerId}.`);
    }
    return {
      path: check?.path,
      expectedOwner: check?.expectedOwner,
      status: resolution.status,
      ownerId: resolution.ownerId,
      rawMatchCount: resolution.rawMatchCount,
      topCandidateCount: resolution.topCandidateCount
    };
  });

  return {
    valid: errors.length === 0,
    errors,
    packageCount: packages.length,
    resolutionCheckCount: resolutionChecks.length,
    resolutions,
    compiled
  };
}

function validatePackageManifest(manifest) {
  const errors = [];
  const packages = Array.isArray(manifest.packages) ? manifest.packages : [];
  const packageIds = new Set();

  if (packages.length === 0) {
    errors.push("owner-package-manifest.json must contain at least one package.");
  }

  for (const [index, pkg] of packages.entries()) {
    const label = pkg?.id || `package[${index}]`;
    const pathspecs = Array.isArray(pkg?.pathspecs) ? pkg.pathspecs : [];
    const checks = Array.isArray(pkg?.checks) ? pkg.checks : [];

    if (!pkg?.id) {
      errors.push(`${label}: missing id.`);
    } else if (packageIds.has(pkg.id)) {
      errors.push(`${label}: duplicate id.`);
    } else {
      packageIds.add(pkg.id);
    }
    if (!pkg?.owner) errors.push(`${label}: missing owner.`);
    if (pathspecs.length === 0) errors.push(`${label}: missing pathspecs.`);
    if (checks.length === 0) errors.push(`${label}: missing checks.`);
    if (!ALLOWED_FINAL_STATES.has(pkg?.finalState)) {
      errors.push(
        `${label}: invalid final state "${pkg?.finalState}". Allowed final states: ${[...ALLOWED_FINAL_STATES].join(", ")}.`
      );
    }

    for (const pathspec of pathspecs) {
      if (typeof pathspec !== "string" || pathspec.trim() === "") {
        errors.push(`${label}: pathspecs must be non-empty strings.`);
        continue;
      }
      if (isForbiddenDotPathspec(pathspec)) {
        errors.push(`${label}: pathspec "${pathspec}" is forbidden because it enables git add .; use owner pathspecs instead.`);
      }
      if (pathspec.includes("\0")) {
        errors.push(`${label}: pathspec contains a NUL byte.`);
      }
    }

    if (pkg?.finalState === "blocker report" && !pkg?.blocker) {
      errors.push(`${label}: blocker report final state requires a blocker explanation.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    packageCount: packages.length,
    allowedFinalStates: [...ALLOWED_FINAL_STATES],
    packages: packages.map((pkg) => ({
      id: pkg.id,
      owner: pkg.owner,
      pathspecCount: Array.isArray(pkg.pathspecs) ? pkg.pathspecs.length : 0,
      checkCount: Array.isArray(pkg.checks) ? pkg.checks.length : 0,
      finalState: pkg.finalState
    }))
  };
}

function validatePackagePathCoverage(manifest, compiledOwnerPathspecs) {
  const errors = [];
  const resolutions = [];
  const wildcardResolutions = [];
  for (const pkg of manifest.packages ?? []) {
    for (const pathspec of pkg.pathspecs ?? []) {
      if (typeof pathspec !== "string") continue;
      if (hasWildcardPattern(pathspec)) {
        const resolution = resolveExactWildcardRoute(pathspec, compiledOwnerPathspecs);
        wildcardResolutions.push({
          packageId: pkg.id,
          path: pathspec,
          status: resolution.status,
          ownerId: resolution.ownerId,
          finalOwners: resolution.finalOwners
        });
        if (resolution.status !== "resolved" || resolution.finalOwners.length !== 1) {
          errors.push(
            `${pkg.id ?? "package"}: wildcard pathspec "${pathspec}" requires an exact owner pathspec route with exactly one final owner; got ${resolution.status}.`
          );
        }
        continue;
      }
      const resolution = resolveOwnerPath(pathspec, compiledOwnerPathspecs);
      resolutions.push({
        packageId: pkg.id,
        path: pathspec,
        status: resolution.status,
        ownerId: resolution.ownerId,
        finalOwners: resolution.finalOwners
      });
      if (resolution.status !== "resolved" || resolution.finalOwners.length !== 1) {
        errors.push(
          `${pkg.id ?? "package"}: exact pathspec "${pathspec}" must resolve to exactly one final owner; got ${resolution.status}.`
        );
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    exactPathCheckCount: resolutions.length,
    wildcardPathCheckCount: wildcardResolutions.length,
    resolutions,
    wildcardResolutions
  };
}

function resolveExactWildcardRoute(pathspec, compiledOwnerPathspecs) {
  const normalized = toPosix(String(pathspec).trim());
  const matches = [];
  for (const pkg of compiledOwnerPathspecs.packages) {
    for (const matcher of pkg.matchers) {
      if (toPosix(String(matcher.pathspec).trim()) !== normalized) continue;
      matches.push({
        pkg,
        pathspec: matcher.pathspec,
        pathspecIndex: matcher.pathspecIndex,
        specificity: matcher.specificity,
        precedence: pkg.precedence
      });
    }
  }

  if (matches.length === 0) {
    return { status: "missing", ownerId: "UNMAPPED", finalOwners: [] };
  }

  matches.sort(compareOwnerMatches);
  const best = matches[0];
  const topMatches = matches.filter(
    (candidate) => candidate.precedence === best.precedence && candidate.specificity === best.specificity
  );
  const finalOwners = [...new Set(topMatches.map((candidate) => candidate.pkg.owner))].sort();
  if (finalOwners.length !== 1) {
    return { status: "ambiguous", ownerId: "AMBIGUOUS", finalOwners };
  }
  return { status: "resolved", ownerId: finalOwners[0], finalOwners };
}

function hasWildcardPattern(pathspec) {
  return /[*?\[]/.test(String(pathspec));
}

function isForbiddenDotPathspec(pathspec) {
  const normalized = normalizeFullTreePathspec(pathspec);
  if (normalized.literal) return false;
  if (normalized.value === "" || normalized.value === ".") return true;
  const segments = normalized.value.split("/").filter(Boolean);
  return segments.length > 0 && segments.every((segment) => segment === "*" || segment === "**");
}

function normalizeFullTreePathspec(pathspec) {
  let value = toPosix(String(pathspec).trim());
  let literal = false;

  if (value.startsWith(":/")) {
    value = value.slice(2);
  } else {
    const magic = value.match(/^:\(([^)]*)\)(.*)$/);
    if (magic) {
      const magicWords = magic[1].split(",").map((word) => word.trim());
      literal = magicWords.includes("literal");
      value = magic[2];
    }
  }

  while (value.startsWith("./")) value = value.slice(2);
  value = value.replace(/^\/+/, "").replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return { value, literal };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const manifest = await readJson(options.manifest);
  const ownerPathspecs = await readJson(options.ownerPathspecs);
  const packageResult = validatePackageManifest(manifest);
  const ownerResult = validateOwnerPathspecManifest(ownerPathspecs);
  const coverage = validatePackagePathCoverage(manifest, ownerResult.compiled);
  const errors = [...packageResult.errors, ...ownerResult.errors, ...coverage.errors];
  const result = {
    ...packageResult,
    valid: errors.length === 0,
    errors,
    ownerPathspecs: {
      valid: ownerResult.valid,
      packageCount: ownerResult.packageCount,
      resolutionCheckCount: ownerResult.resolutionCheckCount,
      resolutions: ownerResult.resolutions
    },
    coverage: {
      valid: coverage.valid,
      exactPathCheckCount: coverage.exactPathCheckCount,
      wildcardPathCheckCount: coverage.wildcardPathCheckCount,
      resolutions: coverage.resolutions,
      wildcardResolutions: coverage.wildcardResolutions
    }
  };

  if (!result.valid) {
    if (options.json) console.log(JSON.stringify(result, null, 2));
    throw new Error(["Owner package gate failed:", ...result.errors.map((error) => `- ${error}`)].join("\n"));
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("Owner package gate passed");
  console.log(`Packages: ${result.packageCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
