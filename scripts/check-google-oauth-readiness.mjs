#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const REQUIRED_VARS = [
  "GOOGLE_OAUTH_ENABLED",
  "GOOGLE_OAUTH_CLIENT_ID",
  "GOOGLE_OAUTH_CLIENT_SECRET",
  "GOOGLE_OAUTH_REDIRECT_URI"
];
const STATE_SECRET_VARS = ["GOOGLE_OAUTH_STATE_SECRET", "AUTH_SESSION_SECRET", "NEXTAUTH_SECRET"];
const SESSION_SECRET_VARS = ["AUTH_SESSION_SECRET", "NEXTAUTH_SECRET"];
const CALLBACK_PATH = "/api/auth/google/callback";
const PRODUCTION_CALLBACK_URI = "https://www.mais.ac/api/auth/google/callback";

const args = parseArgs(process.argv.slice(2));

if (args["self-test"]) {
  runSelfTest();
  console.log("Google OAuth readiness self-test: pass");
  process.exit(0);
}

const envFile = String(args["env-file"] ?? ".env.local");
const env = mergeEnv(readEnvFile(path.resolve(process.cwd(), envFile)), process.env);
const mode = String(args.mode ?? inferMode(env));
const result = evaluateReadiness(env, {
  allowLocalhost: Boolean(args["allow-localhost"]) || mode === "local",
  mode
});

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printHumanReport(result, envFile);
}

process.exit(result.ready ? 0 : 1);

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const parsed = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    parsed[match[1]] = stripEnvValue(match[2].trim());
  }
  return parsed;
}

function stripEnvValue(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function mergeEnv(envFile, processEnv) {
  return { ...envFile, ...processEnv };
}

function inferMode(env) {
  if (env.VERCEL_ENV === "production" || env.NODE_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return "local";
}

function evaluateReadiness(env, { mode, allowLocalhost }) {
  const blockers = [];
  const warnings = [];
  const checks = {};

  for (const key of REQUIRED_VARS) {
    checks[key] = redactedStatus(env[key]);
  }

  const enabled = normalizeBoolean(env.GOOGLE_OAUTH_ENABLED);
  if (enabled !== true) {
    blockers.push("GOOGLE_OAUTH_ENABLED must be explicitly true.");
    checks.GOOGLE_OAUTH_ENABLED = env.GOOGLE_OAUTH_ENABLED ? "present:not-enabled" : "missing";
  } else {
    checks.GOOGLE_OAUTH_ENABLED = "present:true";
  }

  for (const key of ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"]) {
    if (!env[key]) blockers.push(`${key} is missing.`);
    if (env[key] && looksPlaceholder(env[key])) blockers.push(`${key} looks like a placeholder.`);
  }

  const stateSecretSource = STATE_SECRET_VARS.find((key) => Boolean(env[key]));
  checks.GOOGLE_OAUTH_STATE_SECRET_SOURCE = stateSecretSource ? `present:${stateSecretSource}` : "missing";
  if (!stateSecretSource) {
    blockers.push("A state/session secret is required: GOOGLE_OAUTH_STATE_SECRET, AUTH_SESSION_SECRET, or NEXTAUTH_SECRET.");
  } else if (looksPlaceholder(env[stateSecretSource])) {
    blockers.push(`${stateSecretSource} looks like a placeholder.`);
  } else if (env[stateSecretSource].length < 32) {
    blockers.push(`${stateSecretSource} should be at least 32 characters for OAuth state protection.`);
    checks.GOOGLE_OAUTH_STATE_SECRET_SOURCE = `weak:${stateSecretSource}`;
  }

  const sessionSecretSource = SESSION_SECRET_VARS.find((key) => Boolean(env[key]));
  checks.AUTH_SESSION_SECRET_SOURCE = sessionSecretSource ? `present:${sessionSecretSource}` : "missing";
  if (mode === "production") {
    if (!sessionSecretSource) {
      blockers.push("A production session secret is required: AUTH_SESSION_SECRET or NEXTAUTH_SECRET.");
    } else if (looksPlaceholder(env[sessionSecretSource])) {
      blockers.push(`${sessionSecretSource} looks like a placeholder.`);
    } else if (env[sessionSecretSource].length < 32) {
      blockers.push(`${sessionSecretSource} should be at least 32 characters for login-session protection.`);
      checks.AUTH_SESSION_SECRET_SOURCE = `weak:${sessionSecretSource}`;
    }
    if (stateSecretSource !== "GOOGLE_OAUTH_STATE_SECRET") {
      blockers.push("Production requires a dedicated GOOGLE_OAUTH_STATE_SECRET separate from the login-session secret.");
    } else if (sessionSecretSource && env[stateSecretSource] === env[sessionSecretSource]) {
      blockers.push("GOOGLE_OAUTH_STATE_SECRET and the login-session secret must be independent.");
    }
  }

  const redirect = analyzeRedirectUri(env.GOOGLE_OAUTH_REDIRECT_URI, { mode, allowLocalhost });
  checks.GOOGLE_OAUTH_REDIRECT_URI = redirect.status;
  blockers.push(...redirect.blockers);
  warnings.push(...redirect.warnings);

  const publicLeaks = Object.keys(env).filter((key) => /^NEXT_PUBLIC_.*(GOOGLE_OAUTH|OAUTH|AUTH).*(SECRET|CLIENT_SECRET|STATE_SECRET)$/i.test(key));
  if (publicLeaks.length) {
    blockers.push(`Secret-like OAuth env var is exposed through NEXT_PUBLIC_: ${publicLeaks.join(", ")}.`);
  }
  const publicGoogleVars = Object.keys(env).filter((key) => /^NEXT_PUBLIC_GOOGLE_OAUTH_/i.test(key));
  if (publicGoogleVars.length) {
    warnings.push(`Google OAuth should stay server-routed; review NEXT_PUBLIC_* usage: ${publicGoogleVars.join(", ")}.`);
  }

  return {
    ready: blockers.length === 0,
    mode,
    checks,
    blockers,
    warnings
  };
}

function normalizeBoolean(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

function redactedStatus(value) {
  if (!value) return "missing";
  return looksPlaceholder(value) ? "present:placeholder" : "present";
}

function looksPlaceholder(value) {
  const normalized = value.trim().toLowerCase();
  return (
    !normalized ||
    ["changeme", "change-me", "todo", "tbd", "client-secret", "route-client-secret"].includes(normalized) ||
    normalized.includes("placeholder") ||
    normalized.includes("example") ||
    normalized.includes("smoke")
  );
}

function analyzeRedirectUri(value, { mode, allowLocalhost }) {
  const blockers = [];
  const warnings = [];
  if (!value) return { status: "missing", blockers: ["GOOGLE_OAUTH_REDIRECT_URI is missing."], warnings };

  let url;
  try {
    url = new URL(value);
  } catch {
    return { status: "invalid", blockers: ["GOOGLE_OAUTH_REDIRECT_URI must be an absolute URL."], warnings };
  }

  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const supportedTransport = url.protocol === "https:" || (url.protocol === "http:" && isLocalhost);
  if (!supportedTransport) {
    blockers.push("GOOGLE_OAUTH_REDIRECT_URI must use HTTPS except for loopback HTTP in local development.");
  }
  if (url.pathname !== CALLBACK_PATH) {
    blockers.push(`GOOGLE_OAUTH_REDIRECT_URI path must be ${CALLBACK_PATH}.`);
  }
  if (url.username || url.password) {
    blockers.push("GOOGLE_OAUTH_REDIRECT_URI must not contain URL credentials.");
  }
  if (url.search || url.hash) {
    blockers.push("GOOGLE_OAUTH_REDIRECT_URI must not contain a query or fragment.");
  }
  if (mode === "production" && url.protocol !== "https:") {
    blockers.push("Production GOOGLE_OAUTH_REDIRECT_URI must use https.");
  }
  if (mode === "production" && isLocalhost) {
    blockers.push("Production GOOGLE_OAUTH_REDIRECT_URI must not use localhost.");
  }
  if (mode === "production" && value.trim() !== PRODUCTION_CALLBACK_URI) {
    blockers.push(`Production GOOGLE_OAUTH_REDIRECT_URI must exactly equal ${PRODUCTION_CALLBACK_URI}.`);
  }
  if (isLocalhost && !allowLocalhost) {
    blockers.push("Localhost redirect URI is allowed only in local mode or with --allow-localhost.");
  }
  const statusParts = ["present", url.protocol.replace(":", ""), url.hostname, url.pathname === CALLBACK_PATH ? "callback-path-ok" : "callback-path-mismatch"];
  return { status: statusParts.join(":"), blockers, warnings };
}

function printHumanReport(result, envFile) {
  console.log(`Google OAuth readiness: ${result.ready ? "ready" : "blocked"}`);
  console.log(`Mode: ${result.mode}`);
  console.log(`Env file: ${envFile}`);
  console.log("Checks:");
  for (const [key, status] of Object.entries(result.checks)) {
    console.log(`- ${key}: ${status}`);
  }
  if (result.blockers.length) {
    console.log("Blockers:");
    for (const blocker of result.blockers) console.log(`- ${blocker}`);
  }
  if (result.warnings.length) {
    console.log("Warnings:");
    for (const warning of result.warnings) console.log(`- ${warning}`);
  }
}

function runSelfTest() {
  const googleClientSecretFixture = crypto.randomUUID().replaceAll("-", "");
  const authSessionSecretFixture = crypto.randomUUID().replaceAll("-", "");
  const googleStateSecretFixture = crypto.randomUUID().replaceAll("-", "");
  const readyLocal = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "local", allowLocalhost: true });
  assert.equal(readyLocal.ready, true);

  const readyProduction = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://www.mais.ac/api/auth/google/callback",
    GOOGLE_OAUTH_STATE_SECRET: googleStateSecretFixture,
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(readyProduction.ready, true);

  const staleProductionAlias = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://www.mais.hk/api/auth/google/callback",
    GOOGLE_OAUTH_STATE_SECRET: googleStateSecretFixture,
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(staleProductionAlias.ready, false);
  assert.ok(staleProductionAlias.blockers.some((blocker) => blocker.includes("www.mais.ac")));

  const stateOnlyProduction = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback",
    GOOGLE_OAUTH_STATE_SECRET: googleStateSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(stateOnlyProduction.ready, false);
  assert.ok(stateOnlyProduction.blockers.some((blocker) => blocker.includes("production session secret")));

  const sharedProductionSecrets = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback",
    GOOGLE_OAUTH_STATE_SECRET: authSessionSecretFixture,
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(sharedProductionSecrets.ready, false);
  assert.ok(sharedProductionSecrets.blockers.some((blocker) => blocker.includes("must be independent")));

  const disabled = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "false",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback",
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(disabled.ready, false);
  assert.ok(disabled.blockers.some((blocker) => blocker.includes("explicitly true")));

  const productionHttp = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(productionHttp.ready, false);
  assert.ok(productionHttp.blockers.some((blocker) => blocker.includes("https")));
  assert.ok(productionHttp.blockers.some((blocker) => blocker.includes("localhost")));

  const nonLocalHttp = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "http://staging.mais.test/api/auth/google/callback",
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "local", allowLocalhost: true });
  assert.equal(nonLocalHttp.ready, false);
  assert.ok(nonLocalHttp.blockers.some((blocker) => blocker.includes("HTTPS except for loopback")));

  const redirectWithQuery = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback?unexpected=1",
    AUTH_SESSION_SECRET: authSessionSecretFixture
  }, { mode: "production", allowLocalhost: false });
  assert.equal(redirectWithQuery.ready, false);
  assert.ok(redirectWithQuery.blockers.some((blocker) => blocker.includes("query or fragment")));

  const publicSecret = evaluateReadiness({
    GOOGLE_OAUTH_ENABLED: "true",
    GOOGLE_OAUTH_CLIENT_ID: "redacted-client-id",
    GOOGLE_OAUTH_CLIENT_SECRET: googleClientSecretFixture,
    GOOGLE_OAUTH_REDIRECT_URI: "https://mais.test/api/auth/google/callback",
    AUTH_SESSION_SECRET: authSessionSecretFixture,
    NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET: "do-not-expose"
  }, { mode: "production", allowLocalhost: false });
  assert.equal(publicSecret.ready, false);
  assert.ok(publicSecret.blockers.some((blocker) => blocker.includes("NEXT_PUBLIC_")));
}
