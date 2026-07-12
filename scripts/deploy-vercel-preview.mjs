#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertDashboardSmokeAuthReady } from "./dashboard-smoke-auth-precheck.mjs";
import { prepareVercelStaging } from "./prepare-vercel-staging.mjs";
import { runReleaseBuildGate } from "./release-build-gate.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const DEFAULT_SCOPE = "peter-dongpin-hu-s-projects";
const DEFAULT_PROJECT = "mais-mvp";
const DEFAULT_TARGET = "preview";

async function deployPreview(options = {}) {
  const scope = options.scope ?? process.env.VERCEL_SCOPE ?? DEFAULT_SCOPE;
  const project = options.project ?? process.env.VERCEL_PROJECT_NAME ?? DEFAULT_PROJECT;
  const target = options.target ?? process.env.VERCEL_TARGET ?? DEFAULT_TARGET;

  if (target !== "preview") {
    throw new Error("This wrapper only creates Preview deployments. Use explicit owner-approved commands for production.");
  }

  await runPreflight();
  if (!options.dryRun) {
    assertDashboardSmokeAuthReady({ context: "Preview deploy" });
  }

  const localBuildGate = await runReleaseBuildGate({
    runId: options.runId ? `preview-${options.runId}` : undefined
  });

  const staging = await prepareVercelStaging({
    runId: options.runId,
    stagingRoot: options.stagingRoot,
    dryRun: options.dryRun
  });

  if (options.dryRun) {
    return {
      dryRun: true,
      scope,
      project,
      target,
      stagingDir: staging.stagingDir,
      stagingFileCount: staging.fileCount,
      stagingTotalBytes: staging.totalBytes,
      forbiddenPathCount: staging.forbiddenPathCount,
      localBuildGate,
      deployed: false
    };
  }

  const deployArgs = [
    "deploy",
    staging.stagingDir,
    "-y",
    "--target",
    target,
    "--scope",
    scope,
    "--project",
    project,
    "--no-wait"
  ];

  const deployResult = await runCommand("vercel", deployArgs, { cwd: REPO_ROOT });
  if (deployResult.exitCode !== 0) {
    throw new Error(formatCommandFailure("vercel deploy", deployResult));
  }

  const deploymentUrl = extractDeploymentUrl(`${deployResult.stdout}\n${deployResult.stderr}`);
  if (!deploymentUrl) {
    throw new Error(
      [
        "Vercel deploy exited successfully but did not return a deployment URL.",
        "Refusing to treat this as success because it matches the prior archive-mode no-record failure.",
        summarizeOutput(deployResult)
      ].join("\n")
    );
  }

  const inspectResult = await runCommand("vercel", ["inspect", deploymentUrl, "--wait", "--timeout", "5m", "--scope", scope], {
    cwd: REPO_ROOT
  });
  if (inspectResult.exitCode !== 0) {
    throw new Error(formatCommandFailure(`vercel inspect ${deploymentUrl}`, inspectResult));
  }

  const dashboardLatencyGate = await runDashboardLatencyGate(deploymentUrl);
  const dashboardUiLoadingGate = await runDashboardUiLoadingGate(deploymentUrl);
  const record = {
    dryRun: false,
    dashboardLatencyGate,
    dashboardUiLoadingGate,
    deploymentUrl,
    inspectVerified: true,
    scope,
    project,
    target,
    localBuildGate,
    stagingDir: staging.stagingDir,
    stagingFileCount: staging.fileCount,
    stagingTotalBytes: staging.totalBytes,
    deployedAt: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(staging.stagingDir, "vercel-preview-deployment.json"),
    `${JSON.stringify(record, null, 2)}\n`
  );

  return record;
}

async function runPreflight() {
  const preflight = await runCommand("node", ["scripts/release-env-guard.mjs", "preview"], {
    cwd: REPO_ROOT
  });
  if (preflight.exitCode !== 0) {
    throw new Error("preview runtime release preflight failed; refresh the A25 dirty-tree map and review A22 blocker details above.");
  }
}

async function runDashboardLatencyGate(deploymentUrl) {
  const gateResult = await runCommand(
    "node",
    ["scripts/dashboard-latency-smoke.mjs", "--base-url", deploymentUrl, "--json"],
    { cwd: REPO_ROOT }
  );
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        "Preview dashboard latency gate failed.",
        "The preview deployment was created, but it is not release-ready for production promotion.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return parseJsonFromCommandOutput("Preview dashboard latency smoke", gateResult.stdout);
}

async function runDashboardUiLoadingGate(deploymentUrl) {
  const gateResult = await runCommand(
    "node",
    ["scripts/dashboard-ui-loading-smoke.mjs", "--base-url", deploymentUrl, "--json"],
    { cwd: REPO_ROOT }
  );
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        "Preview dashboard UI loading gate failed.",
        "The preview deployment was created, but the dashboard loading state did not clear within the release threshold.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return parseJsonFromCommandOutput("Preview dashboard UI loading smoke", gateResult.stdout);
}

function extractDeploymentUrl(output) {
  const urls = output.match(/https:\/\/[^\s)\]]+/g) ?? [];
  const cleaned = urls.map((url) => url.replace(/[.,;]+$/, ""));
  return (
    cleaned.find((url) => /\.vercel\.app(?:\/)?$/.test(url)) ??
    cleaned.find((url) => !url.includes("://vercel.com/")) ??
    null
  );
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function summarizeOutput(result) {
  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (!output) return "Command produced no output.";
  return output.split("\n").slice(-40).join("\n");
}

function formatCommandFailure(label, result) {
  return [`${label} failed with exit code ${result.exitCode}.`, summarizeOutput(result)].join("\n");
}

function parseJsonFromCommandOutput(label, output) {
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`${label} did not return JSON output:\n${output}`);
  }
  try {
    return JSON.parse(output.slice(jsonStart));
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    runId: undefined,
    scope: undefined,
    project: undefined,
    stagingRoot: undefined,
    target: DEFAULT_TARGET
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--run-id") {
      args.runId = argv[++index];
    } else if (arg === "--scope") {
      args.scope = argv[++index];
    } else if (arg === "--project") {
      args.project = argv[++index];
    } else if (arg === "--staging-root") {
      args.stagingRoot = argv[++index];
    } else if (arg === "--target") {
      args.target = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const record = await deployPreview(args);

  if (args.json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  if (record.dryRun) {
    console.log("Vercel Preview dry run passed");
    console.log(`Target: ${record.target}`);
    console.log(`Staging directory: ${record.stagingDir}`);
    console.log(`Files: ${record.stagingFileCount}`);
    console.log(`Forbidden paths: ${record.forbiddenPathCount}`);
    return;
  }

  console.log("Vercel Preview deployment verified");
  console.log(`Preview URL: ${record.deploymentUrl}`);
  console.log("Dashboard latency gate: passed on preview");
  console.log(`Staging directory: ${record.stagingDir}`);
  console.log(`Files: ${record.stagingFileCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
