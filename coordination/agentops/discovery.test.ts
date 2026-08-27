import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFile = promisify(execFileCallback);

async function makeRepository(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "agentops-discovery-"));
  await execFile("git", ["init", "-q", root]);
  await execFile("git", ["-C", root, "config", "user.email", "agentops@example.invalid"]);
  await execFile("git", ["-C", root, "config", "user.name", "AgentOps Test"]);
  await mkdir(path.join(root, "coordination/release-intake"), { recursive: true });
  await writeFile(path.join(root, "AGENTS.md"), "# policy\n", "utf8");
  await writeFile(
    path.join(root, "coordination/release-intake/owner-pathspecs.json"),
    '{"packages":[]}\n',
    "utf8",
  );
  await writeFile(
    path.join(root, "coordination/release-intake/owner-package-manifest.json"),
    '{"packages":[]}\n',
    "utf8",
  );
  await writeFile(path.join(root, "README.md"), "safe\n", "utf8");
  await execFile("git", ["-C", root, "add", "AGENTS.md", "README.md", "coordination"]);
  await execFile("git", ["-C", root, "commit", "-qm", "fixture"]);
  return root;
}

test("registered probes return a deterministic repository snapshot without mutation", async () => {
  const { discoverRepository, validateRepositoryRoot } = await import("./discovery");
  const root = await makeRepository();
  const validated = await validateRepositoryRoot(root);
  const first = await discoverRepository({
    repoRoot: validated,
    probeIds: ["git.snapshot", "repo.policy-digests"],
    contextRefs: [{ kind: "repo-path", value: "README.md" }],
  });
  const second = await discoverRepository({
    repoRoot: validated,
    probeIds: ["repo.policy-digests", "git.snapshot"],
    contextRefs: [{ kind: "repo-path", value: "README.md" }],
  });

  assert.equal(first.repositorySnapshot.headSha, second.repositorySnapshot.headSha);
  assert.equal(first.repositorySnapshot.statusDigest, second.repositorySnapshot.statusDigest);
  assert.equal(first.repositorySnapshot.dirty, false);
  assert.match(first.repositorySnapshot.rootDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(first.executedProbeIds, ["git.snapshot", "repo.policy-digests"]);
});

test("discovery rejects unknown probes and repository-root mismatches", async () => {
  const { discoverRepository, validateRepositoryRoot } = await import("./discovery");
  const root = await makeRepository();
  const child = path.join(root, "coordination");

  await assert.rejects(() => validateRepositoryRoot(child), /root|mismatch/i);
  await assert.rejects(
    () =>
      discoverRepository({
        repoRoot: root,
        probeIds: ["prompt.supplied-command" as never],
        contextRefs: [],
      }),
    /registered|probe/i,
  );
});

test("context discovery rejects credential paths and symlink escapes", async () => {
  const { discoverRepository } = await import("./discovery");
  const root = await makeRepository();
  const outside = await mkdtemp(path.join(tmpdir(), "agentops-outside-"));
  await writeFile(path.join(outside, "external.txt"), "external\n", "utf8");
  await symlink(path.join(outside, "external.txt"), path.join(root, "escape.txt"));

  await assert.rejects(
    () =>
      discoverRepository({
        repoRoot: root,
        probeIds: ["repo.context-boundaries"],
        contextRefs: [{ kind: "repo-path", value: "escape.txt" }],
      }),
    /escape|outside|symlink/i,
  );
  await assert.rejects(
    () =>
      discoverRepository({
        repoRoot: root,
        probeIds: ["repo.context-boundaries"],
        contextRefs: [{ kind: "repo-path", value: ".env.local" }],
      }),
    /credential|forbidden|sensitive/i,
  );
});

test("fixed policy probes reject symlinked sources outside the repository", async () => {
  const { discoverRepository } = await import("./discovery");
  const root = await makeRepository();
  const outside = await mkdtemp(path.join(tmpdir(), "agentops-policy-outside-"));
  const externalPolicy = path.join(outside, "AGENTS.md");
  await writeFile(externalPolicy, "# External policy\n", "utf8");
  await unlink(path.join(root, "AGENTS.md"));
  await symlink(externalPolicy, path.join(root, "AGENTS.md"));

  await assert.rejects(
    () =>
      discoverRepository({
        repoRoot: root,
        probeIds: ["git.snapshot", "repo.policy-digests"],
        contextRefs: [],
      }),
    /policy|symlink|escape|outside/i,
  );
});

test("specialist preflight treats a symlinked currentness marker as unavailable", async () => {
  const { discoverRepository } = await import("./discovery");
  const root = await makeRepository();
  const outside = await mkdtemp(path.join(tmpdir(), "agentops-specialist-outside-"));
  const externalMarker = path.join(outside, "reviewed-current.json");
  await writeFile(externalMarker, '{"reviewed":true}\n', "utf8");
  await mkdir(path.join(root, "coordination/content-qa"), { recursive: true });
  await mkdir(path.join(root, "coordination/agentops/currentness"), {
    recursive: true,
  });
  await symlink(
    externalMarker,
    path.join(
      root,
      "coordination/agentops/currentness/question-machine-qa.reviewed-current.json",
    ),
  );

  const discovery = await discoverRepository({
    repoRoot: root,
    probeIds: ["git.snapshot", "repo.specialist-availability"],
    contextRefs: [],
  });
  assert.equal(discovery.specialistAvailability["question-machine-qa.v1"], false);
});

test("tracked status mutation guard fails closed", async () => {
  const { assertTrackedStatusUnchanged } = await import("./discovery");
  assert.throws(
    () => assertTrackedStatusUnchanged("before", "after"),
    /modified|tracked|mutation/i,
  );
});
