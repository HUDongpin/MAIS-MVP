import { readFile, readdir, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { sha256, fingerprint } from "../promotion-gate-lib.mjs";
import { parsePromotionWorkflowJsonBytes } from "../../../scripts/promotion-workflow-json-guard.mjs";

export const DEPENDENCIES = ["ajv", "fast-deep-equal", "fast-uri", "json-schema-traverse", "require-from-string", "typescript", "yaml"];
export async function dependencyBindings(root) {
  const modules = path.join(root, "node_modules");
  const entry = await lstat(modules);
  if (!entry.isDirectory() || entry.isSymbolicLink() || await realpath(modules) !== modules) throw new Error("SUCCESSOR_DEPENDENCY_INSTALLATION_UNOWNED");
  const lock = parsePromotionWorkflowJsonBytes(await readFile(path.join(root, "package-lock.json")));
  const results = [];
  for (const name of DEPENDENCIES) {
    const directory = path.join(modules, name);
    if (await realpath(directory) !== directory) throw new Error("SUCCESSOR_DEPENDENCY_ALIAS");
    const pkg = parsePromotionWorkflowJsonBytes(await readFile(path.join(directory, "package.json")));
    const declared = lock.packages[`node_modules/${name}`];
    if (pkg.version !== declared?.version || typeof declared.integrity !== "string") throw new Error("SUCCESSOR_DEPENDENCY_LOCK_DRIFT");
    const rows = [];
    const visit = async relative => {
      for (const item of (await readdir(path.join(directory, relative))).sort()) {
        const current = path.posix.join(relative, item), absolute = path.join(directory, current), stat = await lstat(absolute);
        if (stat.isSymbolicLink()) throw new Error("SUCCESSOR_DEPENDENCY_SYMLINK");
        if (stat.isDirectory()) await visit(current);
        else if (stat.isFile()) rows.push([current, stat.mode & 0o111 ? "100755" : "100644", sha256(await readFile(absolute))]);
        else throw new Error("SUCCESSOR_DEPENDENCY_FILE_INVALID");
      }
    };
    await visit("");
    results.push({ name, version: pkg.version, integrity: declared.integrity, fileCount: rows.length, treeDigest: fingerprint(rows) });
  }
  return results;
}
