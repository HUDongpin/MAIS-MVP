export function evaluateBudget(value, warnAt, failAt) {
  if (value > failAt) return "fail";
  if (value > warnAt) return "warn";
  return "pass";
}

export function extractNextAssets(html) {
  const assets = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/[^"?#]+)/g)) {
    assets.add(match[1]);
  }
  return [...assets].sort();
}

export function classifySmokeFailure(outputText) {
  const environmental =
    /request-timeout|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed|UND_ERR|HeadersTimeoutError|socket hang up/i;
  return environmental.test(outputText) ? "environmental" : "real";
}

export function daysUntil(dateText) {
  return (new Date(dateText).getTime() - Date.now()) / 86_400_000;
}

export function aggregateVerdict(results) {
  let findings = false;
  for (const result of results) {
    if (result.severity === "P0" && result.status === "fail") return "FAILED";
    if (result.status === "fail" || result.status === "warn") findings = true;
    if (result.severity === "P0" && result.status === "skip") findings = true;
  }
  return findings ? "CERTIFIED_WITH_FINDINGS" : "CERTIFIED";
}

function count(report, status) {
  return report.results.filter((result) => result.status === status).length;
}

export function formatReportMarkdown(report) {
  const lines = [
    `# Production certification — ${report.verdict}`,
    "",
    `- Generated: ${report.generatedAt}`,
    `- Domains: ${report.domains.join(", ")}`,
    `- Checks: ${report.results.length} (pass ${count(report, "pass")}, warn ${count(report, "warn")}, fail ${count(report, "fail")}, skip ${count(report, "skip")})`,
    `- Write footprint: ${report.writeFootprint}`,
    "",
    "| Status | Sev | Check | Domain | Detail |",
    "|--------|-----|-------|--------|--------|"
  ];
  for (const result of report.results) {
    const detail = String(result.detail ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
    lines.push(`| ${result.status.toUpperCase()} | ${result.severity} | ${result.id} | ${result.domain ?? "—"} | ${detail} |`);
  }
  lines.push("", "Point-in-time sample of the promoted build. Content correctness is certified by CI, not by this run.");
  return lines.join("\n");
}

export function parseArgs(argv) {
  const args = { json: false, strict: false, skipSmokes: false, skipBrowser: false, out: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") args.json = true;
    else if (argument === "--strict") args.strict = true;
    else if (argument === "--skip-smokes") args.skipSmokes = true;
    else if (argument === "--skip-browser") args.skipBrowser = true;
    else if (argument === "--out") {
      index += 1;
      if (index >= argv.length || typeof argv[index] !== "string" || argv[index] === "") {
        throw new Error("--out requires one non-empty path argument");
      }
      args.out = argv[index];
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  return args;
}
