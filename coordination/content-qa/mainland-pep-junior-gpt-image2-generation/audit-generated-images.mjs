#!/usr/bin/env node

import fs from "node:fs";
import {
  fsBasePath,
  fsQuestionPath,
  hktTimestamp,
  inspectPng,
  parseArgs,
  qaReportPath,
  readManifest,
  readQuestions,
  readTemplateFamilies,
  relativeToRoot,
  validateSourceInputs,
  writeManifest
} from "./pipeline-lib.mjs";

const args = parseArgs();
const allowPending = Boolean(args["allow-pending"]);
const preflightOnly = Boolean(args.preflight);

run();

function run() {
  const templates = readTemplateFamilies();
  const questions = readQuestions();
  const sourceValidation = validateSourceInputs(templates, questions);
  const manifest = readManifest();

  const findings = [];
  if (!sourceValidation.passed) {
    for (const check of sourceValidation.checks.filter((item) => !item.pass)) {
      findings.push({ severity: "blocker", message: `Source check failed: ${check.name} (actual: ${check.actual})` });
    }
  }

  if (!manifest) {
    findings.push({ severity: "blocker", message: "manifest.json missing; run prepare-prompts.mjs" });
  }

  const stats = {
    generatedAtHkt: hktTimestamp(),
    mode: preflightOnly ? "preflight" : "post-generation-audit",
    sourceValidation: sourceValidation.counts,
    manifestTemplateFamilies: manifest?.templateFamilies?.length ?? 0,
    manifestQuestions: manifest ? Object.keys(manifest.questions ?? {}).length : 0,
    approvedBaseImages: 0,
    missingBaseImages: 0,
    renderedQuestionPngs: 0,
    missingQuestionPngs: 0,
    passQa: 0,
    blockedQa: 0,
    pendingQa: 0,
    overlaySpecsComplete: 0,
    overlaySpecsMissing: 0
  };

  if (manifest) {
    if (manifest.templateFamilies.length !== 20) {
      findings.push({ severity: "blocker", message: `Manifest template-family count should be 20 for core scope, found ${manifest.templateFamilies.length}` });
    }
    if (Object.keys(manifest.questions ?? {}).length !== 691) {
      findings.push({ severity: "blocker", message: `Manifest question count should be 691 for core scope, found ${Object.keys(manifest.questions ?? {}).length}` });
    }

    for (const template of manifest.templateFamilies) {
      const info = inspectPng(fsBasePath(template.templateFamilyId));
      if (info.exists && info.isPng && info.width === 1536 && info.height === 1024) {
        stats.approvedBaseImages += 1;
      } else {
        stats.missingBaseImages += 1;
        if (!preflightOnly) {
          findings.push({
            severity: "blocker",
            message: `Approved base PNG missing or wrong size for ${template.templateFamilyId}`
          });
        }
      }
    }

    for (const entry of Object.values(manifest.questions)) {
      const info = inspectPng(fsQuestionPath(entry.questionId));
      if (info.exists && info.isPng && info.width === 1536 && info.height === 1024) {
        stats.renderedQuestionPngs += 1;
      } else {
        stats.missingQuestionPngs += 1;
        if (!preflightOnly) {
          findings.push({ severity: "blocker", message: `Final question PNG missing or wrong size for ${entry.questionId}` });
        }
      }
      if (entry.qaStatus === "pass") stats.passQa += 1;
      else if (String(entry.qaStatus ?? "").startsWith("blocked")) stats.blockedQa += 1;
      else stats.pendingQa += 1;
      if (entry.overlaySpec?.overlayType && entry.overlaySpec?.deterministicElements?.length) {
        stats.overlaySpecsComplete += 1;
      } else {
        stats.overlaySpecsMissing += 1;
        findings.push({ severity: "blocker", message: `Overlay spec missing required fields for ${entry.questionId}` });
      }
    }

    manifest.lastAudit = {
      auditedAtHkt: stats.generatedAtHkt,
      preflightOnly,
      passed: findings.length === 0 || allowPending,
      stats,
      findings: findings.slice(0, 200)
    };
    writeManifest(manifest);
  }

  fs.writeFileSync(qaReportPath, toMarkdown({ stats, findings, allowPending, preflightOnly, sourceValidation, manifest }), "utf8");
  console.log(JSON.stringify({
    report: relativeToRoot(qaReportPath),
    findings: findings.length,
    passed: findings.length === 0 || allowPending,
    stats
  }, null, 2));

  if (findings.length > 0 && !allowPending) {
    process.exitCode = 1;
  }
}

function toMarkdown({ stats, findings, allowPending, preflightOnly, sourceValidation, manifest }) {
  const status = findings.length === 0 ? "Pass" : allowPending ? "Pending / allowed" : "Blocked";
  const lines = [
    "# Mainland PEP Junior GPT Image2 Illustration QA Report",
    "",
    `- Generated at (HKT): ${stats.generatedAtHkt}`,
    `- Mode: ${stats.mode}`,
    `- Status: ${status}`,
    `- Scope: ${manifest?.scope ?? "manifest missing"}`,
    "",
    "## Source Validation",
    "",
    ...sourceValidation.checks.map((check) => `- ${check.pass ? "PASS" : "FAIL"}: ${check.name} (${check.actual})`),
    "",
    "## Asset Status",
    "",
    `- Manifest template families: ${stats.manifestTemplateFamilies}`,
    `- Manifest questions: ${stats.manifestQuestions}`,
    `- Approved base images: ${stats.approvedBaseImages}`,
    `- Missing base images: ${stats.missingBaseImages}`,
    `- Rendered final question PNGs: ${stats.renderedQuestionPngs}`,
    `- Missing final question PNGs: ${stats.missingQuestionPngs}`,
    `- QA pass: ${stats.passQa}`,
    `- QA blocked: ${stats.blockedQa}`,
    `- QA pending/planned: ${stats.pendingQa}`,
    `- Overlay specs complete: ${stats.overlaySpecsComplete}`,
    `- Overlay specs missing: ${stats.overlaySpecsMissing}`,
    "",
    "## Findings",
    ""
  ];

  if (findings.length === 0) {
    lines.push("- None.");
  } else if (preflightOnly || allowPending) {
    lines.push("- Live image assets are not required for this preflight/pending audit.");
    lines.push(...findings.slice(0, 50).map((finding) => `- ${finding.severity}: ${finding.message}`));
    if (findings.length > 50) lines.push(`- ...${findings.length - 50} additional findings omitted from report preview.`);
  } else {
    lines.push(...findings.map((finding) => `- ${finding.severity}: ${finding.message}`));
  }

  lines.push(
    "",
    "## Manual QA Checklist",
    "",
    "- Confirm every approved GPT Image2 base is original, generic, white-background math line art with no branding, watermark, Chinese text, exact numbers, formulas, answer text, or solution steps.",
    "- Confirm each overlaid final question image has correct point names, coordinates, side lengths, angles, tick marks, axes, and values from the source prompt only.",
    "- Confirm labels do not overlap, clip, or imply the final answer.",
    "- Randomly sample at least 5 rendered questions per core template family before changing any manifest item to `qaStatus=pass`.",
    ""
  );

  return `${lines.join("\n")}\n`;
}
