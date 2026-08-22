#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertDashboardSmokeAuthReady } from "./dashboard-smoke-auth-precheck.mjs";
import { prepareVercelStaging } from "./prepare-vercel-staging.mjs";
import { probeGoogleOAuthStart } from "./prod-certification.mjs";
import { probeGooglePublicPageContracts } from "./prod-certification.mjs";
import { GOOGLE_OAUTH_CANONICAL_DOMAIN } from "./prod-certification.mjs";
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
  const googleOAuthLegalApprovalGate = await runGoogleOAuthLegalApprovalGate();
  const googleOAuthSyntheticGate = await runGoogleOAuthSyntheticGate();
  if (!options.dryRun) {
    assertDashboardSmokeAuthReady({ context: "Production deploy" });
  }

  const localBuildGate = await runReleaseBuildGate({
    runId: options.runId ? `production-${options.runId}` : undefined
  });

  const staging = await prepareVercelStaging({
    runId: options.runId,
    stagingRoot: options.stagingRoot,
    // A production dry-run must still materialize the exact local upload tree;
    // otherwise its post-staging legal digest would validate no deployable bytes.
    dryRun: false
  });
  const googleOAuthStagedLegalApprovalGate = await runGoogleOAuthLegalApprovalGate({
    sourceRoot: staging.stagingDir
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
      googleOAuthLegalApprovalGate,
      googleOAuthStagedLegalApprovalGate,
      googleOAuthSyntheticGate,
      localBuildGate,
      deployed: false
    };
  }

  const previousProductionDeploymentUrl = await resolveCurrentProductionDeploymentUrl(
    GOOGLE_OAUTH_CANONICAL_DOMAIN,
    scope
  );

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

  const deploymentGoogleOAuthCanonicalHandoffGate = await runGoogleOAuthStartGate(deploymentUrl, {
    failureIntro: "Deployment Google OAuth canonical-handoff gate failed; production domains were not promoted."
  });
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
  let productionDashboardLatencyGate;
  let productionDashboardUiLoadingGate;
  let productionGooglePublicPageGate;
  let productionGoogleOAuthStartGate;
  try {
    productionGooglePublicPageGate = await runGooglePublicPageGate();
    productionDashboardLatencyGate = await runDashboardLatencyGate(productionBaseUrl, {
      failureIntro: "Production-domain dashboard latency gate failed after promotion.",
      name: "Production dashboard latency smoke"
    });
    productionDashboardUiLoadingGate = await runDashboardUiLoadingGate(productionBaseUrl, {
      failureIntro: "Production-domain dashboard UI loading gate failed after promotion.",
      name: "Production dashboard UI loading smoke"
    });
    productionGoogleOAuthStartGate = await runGoogleOAuthStartGate(undefined, {
      failureIntro: "Production Google OAuth start gate failed after promotion."
    });
  } catch (gateError) {
    await rollbackAfterFailedPromotion(scope, previousProductionDeploymentUrl, gateError);
  }

  const record = {
    aiTutorLatencyGate,
    dashboardLatencyGate,
    dashboardUiLoadingGate,
    deploymentGoogleOAuthCanonicalHandoffGate,
    productionDashboardLatencyGate,
    productionDashboardUiLoadingGate,
    productionGooglePublicPageGate,
    productionGoogleOAuthStartGate,
    previousProductionDeploymentUrl,
    deploymentUrl,
    inspectVerified: true,
    promotionVerified: true,
    productionBaseUrl,
    scope,
    project,
    target: "production",
    googleOAuthLegalApprovalGate,
    googleOAuthStagedLegalApprovalGate,
    googleOAuthSyntheticGate,
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

export async function runGoogleOAuthLegalApprovalGate({
  runCommandFn = runCommand,
  sourceRoot
} = {}) {
  const commandArgs = ["run", "check:google-oauth-legal-approval", "--", "--json"];
  if (sourceRoot) commandArgs.push("--source-root", sourceRoot);
  const gateResult = await runCommandFn(
    "npm",
    commandArgs,
    { cwd: REPO_ROOT }
  );
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        "Google OAuth legal approval gate failed; production build and deployment were not started.",
        "Both owner and counsel must approve the exact current Privacy Policy and Terms of Service digests.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return {
    command: "npm run check:google-oauth-legal-approval -- --json",
    source: sourceRoot ? "vercel-staging" : "repository",
    status: "passed"
  };
}

export async function runGoogleOAuthSyntheticGate({ runCommandFn = runCommand } = {}) {
  const gateResult = await runCommandFn("npm", ["run", "test:google-oauth"], {
    cwd: REPO_ROOT
  });
  if (gateResult.exitCode !== 0) {
    throw new Error(
      [
        "Google OAuth semantic gate failed; production build and deployment were not started.",
        "The gate must prove callback/session behavior and that email collisions require explicit MAIS account linking.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return {
    command: "npm run test:google-oauth",
    status: "passed"
  };
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
        "The deployment was created with --skip-domain, so www.mais.ac remains on the previous production deployment.",
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
          : "The deployment was promoted, but the production-domain smoke did not pass; automatic rollback will be requested.",
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
          : "The deployment was promoted, but the production-domain UI loading smoke did not pass; automatic rollback will be requested.",
        summarizeOutput(gateResult)
      ].join("\n")
    );
  }

  return parseJsonFromCommandOutput(name, gateResult.stdout);
}

async function runGoogleOAuthStartGate(baseUrl, { failureIntro }) {
  const result = await probeGoogleOAuthStart(baseUrl);
  if (!result.ok) {
    throw new Error(
      [
        failureIntro,
        "The probe is redacted and never records authorization parameters or cookie values.",
        result.detail
      ].join("\n")
    );
  }
  return result;
}

async function runGooglePublicPageGate() {
  const result = await probeGooglePublicPageContracts();
  if (!result.ok) {
    throw new Error(
      [
        "Production Google Auth Platform public URL gate failed after promotion; automatic rollback will be requested.",
        "The probe records only public URL contract evidence and never records OAuth parameters or cookie values.",
        result.detail,
        ...result.pages.filter((page) => !page.ok).map((page) => page.detail)
      ].join("\n")
    );
  }
  return result;
}

async function resolveCurrentProductionDeploymentUrl(referenceUrl, scope) {
  const inspectResult = await runCommand(
    "vercel",
    ["inspect", referenceUrl, "--format=json", "--scope", scope],
    { cwd: REPO_ROOT }
  );
  if (inspectResult.exitCode !== 0) {
    throw new Error(
      "Could not pin the currently live Vercel deployment before publish; production promotion was not attempted."
    );
  }
  return parseInspectedDeploymentUrl(inspectResult.stdout);
}

export function parseInspectedDeploymentUrl(output) {
  let record;
  try {
    record = parseJsonFromCommandOutput("Vercel production inspect", output);
  } catch {
    throw new Error("Vercel production inspect did not identify a Vercel deployment URL.");
  }

  const rawUrl = typeof record?.url === "string" ? record.url.trim() : "";
  try {
    const deploymentUrl = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
    if (
      deploymentUrl.protocol !== "https:" ||
      !deploymentUrl.hostname.endsWith(".vercel.app") ||
      deploymentUrl.pathname !== "/"
    ) {
      throw new Error("invalid deployment URL");
    }
    return deploymentUrl.origin;
  } catch {
    throw new Error("Vercel production inspect did not identify a Vercel deployment URL.");
  }
}

async function rollbackAfterFailedPromotion(scope, previousProductionDeploymentUrl, gateError) {
  const gateFailure = gateError instanceof Error ? gateError.message : String(gateError);
  let rollbackResult;

  try {
    rollbackResult = await runCommand(
      "vercel",
      ["rollback", previousProductionDeploymentUrl, "-y", "--timeout", "5m", "--scope", scope],
      { cwd: REPO_ROOT }
    );
  } catch (rollbackError) {
    const rollbackFailure = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
    throw new Error(
      [
        "Post-promotion production verification failed.",
        `Original gate failure: ${gateFailure}`,
        `Automatic Vercel rollback also failed to start: ${rollbackFailure}`
      ].join("\n")
    );
  }

  if (rollbackResult.exitCode !== 0) {
    throw new Error(
      [
        "Post-promotion production verification failed.",
        `Original gate failure: ${gateFailure}`,
        "Automatic Vercel rollback also failed; production state requires immediate operator review.",
        summarizeOutput(rollbackResult)
      ].join("\n")
    );
  }

  throw new Error(
    [
      "Post-promotion production verification failed.",
      "Automatic Vercel rollback completed to the previous production deployment.",
      `Original gate failure: ${gateFailure}`
    ].join("\n")
  );
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
