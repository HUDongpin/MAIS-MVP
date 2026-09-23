import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { inferK5Answer, k5ItemTemplates, k5TemplatesById } from "../lib/itemTemplates/k5Templates";

type CandidateRow = {
  id?: unknown;
  grade?: unknown;
  generationTemplate?: unknown;
  standardIds?: unknown;
  prompt?: { en?: unknown };
  answer?: unknown;
  acceptedAnswers?: unknown;
};

export type K5AuditIssue = { id: string; code: string; family?: string };
export type K5AuditReport = {
  schemaVersion: 1;
  packSha256: string | null;
  total: number;
  verified: number;
  mismatched: number;
  coveredFamilies: number;
  coverage: number;
  minCoverage: number;
  minFamilies: number;
  ok: boolean;
  issues: K5AuditIssue[];
  rows: { id: string; family: string; grade: string; status: "verified" | "failed" }[];
};

const numericKey = (value: unknown): number | null =>
  typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())
    ? Number(value.trim())
    : null;

export function auditK5Pack(
  packPath: string,
  { minCoverage = 1, minFamilies = k5ItemTemplates.length }: { minCoverage?: number; minFamilies?: number } = {}
): K5AuditReport {
  const report: K5AuditReport = {
    schemaVersion: 1,
    packSha256: null,
    total: 0,
    verified: 0,
    mismatched: 0,
    coveredFamilies: 0,
    coverage: 0,
    minCoverage,
    minFamilies,
    ok: false,
    issues: [],
    rows: []
  };
  const fail = (id: string, code: string, family?: string) => report.issues.push({ id, code, family });
  if (!Number.isFinite(minCoverage) || minCoverage <= 0 || minCoverage > 1 || !Number.isInteger(minFamilies) || minFamilies < 1) {
    fail("pack", "invalid-audit-threshold");
    return report;
  }

  let pack: { questions?: CandidateRow[] };
  try {
    const bytes = readFileSync(packPath);
    report.packSha256 = createHash("sha256").update(bytes).digest("hex");
    pack = JSON.parse(bytes.toString("utf8")) as { questions?: CandidateRow[] };
  } catch {
    fail("pack", "unreadable-pack");
    return report;
  }
  if (!pack || !Array.isArray(pack.questions) || pack.questions.length === 0) {
    fail("pack", "empty-or-invalid-questions");
    return report;
  }

  report.total = pack.questions.length;
  const ids = new Set<string>();
  const prompts = new Set<string>();
  const verifiedFamilies = new Set<string>();
  for (const [index, raw] of pack.questions.entries()) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      const id = `row-${index + 1}`;
      fail(id, "invalid-row");
      report.rows.push({ id, family: "", grade: "", status: "failed" });
      continue;
    }
    const row = raw as CandidateRow;
    const id = typeof row?.id === "string" && row.id.trim() ? row.id : `row-${index + 1}`;
    const family = typeof row?.generationTemplate === "string" ? row.generationTemplate : "";
    const grade = typeof row?.grade === "string" ? row.grade : "";
    const prompt = typeof row?.prompt?.en === "string" ? row.prompt.en : "";
    const template = k5TemplatesById.get(family);
    const before = report.issues.length;

    if (ids.has(id)) fail(id, "duplicate-id", family);
    ids.add(id);
    if (!prompt) fail(id, "missing-prompt", family);
    else if (prompts.has(prompt)) fail(id, "duplicate-prompt", family);
    prompts.add(prompt);
    if (!template) fail(id, "unknown-template", family);
    else {
      if (!template.grades.includes(grade as never)) fail(id, "grade-outside-template", family);
      if (!Array.isArray(row.standardIds) || row.standardIds.length === 0 ||
          !row.standardIds.every((code) => typeof code === "string" && template.ccss.includes(code))) {
        fail(id, "standard-outside-template", family);
      }
    }

    const stored = numericKey(row.answer);
    if (stored === null || !Number.isFinite(stored)) fail(id, "invalid-answer-key", family);
    if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) {
      fail(id, "accepted-answer-missing-key", family);
    }

    if (template && prompt && stored !== null) {
      const ownSolution = template.solve(prompt);
      const inferred = inferK5Answer(prompt);
      if (ownSolution === null || !Number.isFinite(ownSolution) || !inferred || "ambiguous" in inferred || !inferred.solvers.includes(family)) {
        fail(id, "solver-uncovered-or-ambiguous", family);
      } else if (Math.abs(ownSolution - stored) > 1e-9 || Math.abs(inferred.value - stored) > 1e-9) {
        report.mismatched += 1;
        fail(id, "answer-mismatch", family);
      }
    }

    const status = report.issues.length === before ? "verified" : "failed";
    report.rows.push({ id, family, grade, status });
    if (status === "verified") {
      report.verified += 1;
      verifiedFamilies.add(family);
    }
  }
  report.coveredFamilies = verifiedFamilies.size;
  report.coverage = report.verified / report.total;
  if (report.coverage < minCoverage) fail("pack", "coverage-below-minimum");
  if (report.coveredFamilies < minFamilies) fail("pack", "family-coverage-below-minimum");
  report.ok = report.issues.length === 0;
  return report;
}

function csvCell(value: string) { return `"${value.replaceAll('"', '""')}"`; }

function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index < 0 ? undefined : args[index + 1];
  };
  const packPath = value("--pack") ?? path.join(process.cwd(), "coordination/content-qa/us-ca-k5-verified-templates-v4/question-pack.json");
  const report = auditK5Pack(packPath);
  const jsonPath = value("--json");
  const csvPath = value("--csv");
  const mdPath = value("--md");
  if (jsonPath) writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  if (csvPath) writeFileSync(csvPath, ["id,family,grade,status", ...report.rows.map((r) =>
    [r.id, r.family, r.grade, r.status].map(csvCell).join(","))].join("\n") + "\n");
  if (mdPath) writeFileSync(mdPath,
    `# K–5 candidate solvability audit\n\nPack SHA-256: \`${report.packSha256 ?? "unreadable"}\`\n\n` +
    `Status: **${report.ok ? "PASS" : "FAIL"}**; ${report.verified}/${report.total} independently solved; ` +
    `${report.coveredFamilies}/${k5ItemTemplates.length} families; ${report.mismatched} wrong keys.\n\n` +
    `Issue codes: ${report.issues.length ? report.issues.map((issue) => `${issue.id}:${issue.code}`).join(", ") : "none"}.\n`
  );
  console.log(JSON.stringify({ ok: report.ok, total: report.total, verified: report.verified,
    families: report.coveredFamilies, mismatched: report.mismatched, issues: report.issues.slice(0, 10) }));
  process.exitCode = report.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith("audit-k5-item-coverage.ts")) main();
