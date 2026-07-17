#!/usr/bin/env node

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline/promises");

const cwd = process.cwd();
loadEnvFiles();

const reportPath = path.join(cwd, "bug-triage-report.md");
const fixLogPath = path.resolve(cwd, process.env.BUG_FIX_LOG_PATH || "bug-fix-log.json");
const requiredEnvNames = ["BUG_LRS_ENDPOINT", "BUG_LRS_USERNAME", "BUG_LRS_PASSWORD"];
const severityWeights = { fatal: 4, error: 3, warning: 2, info: 1 };
const xapiVersion = "1.0.3";

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--since") {
      args.since = argv[++index];
    } else if (arg === "--mark-fixed") {
      args.markFixed = argv[++index];
      args.note = argv.slice(index + 1).join(" ").trim();
      break;
    } else if (arg === "--dismiss") {
      args.dismiss = argv[++index];
      args.reason = argv.slice(index + 1).join(" ").trim();
      break;
    } else if (arg === "--reset") {
      args.reset = true;
    } else if (arg === "--fix-log") {
      args.fixLog = true;
    } else if (arg === "--self-test") {
      args.selfTest = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    } else {
      args._.push(arg);
    }
  }
  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/bug-triage.js",
    "  node scripts/bug-triage.js --since 24h",
    "  node scripts/bug-triage.js --mark-fixed <id> \"fixed note\"",
    "  node scripts/bug-triage.js --dismiss <id> \"reason\"",
    "  node scripts/bug-triage.js --fix-log",
    "  node scripts/bug-triage.js --reset",
    "",
    "The --since command writes bug-triage-report.md.",
    "Generated fix/report files are local artifacts and should stay uncommitted."
  ].join("\n");
}

function loadEnvFiles() {
  for (const filename of [".env.local", ".env"]) {
    const filePath = path.join(cwd, filename);
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function parseEnvFile(text) {
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    parsed[match[1]] = unquoteEnvValue(match[2].trim());
  }
  return parsed;
}

function unquoteEnvValue(value) {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  const hashIndex = value.search(/\s#/);
  return hashIndex === -1 ? value : value.slice(0, hashIndex).trim();
}

function readConfig() {
  const missing = requiredEnvNames.filter((name) => !process.env[name]?.trim());
  return {
    appId: process.env.BUG_APP_ID?.trim() || "default",
    appUrl: stripTrailingSlash(process.env.APP_URL?.trim() || "http://localhost:3000"),
    configured: missing.length === 0,
    endpoint: process.env.BUG_LRS_ENDPOINT?.trim() || "",
    missing,
    username: process.env.BUG_LRS_USERNAME?.trim() || "",
    password: process.env.BUG_LRS_PASSWORD || ""
  };
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function statementsEndpoint(endpoint) {
  const url = new URL(endpoint);
  if (url.pathname.replace(/\/+$/, "").endsWith("/statements")) return url;
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/statements`;
  return url;
}

function parseSince(value = "7d", now = new Date()) {
  const trimmed = String(value || "7d").trim();
  const match = trimmed.match(/^(\d+)([hmwd])$/i);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
      h: 60 * 60 * 1000,
      m: 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    return {
      label: trimmed,
      since: new Date(now.getTime() - amount * multipliers[unit]).toISOString()
    };
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return { label: trimmed, since: parsed.toISOString() };
  }

  throw new Error(`Invalid --since range: ${value}`);
}

function authHeader(config) {
  return `Basic ${Buffer.from(`${config.username}:${config.password}`, "utf8").toString("base64")}`;
}

async function fetchStatements(config, sinceIso) {
  const firstUrl = statementsEndpoint(config.endpoint);
  firstUrl.searchParams.set("since", sinceIso);
  firstUrl.searchParams.set("limit", "100");

  const statements = [];
  let nextUrl = firstUrl;
  let pageCount = 0;

  while (nextUrl) {
    pageCount += 1;
    if (pageCount > 100) throw new Error("BUG_LRS pagination exceeded 100 pages.");
    const response = await fetch(nextUrl, {
      headers: {
        Authorization: authHeader(config),
        "X-Experience-API-Version": xapiVersion
      }
    });

    if (!response.ok) {
      throw new Error(`BUG_LRS request failed with HTTP ${response.status}.`);
    }

    const body = await response.json();
    if (Array.isArray(body.statements)) statements.push(...body.statements);
    if (!body.more) break;
    nextUrl = new URL(body.more, nextUrl);
  }

  return statements;
}

function readFixLog() {
  if (!fs.existsSync(fixLogPath)) return { fixed: {}, dismissed: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(fixLogPath, "utf8"));
    return {
      fixed: parsed.fixed && typeof parsed.fixed === "object" ? parsed.fixed : {},
      dismissed: parsed.dismissed && typeof parsed.dismissed === "object" ? parsed.dismissed : {}
    };
  } catch {
    return { fixed: {}, dismissed: {} };
  }
}

function writeFixLog(log) {
  fs.writeFileSync(fixLogPath, `${JSON.stringify(log, null, 2)}\n`);
}

function extensionValue(extensions, suffix) {
  if (!extensions || typeof extensions !== "object") return undefined;
  if (Object.hasOwn(extensions, suffix)) return extensions[suffix];
  for (const [key, value] of Object.entries(extensions)) {
    if (key === suffix || key.endsWith(`/${suffix}`)) return value;
  }
  return undefined;
}

function localizedValue(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  return value["en-US"] || value.en || Object.values(value).find((entry) => typeof entry === "string") || "";
}

function normalizeSeverity(value) {
  const normalized = String(value || "error").toLowerCase();
  return Object.hasOwn(severityWeights, normalized) ? normalized : "error";
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function statementAppId(statement, extensions) {
  const explicit = extensionValue(extensions, "appId");
  if (explicit) return String(explicit);
  const activityId = statement.object?.id;
  const match = typeof activityId === "string" ? activityId.match(/\/errors\/([^/]+)\//) : null;
  if (match) return decodeURIComponent(match[1]);
  const name = localizedValue(statement.object?.definition?.name);
  const nameMatch = name.match(/^\[([^\]]+)]/);
  return nameMatch?.[1] || "";
}

function parseStatement(statement) {
  const extensions = statement.context?.extensions ?? {};
  const objectDefinition = statement.object?.definition ?? {};
  const message = String(
    extensionValue(extensions, "message") ||
    localizedValue(objectDefinition.description) ||
    localizedValue(objectDefinition.name) ||
    statement.result?.response ||
    "Unknown BUG_LRS error"
  );
  const route = String(extensionValue(extensions, "route") || "");
  const statusCode = extensionValue(extensions, "statusCode");
  const source = String(extensionValue(extensions, "source") || "server");
  const severity = normalizeSeverity(extensionValue(extensions, "severity"));
  const rawErrorId = String(extensionValue(extensions, "errorId") || statement.id || "");
  const key = [
    source.toLowerCase(),
    normalizeForKey(message),
    route,
    statusCode === undefined ? "" : String(statusCode)
  ].join("|");

  return {
    appId: statementAppId(statement, extensions),
    category: categorize({ message, route, source, statusCode }),
    component: stringOrEmpty(extensionValue(extensions, "component")),
    context: parseMaybeJson(extensionValue(extensions, "context")),
    errorId: rawErrorId,
    id: `bug-${sha256(key).slice(0, 12)}`,
    key,
    message,
    method: stringOrEmpty(extensionValue(extensions, "method")),
    route,
    severity,
    source,
    stack: stringOrEmpty(extensionValue(extensions, "stack")),
    statementId: stringOrEmpty(statement.id),
    statusCode: statusCode === undefined || statusCode === null ? "" : String(statusCode),
    timestamp: statement.timestamp || statement.stored || new Date().toISOString()
  };
}

function isBugStatement(statement) {
  const verbId = String(statement.verb?.id || "").toLowerCase();
  return verbId === "http://adlnet.gov/expapi/verbs/failed" || verbId.endsWith("/failed");
}

function stringOrEmpty(value) {
  return value === undefined || value === null ? "" : String(value);
}

function normalizeForKey(value) {
  return redact(String(value))
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "<uuid>")
    .replace(/\b\d{5,}\b/g, "<number>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function categorize({ message, route, source, statusCode }) {
  const haystack = `${message} ${route} ${source} ${statusCode || ""}`.toLowerCase();
  if (/auth|login|session|permission|unauthori[sz]ed|forbidden|401|403/.test(haystack)) return "Authentication";
  if (/not found|missing route|404/.test(haystack)) return "Not Found";
  if (/rate limit|too many|429/.test(haystack)) return "Rate Limiting";
  if (/storage|gcs|bucket|object-store|postgres|sqlite|database|db /.test(haystack)) return "Storage/GCS";
  if (/xapi|lrs|statement|learning record/.test(haystack)) return "xAPI/LRS";
  if (/llm|deepseek|openai|ai tutor|model|token/.test(haystack)) return "LLM/AI";
  if (/assessment|submission|grading/.test(haystack)) return "Assessment";
  if (/i18n|locale|translation|zh|chinese|language/.test(haystack)) return "i18n";
  if (/voice|speech|websocket|audio/.test(haystack)) return "Voice/WebSocket";
  if (/json|parse|schema|payload|invalid|validation/.test(haystack)) return "Data Parsing";
  if (/lesson|practice|learning|question|adaptive/.test(haystack)) return "Learning";
  if (/client|browser|react|hydration|console|window|component/.test(haystack)) return "Client Console";
  if (/payload too large|413|body size|content-length/.test(haystack)) return "Payload Size";
  if (/500|server error|internal/.test(haystack)) return "Server Error";
  return "Other";
}

function dedupeBugs(statements, config, fixLog) {
  const bugsByKey = new Map();
  for (const statement of statements) {
    if (!isBugStatement(statement)) continue;
    const parsed = parseStatement(statement);
    if (parsed.appId && parsed.appId !== config.appId) continue;
    const current = bugsByKey.get(parsed.key);
    if (!current) {
      bugsByKey.set(parsed.key, {
        ...parsed,
        errorIds: parsed.errorId ? [parsed.errorId] : [],
        statementIds: parsed.statementId ? [parsed.statementId] : [],
        occurrences: 1,
        firstSeen: parsed.timestamp,
        lastSeen: parsed.timestamp
      });
      continue;
    }

    current.occurrences += 1;
    if (parsed.errorId && !current.errorIds.includes(parsed.errorId)) current.errorIds.push(parsed.errorId);
    if (parsed.statementId && !current.statementIds.includes(parsed.statementId)) current.statementIds.push(parsed.statementId);
    if (new Date(parsed.timestamp).getTime() < new Date(current.firstSeen).getTime()) current.firstSeen = parsed.timestamp;
    if (new Date(parsed.timestamp).getTime() > new Date(current.lastSeen).getTime()) current.lastSeen = parsed.timestamp;
  }

  return Array.from(bugsByKey.values()).map((bug) => {
    const fixedEntry = fixLog.fixed[bug.id] || bug.errorIds.map((id) => fixLog.fixed[id]).find(Boolean);
    const dismissedEntry = fixLog.dismissed[bug.id] || bug.errorIds.map((id) => fixLog.dismissed[id]).find(Boolean);
    return {
      ...bug,
      score: severityWeights[bug.severity] * Math.min(bug.occurrences, 10),
      status: fixedEntry ? "fixed" : dismissedEntry ? "dismissed" : "open",
      fixNote: fixedEntry?.note || "",
      dismissReason: dismissedEntry?.reason || ""
    };
  }).sort(compareBugs);
}

function compareBugs(a, b) {
  return b.score - a.score || new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime() || a.id.localeCompare(b.id);
}

function summarizeBugs(bugs, totalStatements, config, since) {
  const summary = {
    appId: config.appId,
    configured: config.configured,
    since: since.since,
    range: since.label,
    totalStatements,
    unique: bugs.length,
    open: bugs.filter((bug) => bug.status === "open").length,
    fixed: bugs.filter((bug) => bug.status === "fixed").length,
    dismissed: bugs.filter((bug) => bug.status === "dismissed").length,
    bySeverity: {},
    bySource: {},
    byCategory: {}
  };

  for (const bug of bugs) {
    increment(summary.bySeverity, bug.severity);
    increment(summary.bySource, bug.source || "unknown");
    increment(summary.byCategory, bug.category);
  }

  return summary;
}

function increment(target, key) {
  target[key] = (target[key] || 0) + 1;
}

function groupedOpenBugs(bugs) {
  const groups = new Map();
  for (const bug of bugs.filter((candidate) => candidate.status === "open")) {
    const group = groups.get(bug.category) || { category: bug.category, score: 0, bugs: [] };
    group.score += bug.score;
    group.bugs.push(bug);
    groups.set(bug.category, group);
  }
  return Array.from(groups.values()).sort((a, b) => b.score - a.score || a.category.localeCompare(b.category));
}

function redact(value) {
  return String(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(password|secret|token|api[_-]?key|authorization)(["'=:\s]+)([^"'\s,;]+)/gi, "$1$2[redacted]")
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/g, "$1 [redacted]");
}

function escapeCell(value) {
  return redact(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .slice(0, 260);
}

function formatObject(value) {
  if (value === undefined || value === null || value === "") return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return redact(text).slice(0, 2000);
}

function renderReport({ bugs, config, fetchError, since, summary }) {
  const lines = [];
  lines.push("# BUG_LRS Triage Report");
  lines.push("");
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Range: ${since.label}`);
  lines.push(`- Since: ${since.since}`);
  lines.push(`- App ID: ${summary.appId}`);
  lines.push(`- Configured: ${summary.configured ? "yes" : "no"}`);
  if (!summary.configured) lines.push(`- Missing env names: ${config.missing.join(", ") || "none"}`);
  if (fetchError) lines.push(`- Fetch error: ${escapeCell(fetchError.message || fetchError)}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total statements: ${summary.totalStatements}`);
  lines.push(`- Unique bugs: ${summary.unique}`);
  lines.push(`- Open: ${summary.open}`);
  lines.push(`- Fixed: ${summary.fixed}`);
  lines.push(`- Dismissed: ${summary.dismissed}`);
  lines.push(`- By severity: ${JSON.stringify(summary.bySeverity)}`);
  lines.push(`- By source: ${JSON.stringify(summary.bySource)}`);
  lines.push(`- Top categories: ${Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(", ") || "none"}`);
  lines.push("");
  lines.push("## Open Bugs");
  lines.push("");

  const groups = groupedOpenBugs(bugs);
  if (!groups.length) {
    lines.push("No open bugs in this BUG_LRS range.");
  }

  for (const group of groups) {
    lines.push(`### ${group.category}`);
    lines.push("");
    lines.push("| id | severity | score | occurrences | source | route/status | last seen | message |");
    lines.push("| --- | --- | ---: | ---: | --- | --- | --- | --- |");
    for (const bug of group.bugs) {
      lines.push([
        bug.id,
        bug.severity,
        bug.score,
        bug.occurrences,
        escapeCell(bug.source),
        escapeCell([bug.method, bug.route, bug.statusCode].filter(Boolean).join(" ")),
        escapeCell(bug.lastSeen),
        escapeCell(bug.message)
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
    }
    lines.push("");
  }

  lines.push("## Fixed / Dismissed");
  lines.push("");
  const closed = bugs.filter((bug) => bug.status !== "open");
  if (!closed.length) {
    lines.push("No fixed or dismissed bugs recorded in the local fix log.");
  } else {
    lines.push("| id | status | note/reason |");
    lines.push("| --- | --- | --- |");
    for (const bug of closed) {
      lines.push(`| ${bug.id} | ${bug.status} | ${escapeCell(bug.fixNote || bug.dismissReason)} |`);
    }
  }

  lines.push("");
  lines.push("## Detail");
  lines.push("");
  for (const bug of bugs.slice(0, 50)) {
    lines.push(`### ${bug.id}`);
    lines.push("");
    lines.push(`- Status: ${bug.status}`);
    lines.push(`- Category: ${bug.category}`);
    lines.push(`- Severity: ${bug.severity}`);
    lines.push(`- Score: ${bug.score}`);
    lines.push(`- Occurrences: ${bug.occurrences}`);
    lines.push(`- First seen: ${bug.firstSeen}`);
    lines.push(`- Last seen: ${bug.lastSeen}`);
    lines.push(`- Source: ${escapeCell(bug.source)}`);
    lines.push(`- Route: ${escapeCell([bug.method, bug.route, bug.statusCode].filter(Boolean).join(" "))}`);
    lines.push(`- Component: ${escapeCell(bug.component) || "n/a"}`);
    lines.push(`- Error IDs: ${bug.errorIds.slice(0, 10).map(escapeCell).join(", ") || "n/a"}`);
    lines.push(`- Message: ${escapeCell(bug.message)}`);
    const stack = formatObject(bug.stack);
    if (stack) {
      lines.push("");
      lines.push("```text");
      lines.push(stack);
      lines.push("```");
    }
    const context = formatObject(bug.context);
    if (context) {
      lines.push("");
      lines.push("```json");
      lines.push(context);
      lines.push("```");
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function writeReport(payload) {
  const text = renderReport(payload);
  fs.writeFileSync(reportPath, text);
}

function printSummary(summary, bugs) {
  console.log(`BUG_LRS range ${summary.range}: ${summary.unique} unique, ${summary.open} open, ${summary.fixed} fixed, ${summary.dismissed} dismissed.`);
  for (const bug of bugs.filter((candidate) => candidate.status === "open").slice(0, 20)) {
    console.log(`${bug.id} [${bug.severity}] ${bug.category} x${bug.occurrences} ${redact(bug.message).slice(0, 140)}`);
  }
  console.log(`Report: ${path.relative(cwd, reportPath)}`);
}

async function runSince(range) {
  const since = parseSince(range || "7d");
  const config = readConfig();
  const fixLog = readFixLog();

  if (!config.configured) {
    const summary = summarizeBugs([], 0, config, since);
    writeReport({ bugs: [], config, since, summary });
    printSummary(summary, []);
    return { bugs: [], summary };
  }

  let statements = [];
  let fetchError = null;
  try {
    statements = await fetchStatements(config, since.since);
  } catch (error) {
    fetchError = error;
  }
  const bugs = dedupeBugs(statements, config, fixLog);
  const summary = summarizeBugs(bugs, statements.length, config, since);
  writeReport({ bugs, config, fetchError, since, summary });
  printSummary(summary, bugs);
  if (fetchError) {
    process.exitCode = 2;
    console.error(`BUG_LRS fetch failed: ${redact(fetchError.message || fetchError)}`);
  }
  return { bugs, summary };
}

function markFixed(id, note) {
  if (!id) throw new Error("--mark-fixed requires an id.");
  if (!note) throw new Error("--mark-fixed requires a note.");
  const log = readFixLog();
  log.fixed[id] = { fixedAt: new Date().toISOString(), note: redact(note) };
  delete log.dismissed[id];
  writeFixLog(log);
  console.log(`Marked fixed: ${id}`);
}

function dismissBug(id, reason) {
  if (!id) throw new Error("--dismiss requires an id.");
  if (!reason) throw new Error("--dismiss requires a reason.");
  const log = readFixLog();
  log.dismissed[id] = { dismissedAt: new Date().toISOString(), reason: redact(reason) };
  delete log.fixed[id];
  writeFixLog(log);
  console.log(`Dismissed: ${id}`);
}

function resetFixLog() {
  writeFixLog({ fixed: {}, dismissed: {} });
  console.log(`Reset ${path.relative(cwd, fixLogPath)}`);
}

function printFixLog() {
  console.log(JSON.stringify(readFixLog(), null, 2));
}

async function interactive() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("BUG_LRS triage");
    console.log("1. Fetch 7d");
    console.log("2. Fetch custom range");
    console.log("5. Mark fixed");
    console.log("6. Dismiss");
    console.log("8. View fix log");
    console.log("9. Reset fix log");
    console.log("0. Exit");
    const choice = (await rl.question("> ")).trim();
    if (choice === "0") return;
    if (choice === "1" || choice === "3" || choice === "7") {
      await runSince("7d");
    } else if (choice === "2") {
      await runSince((await rl.question("Range (1h, 24h, 7d, 30d): ")).trim() || "7d");
    } else if (choice === "5") {
      const id = (await rl.question("Bug id: ")).trim();
      const note = (await rl.question("Fix note: ")).trim();
      markFixed(id, note);
    } else if (choice === "6") {
      const id = (await rl.question("Bug id: ")).trim();
      const reason = (await rl.question("Dismiss reason: ")).trim();
      dismissBug(id, reason);
    } else if (choice === "8") {
      printFixLog();
    } else if (choice === "9") {
      resetFixLog();
    } else {
      console.log("Unknown choice.");
    }
  } finally {
    rl.close();
  }
}

function selfTest() {
  const since = parseSince("24h", new Date("2026-06-24T12:00:00.000Z"));
  assert.equal(since.since, "2026-06-23T12:00:00.000Z");
  assert.equal(categorize({ message: "AUTH_SESSION_SECRET missing", route: "/login" }), "Authentication");
  assert.equal(categorize({ message: "SyntaxError JSON parse failed", route: "/api/questions" }), "Data Parsing");
  assert.match(redact("user peter@example.com token=abc123"), /\[redacted-email]/);
  assert.doesNotMatch(redact("user peter@example.com token=abc123"), /abc123/);

  const statement = {
    id: "statement-1",
    timestamp: "2026-06-24T00:00:00.000Z",
    verb: { id: "http://adlnet.gov/expapi/verbs/failed" },
    object: { definition: { name: { "en-US": "[mais][ERROR] boom" } } },
    context: {
      extensions: {
        "http://localhost:3000/appId": "mais",
        "http://localhost:3000/errorId": "err-1",
        "http://localhost:3000/source": "client",
        "http://localhost:3000/severity": "error",
        "http://localhost:3000/message": "Boom for peter@example.com",
        "http://localhost:3000/route": "/practice"
      }
    }
  };
  const bug = dedupeBugs([statement, statement], { appId: "mais" }, { fixed: {}, dismissed: {} })[0];
  assert.equal(bug.occurrences, 2);
  assert.equal(bug.source, "client");
  assert.equal(bug.status, "open");
  const learningEvent = {
    ...statement,
    id: "statement-2",
    verb: { id: "http://adlnet.gov/expapi/verbs/experienced" },
    context: {
      extensions: {
        "http://localhost:3000/appId": "mais",
        "http://localhost:3000/source": "lesson",
        "http://localhost:3000/message": "lesson page-view"
      }
    }
  };
  assert.equal(dedupeBugs([learningEvent], { appId: "mais" }, { fixed: {}, dismissed: {} }).length, 0);
  assert.match(renderReport({
    bugs: [bug],
    config: { configured: true, missing: [], appId: "mais" },
    since: { label: "24h", since: since.since },
    summary: summarizeBugs([bug], 2, { appId: "mais", configured: true }, since)
  }), /\[redacted-email]/);
  console.log("bug-triage self-test passed");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (args.selfTest) {
    selfTest();
    return;
  }
  if (args.since) {
    await runSince(args.since);
    return;
  }
  if (args.markFixed) {
    markFixed(args.markFixed, args.note);
    return;
  }
  if (args.dismiss) {
    dismissBug(args.dismiss, args.reason);
    return;
  }
  if (args.reset) {
    resetFixLog();
    return;
  }
  if (args.fixLog) {
    printFixLog();
    return;
  }
  await interactive();
}

main().catch((error) => {
  console.error(`bug-triage failed: ${redact(error.message || error)}`);
  process.exitCode = 1;
});
