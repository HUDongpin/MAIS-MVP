#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  fsBasePath,
  fsCandidatePath,
  parseArgs,
  publicBasePath,
  publicCandidatePath,
  readManifest,
  relativeToRoot,
  writeManifest
} from "./pipeline-lib.mjs";

const args = parseArgs();
const templateId = args.template ? String(args.template) : null;
const candidate = args.candidate ? Number(args.candidate) : null;
const autoFirstExisting = Boolean(args["auto-first-existing"]);

run();

function run() {
  const manifest = readManifest();
  if (!manifest) throw new Error("manifest.json is missing. Run prepare-prompts.mjs first.");

  if (!autoFirstExisting && (!templateId || !candidate)) {
    throw new Error("Use --template=<templateFamilyId> --candidate=<1-3>, or --auto-first-existing.");
  }

  const targets = templateId
    ? manifest.templateFamilies.filter((template) => template.templateFamilyId === templateId)
    : manifest.templateFamilies;

  if (templateId && targets.length === 0) throw new Error(`Template not found: ${templateId}`);

  const selected = [];
  for (const template of targets) {
    const candidateIndex = autoFirstExisting ? firstExistingCandidate(template.templateFamilyId) : candidate;
    if (!candidateIndex) continue;
    const source = fsCandidatePath(template.templateFamilyId, candidateIndex);
    if (!fs.existsSync(source)) {
      throw new Error(`Candidate image is missing: ${relativeToRoot(source)}`);
    }
    const dest = fsBasePath(template.templateFamilyId);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest);
    template.selectedCandidatePath = publicCandidatePath(template.templateFamilyId, candidateIndex);
    template.approvedBasePath = publicBasePath(template.templateFamilyId);
    template.baseStatus = "approved";
    selected.push({
      templateFamilyId: template.templateFamilyId,
      candidateIndex,
      approvedBasePath: template.approvedBasePath
    });
  }

  writeManifest(manifest);
  console.log(JSON.stringify({
    selectedCount: selected.length,
    selected
  }, null, 2));
}

function firstExistingCandidate(templateFamilyId) {
  for (let index = 1; index <= 3; index += 1) {
    if (fs.existsSync(fsCandidatePath(templateFamilyId, index))) return index;
  }
  return null;
}

