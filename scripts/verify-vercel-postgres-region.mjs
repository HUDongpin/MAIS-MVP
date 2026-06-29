#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const variableName = "POSTGRES_URL";
const expectedTargets = ["preview", "production"];
const defaultVercelApiOrigin = "https://api.vercel.com";

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") options.project = argv[index + 1], index += 1;
    else if (arg === "--team") options.team = argv[index + 1], index += 1;
    else if (arg === "--from-process-env") options.fromProcessEnv = true;
    else if (arg === "--target") options.target = argv[index + 1], index += 1;
    else if (arg === "--json") options.json = true;
  }
  return options;
}

function readVercelProjectLink(cwd = process.cwd()) {
  const projectFile = path.join(cwd, ".vercel", "project.json");
  if (!existsSync(projectFile)) return {};

  try {
    const parsed = JSON.parse(readFileSync(projectFile, "utf8"));
    return {
      project: typeof parsed.projectId === "string" ? parsed.projectId : undefined,
      team: typeof parsed.orgId === "string" ? parsed.orgId : undefined
    };
  } catch {
    return {};
  }
}

function normalizeTargets(env) {
  const target = env?.target ?? env?.targets;
  if (Array.isArray(target)) return target.filter((value) => typeof value === "string");
  if (typeof target === "string") return [target];
  if (target && typeof target === "object") {
    return Object.entries(target)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  return [];
}

function matchesTarget(env, target) {
  const targets = normalizeTargets(env);
  return targets.length === 0 || targets.includes(target);
}

function apiUrl(pathname, params = {}) {
  const url = new URL(pathname, defaultVercelApiOrigin);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

async function vercelApiJson({ token, pathname, params }) {
  const response = await fetch(apiUrl(pathname, params), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status
    };
  }

  return {
    ok: true,
    status: response.status,
    body: await response.json()
  };
}

function extractEnvList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.envs)) return body.envs;
  if (Array.isArray(body?.environmentVariables)) return body.environmentVariables;
  return [];
}

function redactUrlClassification(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function classifyPostgresUrl(value) {
  const hostname = redactUrlClassification(value);
  const provider = hostname.endsWith(".neon.tech") || hostname.includes(".neon.") ? "neon" : "unknown";
  const regionMatch = hostname.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/);
  const region = regionMatch ? `aws-${regionMatch[1]}` : "unknown";

  return {
    provider,
    region,
    usWestNeon: provider === "neon" && region === "aws-us-west-2"
  };
}

export function summarizeVerification(results) {
  const missingTargets = results
    .filter((result) => result.status !== "verified")
    .map((result) => result.target);
  const misalignedTargets = results
    .filter((result) => result.status === "verified" && !result.usWestNeon)
    .map((result) => result.target);

  return {
    ok: missingTargets.length === 0 && misalignedTargets.length === 0,
    missingTargets,
    misalignedTargets
  };
}

async function verifyEnvironmentTarget({ token, project, team, target }) {
  const listResponse = await vercelApiJson({
    token,
    pathname: `/v10/projects/${encodeURIComponent(project)}/env`,
    params: {
      decrypt: "true",
      source: "vercel-cli:pull",
      teamId: team
    }
  });

  if (!listResponse.ok) {
    return {
      target,
      status: "api-error",
      httpStatus: listResponse.status
    };
  }

  const env = extractEnvList(listResponse.body)
    .find((candidate) => candidate?.key === variableName && matchesTarget(candidate, target));

  if (!env?.id) {
    return {
      target,
      status: "missing"
    };
  }

  if (typeof env.value !== "string") {
    return {
      target,
      status: "unreadable",
      note: "value-not-returned"
    };
  }

  return {
    target,
    status: "verified",
    ...classifyPostgresUrl(env.value)
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.fromProcessEnv) {
    const target = typeof args.target === "string" ? args.target : "unknown";
    const value = process.env.POSTGRES_URL?.trim();
    const result = value
      ? {
          ok: classifyPostgresUrl(value).usWestNeon,
          variable: variableName,
          target,
          status: "verified",
          ...classifyPostgresUrl(value)
        }
      : {
          ok: false,
          variable: variableName,
          target,
          status: "missing"
        };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  const link = readVercelProjectLink();
  const token = process.env.VERCEL_TOKEN?.trim();
  const project = args.project ?? process.env.VERCEL_PROJECT_ID ?? link.project;
  const team = args.team ?? process.env.VERCEL_ORG_ID ?? process.env.VERCEL_TEAM_ID ?? link.team;

  if (!token || !project) {
    const result = {
      ok: false,
      variable: variableName,
      status: "missing-auth-or-project",
      token: token ? "present" : "missing",
      project: project ? "present" : "missing"
    };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 2;
    return;
  }

  const results = [];
  for (const target of expectedTargets) {
    results.push(await verifyEnvironmentTarget({ token, project, team, target }));
  }

  const summary = summarizeVerification(results);
  const result = {
    ok: summary.ok,
    variable: variableName,
    expected: {
      provider: "neon",
      region: "aws-us-west-2"
    },
    targets: results,
    summary
  };

  console.log(JSON.stringify(result, null, 2));
  process.exitCode = summary.ok ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      status: "unexpected-error",
      message: error instanceof Error ? error.name : "unknown"
    }));
    process.exitCode = 1;
  });
}
