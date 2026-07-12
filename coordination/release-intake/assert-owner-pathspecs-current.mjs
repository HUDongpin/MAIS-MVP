#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const releaseIntakeDir = path.join(root, "coordination", "release-intake");
const mapPath = path.join(releaseIntakeDir, "latest-A25-dirty-tree-map.json");

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/a(\d+)/g, "a$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function readLines(filePath) {
  return fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean).sort((left, right) => left.localeCompare(right));
}

function arraysEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function diffSample(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((item) => !actualSet.has(item)).slice(0, 20),
    extra: actual.filter((item) => !expectedSet.has(item)).slice(0, 20)
  };
}

function main() {
  const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const byOwner = new Map();
  for (const entry of map.entries) {
    if (!byOwner.has(entry.owner)) byOwner.set(entry.owner, []);
    byOwner.get(entry.owner).push(entry.path);
  }

  const failures = [];
  const checked = [];

  for (const [owner, paths] of [...byOwner.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    const expected = [...new Set(paths)].sort((left, right) => left.localeCompare(right));
    const pathspecFile = path.join(releaseIntakeDir, `latest-A25-owner-${slug(owner)}.pathspec`);
    if (!fs.existsSync(pathspecFile)) {
      failures.push({ owner, issue: "missing pathspec", pathspec: path.relative(root, pathspecFile) });
      continue;
    }

    const actual = readLines(pathspecFile);
    const ok = arraysEqual(expected, actual);
    checked.push({ owner, pathspec: path.relative(root, pathspecFile), expected: expected.length, actual: actual.length, ok });
    if (!ok) failures.push({ owner, issue: "pathspec mismatch", pathspec: path.relative(root, pathspecFile), ...diffSample(expected, actual) });
  }

  const payload = {
    checkedAt: new Date().toISOString(),
    dirtyMap: "coordination/release-intake/latest-A25-dirty-tree-map.json",
    dirtyMapStatusSignature: map.statusSignature,
    ownerCount: byOwner.size,
    checked,
    failures
  };

  fs.writeFileSync(path.join(releaseIntakeDir, "latest-A25-owner-pathspec-current-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);

  if (failures.length > 0) {
    console.error("A25 owner pathspec current gate failed.");
    for (const failure of failures) {
      console.error(`- ${failure.owner}: ${failure.issue} (${failure.pathspec})`);
    }
    process.exit(1);
  }

  console.log("A25 owner pathspec current gate passed");
  console.log(`Owners checked: ${checked.length}`);
}

main();
