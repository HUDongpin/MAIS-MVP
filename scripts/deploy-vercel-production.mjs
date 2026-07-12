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
const DEFAULT_PRODUCTION_SMOKE_BASE_URL = "https://mais.ac";

async function deployProduction(options = {}) {
  const scope = options.scope ?? process.env.VERCEL_SCOPE ?? DEFAULT_SCOPE;
  const project = options.project ?? process.env.VERCEL_PROJECT_NAME ?? DEFAULT_PROJECT;
  const productionBaseUrl = options.productionBaseUrl
    ?? process.env.MAIS_PRODUCTION_SMOKE_BASE_URL
    ?? DEFAULT_PRODUCTION_SMOKE_BASE_URL;

  await runPreflight();
  if (!options.dryRun) {
    assertDashboardSmokeAuthReady({ context: "Production deploy" });
  }

  const localBuildGate = await runReleaseBuildGate({
    runId: options.runId ? `production-${options.runId}` : undefined
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
      target: "production",
      stagingDir: staging.stagingDir,
      stagingFileCount: staging.fileCount,
      stagingTotalBytes: staging.totalBytes,
      forbiddenPathCount: staging.forbiddenPathCount,
      productionBaseUrl,
      localBuildGate,
      deployed: false
    };
  }

  const deployArgs = [
    "deploy",
    staging.stagingDir,
    "-y",
    "--prod",
    "--skip-domain",
    "--scope",
    scope,
    "--project",
    project,
    "--no-wait"
  ];

  const deployResult = await runCommand("vercel", deployArgs, { cwd: REPO_ROOT });
  if (deployResult.exitCode !== 0) {
    throw new Error(formatCommandFailure("vercel deploy --prod", deployResult));
  }

  const deploymentUrl = extractDeploymentUrl(`${deployResult.stdout}\n${deployResult.stderr}`);
  if (!deploymentUrl) {
    throw new Error(
      [
        "Vercel production deploy exited successfully but did not return a deployment URL.",
        "Refusing to treat this as success because publish provenance cannot be verified.",
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

  const aiTutorLatencyGate = await runAITutorLatencyGate(deploymentUrl);
  const dashboardLatencyGate = await runDashboardLatencyGate(deploymentUrl, {
    failureIntro: "Dashboard latency gate failed; production domains were not promoted.",
    name: "Dashboard latency smoke"
  });
  const dashboardUiLoadingGate = await runDashboardUiLoadingGate(deploymentUrl, {
    failureIntro: "Dashboard UI loading gate failed; production domains were not promoted.",
    name: "Dashboard UI loading smoke"
  });
  const promoteResult = await runCommand("vercel", ["promote", deploymentUrl, "-y", "--timeout", "5m", "--scope", scope], {
    cwd: REPO_ROOT
  });
  if (promoteResult.exitCode !== 0) {
    throw new Error(formatCommandFailure(`vercel promote ${deploymentUrl}`, promoteResult));
  }
  const productionDashboardLatencyGate = await runDashboardLatencyGate(productionBaseUrl, {
    failureIntro: "Production-domain dashboard latency gate failed after promotion.",
    name: "Production dashboard latency smoke"
  });
  const productionDashboardUiLoadingGate = await runDashboardUiLoadingGate(productionBaseUrl, {
    failureIntro: "Production-domain dashboard UI loading gate failed after promotion.",
    name: "Production dashboard UI loading smoke"
  });

  const record = {
    aiTutorLatencyGate,
    dashboardLatencyGate,
    dashboardUiLoadingGate,
    productionDashboardLatencyGate,
    productionDashboardUiLoadingGate,
    deploymentUrl,
    inspectVerified: true,
    promotionVerified: true,
    productionBaseUrl,
    scope,
    project,
    target: "production",
    localBuildGate,
    stagingDir: staging.stagingDir,
    stagingFileCount: staging.fileCount,
    stagingTotalBytes: staging.totalBytes,
    deployedAt: new Date().toISOString()
  };

  await fs.writeFile(
    path.join(staging.stagingDir, "vercel-production-deployment.json"),
    `${JSON.stringify(record, null, 2)}\n`
  );

  return record;
}

async function runPreflight() {
  const preflight = await runCommand("node", ["scripts/release-env-guard.mjs", "staged-publish"], {
    cwd: REPO_ROOT
  });
  if (preflight.exitCode !== 0) {
    throw new Error("staged production publish preflight failed; see blocker details above.");
  }
}

async function runAITutorLatencyGate(deploymentUrl) {
  const gateResult = await runCommand(
    "node",
    ["scripts/ai-tutor-live-latency-smoke.mjs", "--base-url", deploymentUrl, "--json"],
    { cwd: REPO_ROOT }
  );
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        "AI Tutor live latency gate failed; production domains were not promoted.",
        "The deployment was created with --skip-domain, so www.mais.hk remains on the previous production deployment.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return parseJsonFromCommandOutput("AI Tutor live latency smoke", gateResult.stdout);
}

async function runDashboardLatencyGate(baseUrl, {
  failureIntro,
  name
}) {
  const gateResult = await runCommand(
    "node",
    ["scripts/dashboard-latency-smoke.mjs", "--base-url", baseUrl, "--json"],
    { cwd: REPO_ROOT }
  );
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        failureIntro,
        baseUrl.includes(".vercel.app")
          ? "The deployment was created with --skip-domain, so the current production domains remain on the previous production deployment."
          : "The deployment was promoted, but the production-domain smoke did not pass; inspect aliases and consider rollback.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return parseJsonFromCommandOutput(name, gateResult.stdout);
}

async function runDashboardUiLoadingGate(baseUrl, {
  failureIntro,
  name
}) {
  const gateResult = await runCommand(
    "node",
    ["scripts/dashboard-ui-loading-smoke.mjs", "--base-url", baseUrl, "--json"],
    { cwd: REPO_ROOT }
  );
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        failureIntro,
        baseUrl.includes(".vercel.app")
          ? "The deployment was created with --skip-domain, so the current production domains remain on the previous production deployment."
          : "The deployment was promoted, but the production-domain UI loading smoke did not pass; inspect aliases and consider rollback.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return parseJsonFromCommandOutput(name, gateResult.stdout);
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
  return output.split("\n").slice(-60).join("\n");
}

function formatCommandFailure(label, result) {
  return [`${label} failed with exit code ${result.exitCode}.`, summarizeOutput(result)].join("\n");
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    json: false,
    runId: undefined,
    scope: undefined,
    project: undefined,
    productionBaseUrl: undefined,
    stagingRoot: undefined
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
    } else if (arg === "--production-base-url") {
      args.productionBaseUrl = argv[++index];
    } else if (arg === "--staging-root") {
      args.stagingRoot = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const record = await deployProduction(args);

  if (args.json) {
    console.log(JSON.stringify(record, null, 2));
    return;
  }

  if (record.dryRun) {
    console.log("Vercel Production deployment dry run passed");
    console.log(`Staging directory: ${record.stagingDir}`);
    console.log(`Files: ${record.stagingFileCount}`);
    return;
  }

  console.log("Vercel Production deployment verified");
  console.log(`Production URL: ${record.deploymentUrl}`);
  console.log("AI Tutor live latency gate: passed before promotion");
  console.log("Dashboard latency gate: passed before promotion");
  console.log(`Production-domain dashboard latency gate: passed after promotion (${record.productionBaseUrl})`);
  console.log(`Staging directory: ${record.stagingDir}`);
  console.log(`Files: ${record.stagingFileCount}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
