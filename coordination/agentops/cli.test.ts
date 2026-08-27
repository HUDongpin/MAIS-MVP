import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import { sha256Digest } from "./canonical";
import { requestFixture } from "./test-fixtures";

const execFile = promisify(execFileCallback);

async function makeCliRepository(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "agentops-cli-"));
  await execFile("git", ["init", "-q", root]);
  await execFile("git", ["-C", root, "config", "user.email", "agentops@example.invalid"]);
  await execFile("git", ["-C", root, "config", "user.name", "AgentOps Test"]);
  await mkdir(path.join(root, "coordination/release-intake"), { recursive: true });
  await mkdir(path.join(root, "app/parent"), { recursive: true });
  await writeFile(path.join(root, "AGENTS.md"), "# Agent policy\n", "utf8");
  await writeFile(path.join(root, ".gitignore"), ".local/\n", "utf8");
  await writeFile(path.join(root, "app/parent/page.tsx"), "export default null;\n", "utf8");
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
  await execFile("git", ["-C", root, "add", "."]);
  await execFile("git", ["-C", root, "commit", "-qm", "fixture"]);
  return root;
}

function captureIo(cwd: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      cwd,
      stdout: (value: string) => stdout.push(value),
      stderr: (value: string) => stderr.push(value),
    },
    stdout,
    stderr,
  };
}

test("CLI run, status, and verify emit strict JSON artifacts", async () => {
  const { runCli } = await import("./cli");
  const repoRoot = await makeCliRepository();
  const requestPath = path.join(repoRoot, "request.json");
  await writeFile(
    requestPath,
    `${JSON.stringify(requestFixture())}\n`,
    "utf8",
  );
  const trackedStatusBefore = (
    await execFile("git", [
      "-C",
      repoRoot,
      "status",
      "--porcelain=v1",
      "--untracked-files=no",
    ])
  ).stdout;
  const runCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["run", "--request", requestPath, "--repo", repoRoot, "--json"],
      runCapture.io,
    ),
    0,
    runCapture.stderr.join("\n"),
  );
  const runResult = JSON.parse(runCapture.stdout.join("")) as {
    runId: string;
    terminalStatus: string;
    handoff: { handoffDigest: string };
  };
  assert.equal(runResult.terminalStatus, "handoff-ready");
  assert.match(runResult.handoff.handoffDigest, /^[a-f0-9]{64}$/);

  const statusCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["status", "--run-id", runResult.runId, "--repo", repoRoot, "--json"],
      statusCapture.io,
    ),
    0,
  );
  const status = JSON.parse(statusCapture.stdout.join("")) as {
    integrity: { ok: boolean };
    eventCount: number;
    terminalStatus: string;
  };
  assert.equal(status.integrity.ok, true);
  assert.equal(status.eventCount, 8);
  assert.equal(status.terminalStatus, "handoff-ready");

  const handoffPath = path.join(
    repoRoot,
    ".local",
    "agentops",
    runResult.runId,
    "handoff.json",
  );
  const verifyCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(["verify", "--handoff", handoffPath], verifyCapture.io),
    0,
  );
  assert.equal(
    (JSON.parse(verifyCapture.stdout.join("")) as { ok: boolean }).ok,
    true,
  );

  const validHandoff = JSON.parse(await readFile(handoffPath, "utf8")) as Record<
    string,
    unknown
  >;
  const { handoffDigest: _discarded, ...validHandoffBody } = validHandoff;
  const forgedHandoffBody = {
    ...validHandoffBody,
    route: {
      ...(validHandoffBody.route as Record<string, unknown>),
      primaryLane: "A13",
    },
  };
  const forgedHandoffPath = path.join(repoRoot, ".local", "forged-handoff.json");
  await writeFile(
    forgedHandoffPath,
    `${JSON.stringify({
      ...forgedHandoffBody,
      handoffDigest: sha256Digest(forgedHandoffBody),
    })}\n`,
    "utf8",
  );
  const forgedCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(["verify", "--handoff", forgedHandoffPath], forgedCapture.io),
    1,
  );
  assert.ok(
    (JSON.parse(forgedCapture.stdout.join("")) as { errors: string[] }).errors.some(
      (message) => /contract|route|identity|stale/i.test(message),
    ),
  );
  const trackedStatusAfter = (
    await execFile("git", [
      "-C",
      repoRoot,
      "status",
      "--porcelain=v1",
      "--untracked-files=no",
    ])
  ).stdout;
  assert.equal(trackedStatusAfter, trackedStatusBefore);
  assert.equal(
    (await execFile("git", ["-C", repoRoot, "ls-files", "--", ".local"])).stdout,
    "",
  );

  const originalBranch = (
    await execFile("git", ["-C", repoRoot, "branch", "--show-current"])
  ).stdout.trim();
  await execFile("git", ["-C", repoRoot, "switch", "-q", "-c", "snapshot-drift"]);
  const branchDriftCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(["verify", "--handoff", handoffPath], branchDriftCapture.io),
    1,
  );
  assert.ok(
    (JSON.parse(branchDriftCapture.stdout.join("")) as { errors: string[] }).errors.some(
      (message) => /snapshot|stale|branch/i.test(message),
    ),
  );
  await execFile("git", ["-C", repoRoot, "switch", "-q", originalBranch]);

  await writeFile(path.join(repoRoot, "AGENTS.md"), "# Changed policy\n", "utf8");
  const staleCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(["verify", "--handoff", handoffPath], staleCapture.io),
    1,
  );
  const staleResult = JSON.parse(staleCapture.stdout.join("")) as {
    ok: boolean;
    errors: string[];
  };
  assert.equal(staleResult.ok, false);
  assert.ok(staleResult.errors.some((message) => /policy|stale/i.test(message)));
});

test("CLI status reports a persisted clarification interrupt", async () => {
  const { runCli } = await import("./cli");
  const repoRoot = await makeCliRepository();
  const requestPath = path.join(repoRoot, "clarification-request.json");
  await writeFile(
    requestPath,
    `${JSON.stringify(
      requestFixture({
        requestId: "clarification-request-001",
        unresolvedItems: [
          {
            id: "owner",
            question: "Which exact owner must receive this handoff?",
            impact: "high",
          },
        ],
      }),
    )}\n`,
    "utf8",
  );
  const runCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["run", "--request", requestPath, "--repo", repoRoot, "--json"],
      runCapture.io,
    ),
    0,
    runCapture.stderr.join("\n"),
  );
  const runResult = JSON.parse(runCapture.stdout.join("")) as {
    runId: string;
    terminalStatus: string;
  };
  assert.equal(runResult.terminalStatus, "clarification-required");

  const statusCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["status", "--run-id", runResult.runId, "--repo", repoRoot, "--json"],
      statusCapture.io,
    ),
    0,
    statusCapture.stderr.join("\n"),
  );
  const status = JSON.parse(statusCapture.stdout.join("")) as {
    terminalStatus: string | null;
  };
  assert.equal(status.terminalStatus, "clarification-required");
});

test("CLI rejects unknown arguments, symlink request files, and non-root repo paths", async () => {
  const { runCli } = await import("./cli");
  const repoRoot = await makeCliRepository();
  const requestPath = path.join(repoRoot, "request.json");
  await writeFile(requestPath, `${JSON.stringify(requestFixture())}\n`, "utf8");

  const unknownCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["run", "--request", requestPath, "--repo", repoRoot, "--shell", "git status"],
      unknownCapture.io,
    ),
    2,
  );
  assert.match(unknownCapture.stderr.join(""), /unknown|argument/i);

  const childCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["run", "--request", requestPath, "--repo", path.join(repoRoot, "app"), "--json"],
      childCapture.io,
    ),
    1,
  );
  assert.match(childCapture.stderr.join(""), /root|mismatch/i);

  const linkPath = path.join(repoRoot, "linked-request.json");
  await execFile("ln", ["-s", requestPath, linkPath]);
  const linkCapture = captureIo(repoRoot);
  assert.equal(
    await runCli(
      ["run", "--request", linkPath, "--repo", repoRoot, "--json"],
      linkCapture.io,
    ),
    1,
  );
  assert.match(linkCapture.stderr.join(""), /symlink|regular file/i);
});

test("CLI verify fails closed on a modified handoff", async () => {
  const { runCli } = await import("./cli");
  const repoRoot = await makeCliRepository();
  const handoffPath = path.join(repoRoot, "tampered-handoff.json");
  await writeFile(
    handoffPath,
    JSON.stringify({
      schemaVersion: "mais-agentops-handoff.v1",
      handoffDigest: "0".repeat(64),
    }),
    "utf8",
  );
  const capture = captureIo(repoRoot);
  assert.equal(await runCli(["verify", "--handoff", handoffPath], capture.io), 1);
  assert.equal((JSON.parse(capture.stdout.join("")) as { ok: boolean }).ok, false);
});

test("repo-local agentops wrapper is executable and emits JSON help", async () => {
  const agentOpsDirectory = path.dirname(fileURLToPath(import.meta.url));
  const wrapperPath = path.join(agentOpsDirectory, "bin", "agentops");
  const repoRoot = path.resolve(agentOpsDirectory, "../..");
  await access(wrapperPath, constants.X_OK);
  const { stdout, stderr } = await execFile(wrapperPath, ["help"], {
    cwd: repoRoot,
  });
  assert.equal(stderr, "");
  const help = JSON.parse(stdout) as {
    schemaVersion: string;
    commands: string[];
  };
  assert.equal(help.schemaVersion, "mais-agentops-cli-help.v1");
  assert.equal(help.commands.length, 4);
});

test("repo-local CLI resumes a clarification in a separate process", async () => {
  const agentOpsDirectory = path.dirname(fileURLToPath(import.meta.url));
  const wrapperPath = path.join(agentOpsDirectory, "bin", "agentops");
  const projectRoot = path.resolve(agentOpsDirectory, "../..");
  const repoRoot = await makeCliRepository();
  const requestPath = path.join(repoRoot, "process-resume-request.json");
  await writeFile(
    requestPath,
    `${JSON.stringify(
      requestFixture({
        requestId: "process-resume-request-001",
        unresolvedItems: [
          {
            id: "owner",
            question: "Which exact lane owns this request?",
            impact: "high",
          },
        ],
      }),
    )}\n`,
    "utf8",
  );
  const runProcess = await execFile(
    wrapperPath,
    ["run", "--request", requestPath, "--repo", repoRoot, "--json"],
    { cwd: projectRoot },
  );
  assert.equal(runProcess.stderr, "");
  const interrupted = JSON.parse(runProcess.stdout) as {
    runId: string;
    terminalStatus: string;
    interruption: {
      requestDigest: string;
      contractDigest: string;
      questions: Array<{ id: string }>;
    };
  };
  assert.equal(interrupted.terminalStatus, "clarification-required");
  const clarificationPath = path.join(repoRoot, ".local", "clarification.json");
  await writeFile(
    clarificationPath,
    `${JSON.stringify({
      schemaVersion: "mais-agentops-clarification.v1",
      runId: interrupted.runId,
      requestDigest: interrupted.interruption.requestDigest,
      contractDigest: interrupted.interruption.contractDigest,
      answers: interrupted.interruption.questions.map(({ id }) => ({
        questionId: id,
        answer: "A14 owns the exact parent-console slice.",
        resolution: "resolved",
      })),
    })}\n`,
    "utf8",
  );

  const resumeProcess = await execFile(
    wrapperPath,
    [
      "resume",
      "--run-id",
      interrupted.runId,
      "--clarification",
      clarificationPath,
      "--repo",
      repoRoot,
      "--json",
    ],
    { cwd: projectRoot },
  );
  assert.equal(resumeProcess.stderr, "");
  const resumed = JSON.parse(resumeProcess.stdout) as {
    terminalStatus: string;
    handoff: { route: { primaryLane: string } };
  };
  assert.equal(resumed.terminalStatus, "handoff-ready");
  assert.equal(resumed.handoff.route.primaryLane, "A14");
});
