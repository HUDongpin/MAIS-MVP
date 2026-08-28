import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  verifyAgentOpsHandoff,
  verifyAgentOpsHandoffContractBinding,
  type AgentOpsHandoffV1,
} from "./artifacts";
import { canonicalJson, sha256Digest } from "./canonical";
import { AgentOpsRunStore } from "./checkpoint";
import { discoverRepository, validateRepositoryRoot } from "./discovery";
import { createAgentOpsRuntime } from "./workflow";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export interface AgentOpsCliIo {
  readonly cwd: string;
  readonly stdout: (value: string) => void;
  readonly stderr: (value: string) => void;
}

class CliUsageError extends Error {}

interface ParsedOptions {
  readonly values: Readonly<Record<string, string>>;
  readonly flags: ReadonlySet<string>;
}

function parseOptions(
  args: readonly string[],
  allowedValues: readonly string[],
  allowedFlags: readonly string[],
): ParsedOptions {
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  const valueSet = new Set(allowedValues);
  const flagSet = new Set(allowedFlags);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--")) {
      throw new CliUsageError(`unexpected positional argument: ${argument}`);
    }
    const name = argument.slice(2);
    if (flagSet.has(name)) {
      if (flags.has(name)) {
        throw new CliUsageError(`duplicate flag: --${name}`);
      }
      flags.add(name);
      continue;
    }
    if (!valueSet.has(name)) {
      throw new CliUsageError(`unknown argument: --${name}`);
    }
    if (name in values) {
      throw new CliUsageError(`duplicate argument: --${name}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new CliUsageError(`argument --${name} requires a value`);
    }
    values[name] = value;
    index += 1;
  }
  return { values, flags };
}

function requiredOption(options: ParsedOptions, name: string): string {
  const value = options.values[name];
  if (!value) {
    throw new CliUsageError(`missing required argument: --${name}`);
  }
  return value;
}

function resolvePath(cwd: string, candidate: string): string {
  if (candidate.includes("\0")) {
    throw new CliUsageError("path contains a null byte");
  }
  return path.resolve(cwd, candidate);
}

async function readJsonFile(cwd: string, candidate: string): Promise<unknown> {
  const resolved = resolvePath(cwd, candidate);
  const metadata = await lstat(resolved);
  if (metadata.isSymbolicLink()) {
    throw new TypeError(`input JSON must be a regular file, not a symlink: ${candidate}`);
  }
  if (!metadata.isFile()) {
    throw new TypeError(`input JSON must be a regular file: ${candidate}`);
  }
  if (metadata.size > MAX_INPUT_BYTES) {
    throw new TypeError(`input JSON exceeds ${MAX_INPUT_BYTES} bytes`);
  }
  return JSON.parse(await readFile(resolved, "utf8")) as unknown;
}

function writeJson(io: AgentOpsCliIo, value: unknown): void {
  io.stdout(`${canonicalJson(value)}\n`);
}

async function resolveRepoRoot(
  io: AgentOpsCliIo,
  options: ParsedOptions,
): Promise<string> {
  return validateRepositoryRoot(
    resolvePath(io.cwd, options.values.repo ?? io.cwd),
  );
}

async function executeCommand(
  command: string,
  args: readonly string[],
  io: AgentOpsCliIo,
): Promise<number> {
  if (command === "run") {
    const options = parseOptions(args, ["request", "repo"], ["json"]);
    const repoRoot = await resolveRepoRoot(io, options);
    const request = await readJsonFile(io.cwd, requiredOption(options, "request"));
    const result = await createAgentOpsRuntime().run({ repoRoot, request });
    writeJson(io, result);
    return 0;
  }
  if (command === "resume") {
    const options = parseOptions(
      args,
      ["run-id", "clarification", "repo"],
      ["json"],
    );
    const repoRoot = await resolveRepoRoot(io, options);
    const clarification = await readJsonFile(
      io.cwd,
      requiredOption(options, "clarification"),
    );
    const result = await createAgentOpsRuntime().resume({
      repoRoot,
      runId: requiredOption(options, "run-id"),
      clarification,
    });
    writeJson(io, result);
    return 0;
  }
  if (command === "status") {
    const options = parseOptions(args, ["run-id", "repo"], ["json"]);
    const repoRoot = await resolveRepoRoot(io, options);
    const store = new AgentOpsRunStore(
      repoRoot,
      requiredOption(options, "run-id"),
    );
    const status = await store.status();
    writeJson(io, status);
    return status.integrity.ok ? 0 : 1;
  }
  if (command === "verify") {
    const options = parseOptions(args, ["handoff"], ["json"]);
    const handoff = await readJsonFile(
      io.cwd,
      requiredOption(options, "handoff"),
    );
    const artifactVerification = verifyAgentOpsHandoff(handoff);
    const errors = [...artifactVerification.errors];
    if (artifactVerification.ok) {
      const typedHandoff = handoff as AgentOpsHandoffV1;
      try {
        const repoRoot = await validateRepositoryRoot(io.cwd);
        const store = new AgentOpsRunStore(repoRoot, typedHandoff.runId);
        const [manifest, contract, currentDiscovery] = await Promise.all([
          store.readManifest(),
          store.readContract(),
          discoverRepository({
            repoRoot,
            probeIds: ["git.snapshot", "repo.policy-digests"],
            contextRefs: [],
          }),
        ]);
        if (!contract) {
          errors.push("current contract artifact is missing");
        } else {
          errors.push(
            ...verifyAgentOpsHandoffContractBinding(typedHandoff, contract)
              .errors,
          );
          if (contract.contractDigest !== typedHandoff.contractDigest) {
            errors.push("handoff contract digest is stale");
          }
          if (contract.requestDigest !== typedHandoff.requestDigest) {
            errors.push("handoff request digest is stale");
          }
          if (
            currentDiscovery.policyDigests.agentsPolicyDigest !==
              contract.policyDigests.agentsPolicyDigest ||
            currentDiscovery.policyDigests.releaseOwnerPathspecsDigest !==
              contract.policyDigests.releaseOwnerPathspecsDigest ||
            currentDiscovery.policyDigests.releasePackageManifestDigest !==
              contract.policyDigests.releasePackageManifestDigest
          ) {
            errors.push("repository policy identity changed; handoff is stale");
          }
        }
        if (
          manifest.contractDigest !== typedHandoff.contractDigest ||
          manifest.requestDigest !== typedHandoff.requestDigest
        ) {
          errors.push("run manifest identity does not match the handoff");
        }
        if (
          sha256Digest(currentDiscovery.repositorySnapshot) !==
          sha256Digest(typedHandoff.repositorySnapshot)
        ) {
          errors.push("repository snapshot identity changed; handoff is stale");
        }
      } catch (error) {
        errors.push(`handoff currentness could not be verified: ${(error as Error).message}`);
      }
    }
    const verification = {
      ok: artifactVerification.ok && errors.length === 0,
      artifactIntegrity: artifactVerification.ok,
      currentnessChecked: artifactVerification.ok,
      errors,
    };
    writeJson(io, verification);
    return verification.ok ? 0 : 1;
  }
  if (command === "help" || command === "--help" || command === "-h") {
    if (args.length > 0) {
      throw new CliUsageError("help accepts no additional arguments");
    }
    writeJson(io, {
      schemaVersion: "mais-agentops-cli-help.v1",
      commands: [
        "agentops run --request REQUEST.json --repo REPO_ROOT --json",
        "agentops resume --run-id RUN_ID --clarification CLARIFICATION.json --repo REPO_ROOT --json",
        "agentops status --run-id RUN_ID --repo REPO_ROOT --json",
        "agentops verify --handoff HANDOFF.json --json",
      ],
    });
    return 0;
  }
  throw new CliUsageError(`unknown command: ${command || "<missing>"}`);
}

export async function runCli(
  argv: readonly string[],
  io: AgentOpsCliIo = {
    cwd: process.cwd(),
    stdout: (value) => process.stdout.write(value),
    stderr: (value) => process.stderr.write(value),
  },
): Promise<number> {
  try {
    return await executeCommand(argv[0] ?? "", argv.slice(1), io);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr(`${message}\n`);
    return error instanceof CliUsageError ? 2 : 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  void runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode;
  });
}
