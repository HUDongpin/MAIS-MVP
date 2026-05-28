#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  fsCandidatePath,
  hktTimestamp,
  imageDefaults,
  parseArgs,
  publicCandidatePath,
  readManifest,
  relativeToRoot,
  writeJson,
  writeManifest
} from "./pipeline-lib.mjs";

const args = parseArgs();
const live = Boolean(args.live || process.env.OPENAI_IMAGE_GENERATION_LIVE === "1");
const dryRun = !live || Boolean(args["dry-run"]);
const candidateCount = Number(args["candidate-count"] ?? args.candidates ?? 3);
const limit = args.limit ? Number(args.limit) : null;
const onlyTemplate = args.template ? String(args.template) : null;
const retries = Number(args.retries ?? 2);

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function run() {
  if (!Number.isInteger(candidateCount) || candidateCount < 1 || candidateCount > imageDefaults.maxCandidatesPerTemplate) {
    throw new Error(`candidate-count must be between 1 and ${imageDefaults.maxCandidatesPerTemplate}`);
  }

  const manifest = readManifest();
  if (!manifest) throw new Error("manifest.json is missing. Run prepare-prompts.mjs first.");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!dryRun && !apiKey) {
    throw new Error("OPENAI_API_KEY is required for --live generation. No API call was made.");
  }

  const selected = manifest.templateFamilies
    .filter((template) => !onlyTemplate || template.templateFamilyId === onlyTemplate)
    .filter((template) => template.illustrationPhase === "core" || manifest.scope.includes("optional"));
  const targets = limit ? selected.slice(0, limit) : selected;
  if (onlyTemplate && targets.length === 0) throw new Error(`Template not found in manifest: ${onlyTemplate}`);

  const summary = {
    mode: dryRun ? "dry-run" : "live",
    requestedAtHkt: hktTimestamp(),
    candidateCount,
    templates: targets.map((template) => ({
      templateFamilyId: template.templateFamilyId,
      candidates: Array.from({ length: candidateCount }, (_, index) => ({
        index: index + 1,
        path: publicCandidatePath(template.templateFamilyId, index + 1)
      }))
    }))
  };

  if (dryRun) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  for (const template of targets) {
    template.baseCandidates = template.baseCandidates ?? [];
    for (let index = 1; index <= candidateCount; index += 1) {
      const candidatePath = fsCandidatePath(template.templateFamilyId, index);
      if (fs.existsSync(candidatePath)) {
        upsertCandidate(template, index, "already-exists", null);
        continue;
      }
      const result = await generateCandidate({
        apiKey,
        prompt: template.prompt,
        candidatePath,
        templateFamilyId: template.templateFamilyId,
        candidateIndex: index,
        retries
      });
      upsertCandidate(template, index, "generated", result);
      template.baseStatus = "candidate-generated";
      writeManifest(manifest);
    }
  }

  writeManifest(manifest);
  console.log(JSON.stringify({
    mode: "live",
    templatesProcessed: targets.length,
    manifest: "coordination/content-qa/mainland-pep-junior-gpt-image2-generation/manifest.json"
  }, null, 2));
}

async function generateCandidate({ apiKey, prompt, candidatePath, templateFamilyId, candidateIndex, retries }) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: imageDefaults.model,
          prompt,
          size: imageDefaults.size,
          quality: imageDefaults.quality,
          n: 1
        })
      });
      const requestId = response.headers.get("x-request-id");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error?.message ?? `HTTP ${response.status}`;
        throw new Error(message);
      }
      const b64 = payload?.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI response did not include data[0].b64_json");
      fs.mkdirSync(path.dirname(candidatePath), { recursive: true });
      fs.writeFileSync(candidatePath, Buffer.from(b64, "base64"));
      const sidecarPath = candidatePath.replace(/\.png$/, ".json");
      writeJson(sidecarPath, {
        generatedAtHkt: hktTimestamp(),
        templateFamilyId,
        candidateIndex,
        requestId,
        model: imageDefaults.model,
        size: imageDefaults.size,
        quality: imageDefaults.quality,
        promptHash: await sha256(prompt)
      });
      return { requestId, sidecar: relativeToRoot(sidecarPath), attempt };
    } catch (error) {
      lastError = error;
      if (attempt <= retries) await sleep(1000 * attempt);
    }
  }
  throw new Error(`Failed ${templateFamilyId} candidate ${candidateIndex}: ${lastError.message}`);
}

function upsertCandidate(template, index, status, result) {
  const publicPath = publicCandidatePath(template.templateFamilyId, index);
  const next = {
    index,
    path: publicPath,
    status,
    generatedAtHkt: hktTimestamp(),
    requestId: result?.requestId ?? null,
    sidecar: result?.sidecar ?? null
  };
  const existing = template.baseCandidates.findIndex((candidate) => candidate.index === index);
  if (existing === -1) template.baseCandidates.push(next);
  else template.baseCandidates[existing] = { ...template.baseCandidates[existing], ...next };
}

async function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
