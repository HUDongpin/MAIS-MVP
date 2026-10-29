// Captured release code and its reviewed dependency execute here. The Git snapshot is data only.
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  lstatSync,
  realpathSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, BUNDLE_PATHS } from "./constants.mjs";
import { snapshot, dependency, GIT_ENV } from "./repository.mjs";
import { need, same, hash, digest, parse, relative } from "./common.mjs";
import { validateSchema } from "./schema.mjs";
export const TYPESCRIPT_ENTRY = "node_modules/typescript/lib/typescript.js";
const inside = (root, file) => {
  const rel = path.relative(root, file);
  return (
    rel === "" ||
    (!rel.startsWith(".." + path.sep) && rel !== ".." && !path.isAbsolute(rel))
  );
};
export function verifyCapsuleTree(codeRoot, descriptor, descriptorHash) {
  validateSchema("code-capsule", descriptor);
  need(codeRoot === realpathSync(codeRoot), "CA_CAPSULE_ROOT");
  need(
    descriptor.snapshotRoot === realpathSync(descriptor.snapshotRoot) &&
      !inside(codeRoot, descriptor.snapshotRoot) &&
      !inside(descriptor.snapshotRoot, codeRoot),
    "CA_CAPSULE_SEPARATION",
  );
  same(
    descriptor.files.map((row) => row.path),
    BUNDLE_PATHS,
    "CA_CAPSULE_SCOPE",
  );
  need(
    digest({
      files: descriptor.files,
      dependencies: [descriptor.dependency],
    }) === descriptor.checkerBundleDigest,
    "CA_CAPSULE_BUNDLE",
  );
  need(descriptor.input.path === "observer-input.json", "CA_CAPSULE_INPUT");
  const expected = new Map(descriptor.files.map((row) => [row.path, row]));
  for (const row of descriptor.dependencyFiles) {
    relative(row.path);
    expected.set("node_modules/typescript/" + row.path, {
      path: "node_modules/typescript/" + row.path,
      mode: row.mode,
      sha256: row.sha256,
    });
  }
  expected.set("observer-input.json", {
    path: "observer-input.json",
    mode: "100644",
    sha256: descriptor.input.sha256,
  });
  expected.set("capsule.json", {
    path: "capsule.json",
    mode: "100644",
    sha256: descriptorHash,
  });
  const seen = [];
  function walk(rel = "") {
    for (const name of readdirSync(path.join(codeRoot, rel)).sort()) {
      const file = path.posix.join(rel, name),
        absolute = path.join(codeRoot, file),
        stat = lstatSync(absolute);
      need(
        !stat.isSymbolicLink() && realpathSync(absolute) === absolute,
        "CA_CAPSULE_FILE",
      );
      if (stat.isDirectory()) {
        walk(file);
        continue;
      }
      need(
        stat.isFile() && stat.nlink === 1 && stat.size <= 32 * 1024 * 1024,
        "CA_CAPSULE_FILE",
      );
      const binding = expected.get(file);
      need(binding, "CA_CAPSULE_SCOPE");
      need(
        hash(readFileSync(absolute)) === binding.sha256 &&
          (stat.mode & 0o111 ? "100755" : "100644") === binding.mode,
        "CA_CAPSULE_BYTES",
      );
      seen.push(file);
    }
  }
  walk();
  same(seen.sort(), [...expected.keys()].sort(), "CA_CAPSULE_SCOPE");
  const actual = dependency(codeRoot);
  same(actual.binding, descriptor.dependency, "CA_CAPSULE_DEPENDENCY");
  same(
    actual.files.map(({ bytes, ...row }) => row),
    descriptor.dependencyFiles,
    "CA_CAPSULE_DEPENDENCY",
  );
  need(
    actual.files.some((row) => row.path === "lib/typescript.js"),
    "CA_CAPSULE_ENTRY",
  );
  return {
    entryUrl: pathToFileURL(path.join(codeRoot, TYPESCRIPT_ENTRY)).href,
    entrySha256: actual.files.find((row) => row.path === "lib/typescript.js")
      .sha256,
  };
}
export function verifyDependencyResolution(
  proof,
  m,
  expectedDependency,
  entrySha256,
) {
  validateSchema("dependency-resolution", proof);
  need(
    proof.checkerReleaseCommit === m.checkerReleaseCommit &&
      proof.checkerBundleDigest === m.checkerBundleDigest &&
      proof.dependencyTreeDigest === expectedDependency.treeDigest &&
      proof.version === expectedDependency.version &&
      proof.entrySha256 === entrySha256,
    "CA_DEPENDENCY_RESOLUTION",
  );
  return proof;
}
export async function runCapturedObserver(
  repo,
  m,
  registry,
  expectedDependency,
) {
  const dep = dependency(repo.root);
  same(dep.binding, expectedDependency, "CA_DEPENDENCY_DRIFT");
  const files = BUNDLE_PATHS.map((file) =>
    repo.read(m.checkerReleaseCommit, { path: file }),
  );
  const bindings = files.map(({ bytes, ...row }) => row);
  need(
    digest({ files: bindings, dependencies: [dep.binding] }) ===
      m.checkerBundleDigest,
    "CA_CAPSULE_BUNDLE",
  );
  return snapshot(repo, async (dataRoot) => {
    execFileSync(
      "/usr/bin/git",
      ["init", "-q", "--bare", path.join(dataRoot, ".git")],
      { env: GIT_ENV, stdio: "ignore" },
    );
    const common = repo.line(
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    );
    writeFileSync(
      path.join(dataRoot, ".git/objects/info/alternates"),
      path.join(common, "objects") + "\n",
      { flag: "wx", mode: 0o600 },
    );
    writeFileSync(path.join(dataRoot, ".git/HEAD"), repo.head + "\n");
    const codeRoot = mkdtempSync(
      path.join(realpathSync("/tmp"), "CA-code-capsule-"),
    );
    try {
      const write = (file, bytes, mode = "100644") => {
        relative(file);
        const target = path.join(codeRoot, file);
        mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
        writeFileSync(target, bytes, {
          flag: "wx",
          mode: mode === "100755" ? 0o700 : 0o600,
        });
      };
      for (const file of files) write(file.path, file.bytes, file.mode);
      for (const file of dep.files)
        write("node_modules/typescript/" + file.path, file.bytes, file.mode);
      const input = Buffer.from(
        JSON.stringify({ manifest: m, registry, executionCommit: repo.head }),
      );
      write("observer-input.json", input);
      const descriptor = {
        schemaVersion: "ca-code-capsule.v1",
        snapshotRoot: dataRoot,
        executionCommit: repo.head,
        checkerReleaseCommit: m.checkerReleaseCommit,
        checkerBundleDigest: m.checkerBundleDigest,
        files: bindings,
        dependency: dep.binding,
        dependencyFiles: dep.files.map(({ bytes, ...row }) => row),
        input: { path: "observer-input.json", sha256: hash(input) },
      };
      const bytes = Buffer.from(JSON.stringify(descriptor)),
        descriptorHash = hash(bytes);
      write("capsule.json", bytes);
      const verified = verifyCapsuleTree(codeRoot, descriptor, descriptorHash);
      const child = spawnSync(
        process.execPath,
        [
          path.join(codeRoot, ROOT, "capsule-entry.mjs"),
          path.join(codeRoot, "capsule.json"),
          descriptorHash,
        ],
        {
          cwd: codeRoot,
          env: { ...GIT_ENV, NODE_ENV: "test" },
          timeout: 60000,
          maxBuffer: 32 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      need(
        !child.error &&
          [0, 2].includes(child.status) &&
          child.stderr.length === 0,
        "CA_CAPSULE_EXECUTION",
      );
      const result = parse(child.stdout);
      need(
        (child.status === 0 && result.result === "pass") ||
          (child.status === 2 && result.result === "blocked"),
        "CA_CAPSULE_OUTPUT",
      );
      verifyCapsuleTree(codeRoot, descriptor, descriptorHash);
      if (result.dependencyResolution)
        verifyDependencyResolution(
          result.dependencyResolution,
          m,
          dep.binding,
          verified.entrySha256,
        );
      if (result.result === "pass")
        need(result.dependencyResolution, "CA_DEPENDENCY_RESOLUTION");
      return result;
    } finally {
      rmSync(codeRoot, { recursive: true, force: true });
    }
  });
}
