import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { canonicalJson, sha256Digest } from "./canonical";

const execFile = promisify(execFileCallback);
const POLICY_PATHS = [
  "AGENTS.md",
  "package.json",
  "package-lock.json",
  "coordination/agentops/artifacts.ts",
  "coordination/agentops/bin/agentops",
  "coordination/agentops/canonical.ts",
  "coordination/agentops/currentness.ts",
  "coordination/agentops/discovery.ts",
  "coordination/agentops/registry.ts",
  "coordination/agentops/workflow.ts",
  "coordination/release-intake/owner-pathspecs.json",
  "coordination/release-intake/owner-package-manifest.json",
] as const;

async function git(root: string, ...args: string[]): Promise<string> {
  return (
    await execFile("git", ["-C", root, ...args], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    })
  ).stdout.trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashTree(
  root: string,
  packageView: boolean,
): Promise<{ readonly fileCount: number; readonly treeSha256: string }> {
  const files: { path: string; sha256: string }[] = [];
  async function visit(current: string): Promise<void> {
    const entries = (await readdir(current, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    );
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (packageView && relative.split("/")[0] === "evals") continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) {
        files.push({ path: relative, sha256: sha256(await readFile(absolute)) });
      }
    }
  }
  await visit(root);
  return {
    fileCount: files.length,
    treeSha256: sha256(
      files.map((entry) => `${entry.path}\0${entry.sha256}\n`).join(""),
    ),
  };
}

async function makeIntegratedRepository(): Promise<{
  readonly root: string;
  readonly expectation: Record<string, unknown>;
  readonly snapshot: Record<string, string>;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "agentops-currentness-"));
  await git(root, "init", "-q");
  await git(root, "config", "user.email", "agentops@example.invalid");
  await git(root, "config", "user.name", "AgentOps Test");
  for (const repositoryPath of POLICY_PATHS) {
    const absolute = path.join(root, repositoryPath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, `${repositoryPath}\n`, "utf8");
  }
  await git(root, "add", ...POLICY_PATHS);
  await git(root, "commit", "-qm", "reviewed base and policies");
  const baseCommit = await git(root, "rev-parse", "HEAD");

  const packagePath =
    "coordination/skills/mais-rsi-machine-qa-workflow";
  const packageRoot = path.join(root, packagePath);
  await mkdir(path.join(packageRoot, "evals"), { recursive: true });
  await writeFile(path.join(packageRoot, "SKILL.md"), "---\nname: fixture\n---\n", "utf8");
  await writeFile(path.join(packageRoot, "evals/evals.json"), "{}\n", "utf8");
  await git(root, "add", packagePath);
  await git(root, "commit", "-qm", "exact source");
  const sourceCommit = await git(root, "rev-parse", "HEAD");
  const source = await hashTree(packageRoot, false);
  const packageView = await hashTree(packageRoot, true);
  const packageArchiveSha256 = sha256("fixture archive");

  const manifestPath = "coordination/skills/suite-manifest.json";
  const receiptPath =
    "coordination/skills/benchmarks/installation-receipt.json";
  const receipt = {
    schemaVersion: "1.0",
    suiteVersion: "1.0.0",
    sourceCommit,
    components: [
      {
        name: "mais-rsi-machine-qa-workflow",
        sourceTreeSha256: source.treeSha256,
        sourceFileCount: source.fileCount,
        packageViewTreeSha256: packageView.treeSha256,
        packageFileCount: packageView.fileCount,
        packageArchiveSha256,
        installedReadbackTreeSha256: packageView.treeSha256,
      },
    ],
  };
  const receiptText = `${JSON.stringify(receipt, null, 2)}\n`;
  const installationReceiptSha256 = sha256(receiptText);
  const manifest = {
    schemaVersion: "1.0",
    suiteName: "mais-question-qa-skill-suite",
    suiteVersion: "1.0.0",
    status: "source-package-installation-verified",
    baseline: { repository: "MAIS-MVP", originMainCommit: baseCommit },
    components: [
      {
        name: "mais-rsi-machine-qa-workflow",
        sourceHash: source.treeSha256,
        sourceFileCount: source.fileCount,
        packageViewHash: packageView.treeSha256,
        packageFileCount: packageView.fileCount,
        packageHash: packageArchiveSha256,
        sourceCommit,
        installation: {
          state: "installed-verified",
          readbackHash: packageView.treeSha256,
          readbackFileCount: packageView.fileCount,
        },
      },
    ],
    installationReceipt: {
      path: "benchmarks/installation-receipt.json",
      sha256: installationReceiptSha256,
      status: "installed-readback-and-rollback-verified",
    },
  };
  await mkdir(path.dirname(path.join(root, receiptPath)), { recursive: true });
  await writeFile(path.join(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(root, receiptPath), receiptText, "utf8");
  await git(root, "add", manifestPath, receiptPath);
  await git(root, "commit", "-qm", "receipt tip");
  const receiptCommit = await git(root, "rev-parse", "HEAD");

  return {
    root,
    expectation: {
      workflowId: "question-machine-qa.v1",
      markerPath:
        "coordination/agentops/currentness/question-machine-qa.reviewed-current.json",
      claimCeiling: "machine-qa-packet-only",
      registryDigest: sha256Digest({ registry: "fixture" }),
      reviewedRepository: {
        reviewedMainCommit: baseCommit,
        agentopsCommit: baseCommit,
      },
      reviewedSource: {
        baseCommit,
        sourceCommit,
        receiptCommit,
        packageName: "mais-rsi-machine-qa-workflow",
        packagePath,
        sourceTreeSha256: source.treeSha256,
        packageViewSha256: packageView.treeSha256,
        packageArchiveSha256,
        installedReadbackSha256: packageView.treeSha256,
        installationReceiptSha256,
      },
    },
    snapshot: {
      reviewedMainCommit: baseCommit,
      agentopsCommit: baseCommit,
      integrationCommit: receiptCommit,
    },
  };
}

async function commitMarker(
  currentness: typeof import("./currentness"),
  fixture: Awaited<ReturnType<typeof makeIntegratedRepository>>,
): Promise<Readonly<Record<string, unknown>>> {
  const marker = await currentness.createSpecialistCurrentnessMarker({
    repoRoot: fixture.root,
    expectation: fixture.expectation,
    repositorySnapshot: fixture.snapshot,
  });
  const markerRepositoryPath = fixture.expectation.markerPath as string;
  const markerPath = path.join(fixture.root, markerRepositoryPath);
  await mkdir(path.dirname(markerPath), { recursive: true });
  await writeFile(markerPath, `${canonicalJson(marker)}\n`, "utf8");
  await git(fixture.root, "add", markerRepositoryPath);
  await git(fixture.root, "commit", "-qm", "currentness marker");
  return marker;
}

test("a canonical marker makes only its exact clean integrated workflow current", async () => {
  const currentness = await import("./currentness");
  assert.equal(
    typeof (currentness as Record<string, unknown>)
      .createSpecialistCurrentnessMarker,
    "function",
  );
  const fixture = await makeIntegratedRepository();
  try {
    const marker = await commitMarker(currentness, fixture);

    const result = await currentness.verifySpecialistCurrentnessMarker({
      repoRoot: fixture.root,
      expectation: fixture.expectation,
    });
    assert.deepEqual(result, {
      available: true,
      status: "current",
      reasonCodes: [],
      markerDigest: marker.markerDigest,
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a rehashed marker cannot choose a different reviewed repository baseline", async () => {
  const currentness = await import("./currentness");
  const fixture = await makeIntegratedRepository();
  try {
    const marker = await commitMarker(currentness, fixture);
    const markerRepositoryPath = fixture.expectation.markerPath as string;
    const markerPath = path.join(fixture.root, markerRepositoryPath);

    const body = { ...marker } as Record<string, unknown>;
    delete body.markerDigest;
    body.repositorySnapshot = {
      ...(body.repositorySnapshot as Record<string, unknown>),
      reviewedMainCommit: (
        fixture.expectation.reviewedSource as Record<string, string>
      ).sourceCommit,
    };
    const forged = { ...body, markerDigest: sha256Digest(body) };
    await writeFile(markerPath, `${canonicalJson(forged)}\n`, "utf8");
    await git(fixture.root, "add", markerRepositoryPath);
    await git(fixture.root, "commit", "-qm", "rehashed baseline substitution");

    const result = await currentness.verifySpecialistCurrentnessMarker({
      repoRoot: fixture.root,
      expectation: fixture.expectation,
    });
    assert.equal(result.available, false);
    assert.deepEqual(result.reasonCodes, ["REVIEWED_BASELINE_MISMATCH"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("committed Skill tree drift invalidates the marker", async () => {
  const currentness = await import("./currentness");
  const fixture = await makeIntegratedRepository();
  try {
    await commitMarker(currentness, fixture);
    const skillPath = path.join(
      fixture.root,
      "coordination/skills/mais-rsi-machine-qa-workflow/SKILL.md",
    );
    await writeFile(skillPath, "---\nname: drifted\n---\n", "utf8");
    await git(fixture.root, "add", path.relative(fixture.root, skillPath));
    await git(fixture.root, "commit", "-qm", "drift package");

    const result = await currentness.verifySpecialistCurrentnessMarker({
      repoRoot: fixture.root,
      expectation: fixture.expectation,
    });
    assert.equal(result.available, false);
    assert.deepEqual(result.reasonCodes, ["SOURCE_PACKAGE_DRIFT"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("committed currentness policy drift invalidates the marker", async () => {
  const currentness = await import("./currentness");
  const fixture = await makeIntegratedRepository();
  try {
    await commitMarker(currentness, fixture);
    const policyPath = path.join(
      fixture.root,
      "coordination/agentops/workflow.ts",
    );
    await writeFile(policyPath, "policy drift\n", "utf8");
    await git(fixture.root, "add", path.relative(fixture.root, policyPath));
    await git(fixture.root, "commit", "-qm", "drift policy");

    const result = await currentness.verifySpecialistCurrentnessMarker({
      repoRoot: fixture.root,
      expectation: fixture.expectation,
    });
    assert.equal(result.available, false);
    assert.deepEqual(result.reasonCodes, ["INTEGRATION_SNAPSHOT_DRIFT"]);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
