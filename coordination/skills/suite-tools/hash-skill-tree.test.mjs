import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { hashSkillTree } from "./hash-skill-tree.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "mais-skill-hash-"));
  await mkdir(path.join(root, "agents"));
  await mkdir(path.join(root, "evals"));
  await writeFile(path.join(root, "SKILL.md"), "---\nname: fixture\n---\n", "utf8");
  await writeFile(path.join(root, "agents", "openai.yaml"), "interface: {}\n", "utf8");
  await writeFile(path.join(root, "evals", "evals.json"), "{}\n", "utf8");
  return root;
}

test("canonical hash is deterministic and path-sensitive", async () => {
  const root = await fixture();
  try {
    const first = hashSkillTree(root);
    const second = hashSkillTree(root);
    assert.equal(first.treeSha256, second.treeSha256);
    assert.equal(first.fileCount, 3);
    await writeFile(path.join(root, "agents", "openai.yaml"), "interface: { display_name: changed }\n", "utf8");
    assert.notEqual(hashSkillTree(root).treeSha256, first.treeSha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("package view exactly excludes root evals", async () => {
  const root = await fixture();
  try {
    const result = hashSkillTree(root, { packageView: true });
    assert.equal(result.fileCount, 2);
    assert(result.files.every((entry) => !entry.path.startsWith("evals/")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("symbolic links fail closed", async () => {
  const root = await fixture();
  try {
    await symlink(path.join(root, "SKILL.md"), path.join(root, "linked.md"));
    assert.throws(() => hashSkillTree(root), /symbolic link is not allowed/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
