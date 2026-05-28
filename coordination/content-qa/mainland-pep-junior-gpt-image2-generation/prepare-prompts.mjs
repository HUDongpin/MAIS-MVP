#!/usr/bin/env node

import fs from "node:fs";
import {
  assetRootPublic,
  buildImagePrompt,
  buildOverlaySpec,
  ensurePipelineDirs,
  hktTimestamp,
  imageDefaults,
  manifestPath,
  promptsCsvPath,
  promptsJsonPath,
  publicBasePath,
  publicQuestionPath,
  readQuestions,
  readTemplateFamilies,
  relativeToRoot,
  selectedQuestions,
  selectedTemplateFamilies,
  sourceQuestionCsvPath,
  sourceTemplateCsvPath,
  splitQuestionIds,
  toCsv,
  validateSourceInputs,
  writeJson,
  writeManifest,
  parseArgs
} from "./pipeline-lib.mjs";

const args = parseArgs();
const includeOptional = Boolean(args["include-optional"]);

run();

function run() {
  ensurePipelineDirs();
  const templates = readTemplateFamilies();
  const questions = readQuestions();
  const validation = validateSourceInputs(templates, questions);
  if (!validation.passed) {
    throw new Error(`Source validation failed: ${JSON.stringify(validation.checks.filter((check) => !check.pass), null, 2)}`);
  }

  const selectedTemplates = selectedTemplateFamilies(templates, { includeOptional });
  const selectedQuestionRows = selectedQuestions(questions, { includeOptional });
  const templatesById = new Map(selectedTemplates.map((template) => [template.templateFamilyId, template]));
  const promptRows = selectedTemplates.map((template) => {
    const prompt = buildImagePrompt(template);
    return {
      templateFamilyId: template.templateFamilyId,
      illustrationPhase: template.illustrationPhase,
      gptImage2Batch: template.gptImage2Batch,
      suggestedImageKind: template.suggestedImageKind,
      questionCount: template.questionCount,
      representativeQuestionId: template.representativeQuestionId,
      approvedBasePath: publicBasePath(template.templateFamilyId),
      candidateCountPlanned: imageDefaults.maxCandidatesPerTemplate,
      model: imageDefaults.model,
      size: imageDefaults.size,
      quality: imageDefaults.quality,
      prompt
    };
  });

  const manifest = {
    schemaVersion: 1,
    generatedAtHkt: hktTimestamp(),
    updatedAtHkt: hktTimestamp(),
    workflow: "mainland-pep-junior-gpt-image2-question-illustrations",
    scope: includeOptional ? "core-plus-optional-statistics-probability" : "core-691-only",
    source: {
      templateFamiliesCsv: relativeToRoot(sourceTemplateCsvPath),
      questionsCsv: relativeToRoot(sourceQuestionCsvPath),
      appQuestionDataModified: false
    },
    openAiDocsNotes: [
      "gpt-image-2 supports text/image input and image output.",
      "Approved base image generation uses the Image API generations endpoint.",
      "gpt-image-2 does not currently support transparent background requests, so prompts request white opaque backgrounds."
    ],
    imageDefaults,
    assetRootPublic,
    validation,
    productionOrder: [
      "batch-1-core-plane-geometry",
      "batch-1-core-coordinate-function",
      "batch-1-core-number-line",
      "batch-2-optional-statistics-probability"
    ],
    templateFamilies: promptRows.map((promptRow) => {
      const template = templatesById.get(promptRow.templateFamilyId);
      return {
        templateFamilyId: promptRow.templateFamilyId,
        illustrationCategory: template.illustrationCategory,
        illustrationPhase: template.illustrationPhase,
        gptImage2Batch: template.gptImage2Batch,
        topicId: template.topicId,
        unitTitle: template.unitTitle,
        questionType: template.questionType,
        questionCount: Number(template.questionCount),
        representativeQuestionId: template.representativeQuestionId,
        representativePromptZhHans: template.representativePromptZhHans,
        suggestedImageKind: template.suggestedImageKind,
        exactMathLabelsNeeded: template.exactMathLabelsNeeded,
        prompt: promptRow.prompt,
        approvedBasePath: promptRow.approvedBasePath,
        baseStatus: "prompt-ready",
        baseCandidates: [],
        selectedCandidatePath: null,
        questionIds: splitQuestionIds(template.questionIds)
      };
    }),
    questions: Object.fromEntries(
      selectedQuestionRows.map((question) => {
        const template = templatesById.get(question.templateFamilyId);
        return [
          question.questionId,
          {
            questionId: question.questionId,
            templateFamilyId: question.templateFamilyId,
            imageSrc: publicQuestionPath(question.questionId),
            overlaySpec: buildOverlaySpec(question, template),
            qaStatus: "planned",
            blocker: "awaiting approved GPT Image2 base image and deterministic overlay render"
          }
        ];
      })
    )
  };

  writeJson(promptsJsonPath, {
    generatedAtHkt: manifest.generatedAtHkt,
    scope: manifest.scope,
    imageDefaults,
    prompts: promptRows
  });
  fs.writeFileSync(promptsCsvPath, toCsv(promptRows), "utf8");
  writeManifest(manifest);

  console.log(JSON.stringify({
    promptsJson: relativeToRoot(promptsJsonPath),
    promptsCsv: relativeToRoot(promptsCsvPath),
    manifest: relativeToRoot(manifestPath),
    scope: manifest.scope,
    templateFamilies: manifest.templateFamilies.length,
    questions: Object.keys(manifest.questions).length,
    validation: validation.counts
  }, null, 2));
}

