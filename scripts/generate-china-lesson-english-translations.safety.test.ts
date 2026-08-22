import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const projectRoot = path.resolve(__dirname, "..");
const scriptPath = path.join(projectRoot, "scripts/generate-china-lesson-english-translations.ts");
const realMapPath = path.join(projectRoot, "data/chinaLessonEnglishTranslations.json");

const confirmedInvalidIds = [
  "t-05db3dd9a9870380",
  "t-0942a319a62dffd0",
  "t-0bdce822375d8bce",
  "t-0d63a0f87cab4413",
  "t-0e0ce74660913e7f",
  "t-10b797918dcc1486",
  "t-1a9b779bd2391aa3",
  "t-1bd3cd7ff3142778",
  "t-1bd998b77d91e357",
  "t-1dd6c122778ada85",
  "t-2667a0a9498b1cd3",
  "t-327a7bfc2b14e014",
  "t-3f0315403164005f",
  "t-3f80ffe7b41da5da",
  "t-42786f3f8a0def7c",
  "t-43faf0f7a6fc22e3",
  "t-4742f835e3fc0a22",
  "t-4744976125380a33",
  "t-49ba73df6520b578",
  "t-4bcdd2645cbcd465",
  "t-50d6fe074b298c20",
  "t-51220e0a020b615b",
  "t-67eaf2d49b285774",
  "t-0b012ee45ca9ba33",
  "t-135d9f4a135ea802",
  "t-150e32a426ef6b8a",
  "t-15a3b6fd06dfdb70",
  "t-17b631e313c23d6f",
  "t-199a577c3d23c7d2",
  "t-1d45f56bdc0f7ab7",
  "t-1db34907b40a0562",
  "t-20c69a26dc80e802",
  "t-24b1717718a15b6a",
  "t-27a7c9bb7b94c12e",
  "t-329b783ad05da733",
  "t-33f3cbb07d2598b1",
  "t-38b5dae6f0d2daea",
  "t-3b44ec293d91bb50",
  "t-3c2e0c9f992e9801",
  "t-3d1f8a86001a3b90",
  "t-452d38c9eb45ff1e",
  "t-50e62d7086047156",
  "t-5703822d390f2951",
  "t-5772c31157fb47c6",
  "t-580d99c871043966",
  "t-5a3e3a2733f6a9f6",
  "t-5dd39ba040fee369",
  "t-5e12f12dd42ce9aa",
  "t-604162c11cc2e6fc",
  "t-6213651e4dbac657",
  "t-64e636c65475a6aa",
  "t-66df1432fe5ea15e",
  "t-69558f531cfd08c6",
  "t-6f6f43bfb9bd9966",
  "t-0b43709454a2ff24",
  "t-0f7b5ab6ea22c7f6",
  "t-37a5a8cde919b45b",
  "t-3b8098c254a99507",
  "t-182c560ed4649de6",
  "t-444cb3ae598a6c99",
  "t-0e745ddd75a3b79c",
  "t-0f6b53e2615da799",
  "t-06b6de662cf7d3e6",
  "t-0c64482a95b53a2f",
  "t-0cf7e2840fbd5310",
  "t-5ec89900884fa83c",
  "t-24190bba5659f8b3",
  "t-5b37be68222af38c",
  "t-0f12ed9787790c98",
  "t-615afd76cb9b6328",
  "t-3a07ff6e12a44d1e",
  "t-08de3ffbf9e6cb16",
  "t-03d2c6c873ac33cb",
  "t-063628a0addc519d",
  "t-5371205a61c1f9c9",
  "t-4467f99985238ff9",
  "t-5aae6f26b3b7099f",
  "t-171f39157721e0f9",
  "t-60e7b95e9b8251cc",
  "t-0683c9e0fbf2baa8",
  "t-02dadd6743b565f1",
  "t-1f1d9fd3c8a905bf",
  "t-41a074a397b8bbb5",
  "t-3bd96a42e2993bc3",
  "t-504fbed3a4f0ec49",
  "t-2dc293809ad43ff7",
  "t-72f55f884ca46689",
  "t-52ac0feddaba4b97",
  "t-1aca6295d5b5b9cf",
  "t-22c223c90457e83b",
  "t-6b6af959c0d3816e",
  "t-567583f7734e56a6",
  "t-2887851a2eafcf69",
  "t-350627b45c0fdb44",
  "t-1622da1b3c3a4337",
  "t-33c842381884a3df",
  "t-5dcadc3a139a08a9",
  "t-61bc9c9d729697df",
  "t-37ac4c0e7213bbd8"
] as const;

type SurfaceCount = {
  referenceCount: number;
  uniqueSourceCount: number;
  mapBackedReferenceCount: number;
  fallbackReferenceCount: number;
};

type SurfaceLanguageAudit = {
  sourceFieldReferenceCount: number;
  uniqueSourceCount: number;
  strictCompleteTermToken: SurfaceCount;
  hardInvalidTermToken: SurfaceCount;
  broadDiagnostic: SurfaceCount;
  highConfidencePseudoEnglish: SurfaceCount;
  highConfidencePseudoEnglishWithoutTerm: SurfaceCount;
  blockingUnion: SurfaceCount;
  pseudoCategoryCounts: Record<string, SurfaceCount>;
  mutationEligibleReferenceCount: number;
};

type ValidationReport = {
  mode: string;
  missingCount: number;
  automatedValidationFailureCount: number;
  adjudicatedFalsePositiveCount: number;
  failureCount: number;
  confirmedInvalidCount: number;
  unadjudicatedFailureCount: number;
  failures: Array<{ id: string; adjudication: string }>;
  surfaceLanguageAudit: SurfaceLanguageAudit;
};

type RepairReport = {
  mode: string;
  applied: boolean;
  automatedValidationFailureCount: number;
  adjudicatedFalsePositiveCount: number;
  invalidCandidateCount: number;
  confirmedInvalidCandidateCount: number;
  unadjudicatedInvalidCandidateCount: number;
  staleCandidateCount: number;
  plannedInvalidRemovalCount: number;
  removedInvalidCount: number;
  removedStaleCount: number;
  surfaceLanguageAudit: SurfaceLanguageAudit;
};

function assertSurfaceCount(count: SurfaceCount) {
  assert.ok(Number.isInteger(count.referenceCount) && count.referenceCount >= 0);
  assert.ok(Number.isInteger(count.uniqueSourceCount) && count.uniqueSourceCount >= 0);
  assert.ok(Number.isInteger(count.mapBackedReferenceCount) && count.mapBackedReferenceCount >= 0);
  assert.ok(Number.isInteger(count.fallbackReferenceCount) && count.fallbackReferenceCount >= 0);
  assert.ok(count.uniqueSourceCount <= count.referenceCount);
  assert.equal(count.mapBackedReferenceCount + count.fallbackReferenceCount, count.referenceCount);
}

function assertSurfaceLanguageAuditInvariants(audit: SurfaceLanguageAudit) {
  // The current 97-row BNU High reviewed-override inventory includes Batch 3B's
  // eight family-coverage remediations. Pin the exact rendered reference and
  // unique-source totals so a later deduplication or localization drift cannot
  // silently shrink the validator's learner-visible scope.
  assert.equal(audit.sourceFieldReferenceCount, 9313);
  assert.equal(audit.uniqueSourceCount, 5490);
  [
    audit.strictCompleteTermToken,
    audit.hardInvalidTermToken,
    audit.broadDiagnostic,
    audit.highConfidencePseudoEnglish,
    audit.highConfidencePseudoEnglishWithoutTerm,
    audit.blockingUnion,
    ...Object.values(audit.pseudoCategoryCounts)
  ].forEach(assertSurfaceCount);
  assert.ok(audit.strictCompleteTermToken.referenceCount <= audit.hardInvalidTermToken.referenceCount);
  assert.ok(
    audit.highConfidencePseudoEnglishWithoutTerm.referenceCount
      <= audit.highConfidencePseudoEnglish.referenceCount
  );
  assert.ok(audit.blockingUnion.referenceCount >= audit.hardInvalidTermToken.referenceCount);
  assert.ok(audit.blockingUnion.referenceCount >= audit.highConfidencePseudoEnglish.referenceCount);
  assert.ok(
    audit.blockingUnion.referenceCount
      <= audit.hardInvalidTermToken.referenceCount + audit.highConfidencePseudoEnglish.referenceCount
  );
  assert.deepEqual(Object.keys(audit.pseudoCategoryCounts).sort(), [
    "pseudo-can-can",
    "pseudo-correct-of-is",
    "pseudo-in-requires",
    "pseudo-none-number-items",
    "pseudo-one-items",
    "pseudo-part-separately",
    "pseudo-same-equal",
    "pseudo-times-surface"
  ]);
  assert.equal(audit.mutationEligibleReferenceCount, 0);
}

function runGenerator(
  arguments_: string[],
  options: { preloaderPath?: string; env?: Record<string, string> } = {}
) {
  return spawnSync(process.execPath, [
    ...(options.preloaderPath ? ["--import", options.preloaderPath] : []),
    "--import",
    "tsx",
    scriptPath,
    ...arguments_
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, DEEPSEEK_API_KEY: "", ...options.env },
    maxBuffer: 20 * 1024 * 1024
  });
}

function translationId(source: string) {
  return `t-${createHash("sha256").update(source).digest("hex").slice(0, 16)}`;
}

function sourceForId(translations: Record<string, string>, id: string) {
  return Object.keys(translations).find((candidate) => translationId(candidate) === id);
}

test("provider prompt names the recurring fail-closed retry invariants", () => {
  const generatorSource = readFileSync(scriptPath, "utf8");
  [
    "When an Arabic digit 1 directly precedes a count noun",
    "Do not introduce capital A, B, C, or D as an English article",
    "Preserve every standalone Latin mathematical identifier",
    "Never add a ratio colon, explanatory step number, grade number, group number, or repeated unit number"
  ].forEach((instruction) => assert.match(generatorSource, new RegExp(instruction, "u")));
});

test("provider output cannot reintroduce an exact confirmed-invalid pair", () => {
  const generatorSource = readFileSync(scriptPath, "utf8");
  assert.match(
    generatorSource,
    /translationAdjudication\(source, restored\) === "confirmed-invalid"/u
  );
  assert.match(generatorSource, /refusing a confirmed-invalid translation pair/u);
});

test("frozen confirmed-invalid table remains the exact 99-id packet", () => {
  const generatorSource = readFileSync(scriptPath, "utf8");
  const confirmedBlock = generatorSource.match(
    /const confirmedInvalidPairs = new Map<string, string>\(\[([\s\S]*?)\]\);\s*function translationPairFingerprint/u
  );
  assert.ok(confirmedBlock, "Expected to locate the confirmedInvalidPairs table");
  const generatorIds = Array.from(
    confirmedBlock[1].matchAll(/\["(t-[0-9a-f]+)", "[0-9a-f]{64}"\]/gu),
    (match) => match[1]
  );
  assert.equal(generatorIds.length, 99);
  assert.equal(new Set(generatorIds).size, generatorIds.length, "Confirmed ids must be unique");
  assert.deepEqual(generatorIds.sort(), [...confirmedInvalidIds].sort());
  const falsePositiveBlock = generatorSource.match(
    /const adjudicatedFalsePositivePairs = new Map<string, string>\(\[([\s\S]*?)\]\);\s*\/\/ These retained pairs/u
  );
  assert.ok(falsePositiveBlock, "Expected to locate the adjudicatedFalsePositivePairs table");
  assert.match(falsePositiveBlock[1], /t-433f3684c551e989/u);
});

test("repair-map is report-only by default and unsafe flag combinations cannot mutate a map", () => {
  const invalidApply = runGenerator(["--dry-run", "--apply", "--limit=1"]);
  assert.notEqual(invalidApply.status, 0);
  assert.match(invalidApply.stderr, /--apply requires --repair-map/u);

  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "mais-translation-repair-"));
  const temporaryMap = path.join(temporaryDirectory, "translations.json");
  try {
    writeFileSync(temporaryMap, `${JSON.stringify({ "stale fixture": "untouched" }, null, 2)}\n`, "utf8");
    const before = readFileSync(temporaryMap, "utf8");

    for (const extraArguments of [[], ["--dry-run"]]) {
      const report = runGenerator(["--repair-map", `--map-file=${temporaryMap}`, ...extraArguments]);
      assert.equal(report.status, 0, report.stderr);
      const parsed = JSON.parse(report.stdout) as RepairReport;
      assert.equal(parsed.mode, "repair-map-plan");
      assert.equal(parsed.applied, false);
      assert.equal(parsed.staleCandidateCount, 1);
      assert.equal(parsed.plannedInvalidRemovalCount, 0);
      assert.equal(readFileSync(temporaryMap, "utf8"), before);
    }

    const guardedApply = runGenerator(["--repair-map", "--apply", `--map-file=${temporaryMap}`]);
    assert.notEqual(guardedApply.status, 0);
    assert.match(guardedApply.stderr, /inventory safeguard/u);
    assert.equal(readFileSync(temporaryMap, "utf8"), before);

    const staleApply = runGenerator(["--repair-map", "--apply", "--prune-stale", `--map-file=${temporaryMap}`]);
    assert.notEqual(staleApply.status, 0);
    assert.match(staleApply.stderr, /stale pruning is report-only/u);
    assert.equal(readFileSync(temporaryMap, "utf8"), before);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("translation transport disables thinking and consumes split SSE with keep-alives", () => {
  const realMapBefore = readFileSync(realMapPath, "utf8");
  const realTranslations = JSON.parse(realMapBefore) as Record<string, string>;
  const fixtureSource = "小乐有3盒彩笔，每盒有4支。他想用这些彩笔摆出几个同样的正方形，每个正方形用4支彩笔，可以摆几个正方形？";
  const fixtureTarget = "Xiaole has 3 boxes of colored pencils, each box has 4 pencils. He wants to use these pencils to form several identical squares, each square uses 4 pencils. How many squares can he form?";
  assert.equal(realTranslations[fixtureSource], fixtureTarget, "Expected the stable transport fixture translation");

  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "mais-translation-stream-"));
  const temporaryMap = path.join(temporaryDirectory, "translations.json");
  const preloaderPath = path.join(temporaryDirectory, "mock-deepseek.mjs");
  try {
    const fixtureMap = { ...realTranslations };
    delete fixtureMap[fixtureSource];
    writeFileSync(temporaryMap, `${JSON.stringify(fixtureMap, null, 2)}\n`, "utf8");
    writeFileSync(preloaderPath, `
let requestCount = 0;
globalThis.fetch = async (url, init) => {
  requestCount += 1;
  if (requestCount > 2) throw new Error("unexpected extra transport retry");
  if (String(url) !== "https://api.deepseek.com/chat/completions") throw new Error("unexpected endpoint");
  const headers = new Headers(init?.headers);
  if (headers.get("Accept") !== "text/event-stream") throw new Error("missing SSE Accept header");
  const request = JSON.parse(String(init?.body));
  if (request.model !== "deepseek-v4-pro") throw new Error("unexpected model");
  if (request.thinking?.type !== "disabled") throw new Error("thinking was not disabled");
  if ("reasoning_effort" in request) throw new Error("translation request must not set reasoning effort");
  if (request.stream !== true) throw new Error("stream was not enabled");
  if (request.temperature !== 0.05) throw new Error("translation temperature changed");
  if (request.response_format?.type !== "json_object") throw new Error("JSON response contract changed");
  const userPayload = JSON.parse(request.messages.at(-1).content);
  const protectedSource = userPayload.entries[0].sourceZhHans;
  const numbers = protectedSource.match(/ZXQNUM[A-Z]+QXZ/g);
  if (numbers?.length !== 3) throw new Error("unexpected protected-number fixture");
  const acceptedTranslation = "Xiaole has " + numbers[0] + " boxes of colored pencils, each box has " + numbers[1]
    + " pencils. He wants to use these pencils to form several identical squares, each square uses "
    + numbers[2] + " pencils. How many squares can he form?";
  const translated = requestCount === 1
    ? "Xiaole owns " + numbers[0] + " boxes with " + numbers[1] + " colored pencils in each box. Each square uses "
      + numbers[2] + " pencils. How many squares can he form?"
    : acceptedTranslation;
  const completion = JSON.stringify({ translations: [{ id: "item-1", en: translated }] });
  const midpoint = Math.floor(completion.length / 2);
  const eventText = [
    ": keep-alive\\r\\n\\r\\n",
    "data: " + JSON.stringify({ choices: [{ index: 0, delta: { content: completion.slice(0, midpoint) }, finish_reason: null }] }) + "\\r\\n\\r\\n",
    ": keep-alive\\r\\n\\r\\n",
    "data: " + JSON.stringify({ choices: [{ index: 0, delta: { content: completion.slice(midpoint) }, finish_reason: null }] }) + "\\r\\n\\r\\n",
    "data: " + JSON.stringify({ choices: [{ index: 0, delta: { content: "" }, finish_reason: requestCount === 1 ? "length" : "stop" }] }) + "\\r\\n\\r\\n",
    "data: [DONE]\\r\\n\\r\\n"
  ].join("");
  const encoded = new TextEncoder().encode(eventText);
  const splitPoints = [1, 9, 31, 73, 127, encoded.length - 3, encoded.length];
  let offset = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      const next = splitPoints.find((point) => point > offset) ?? encoded.length;
      controller.enqueue(encoded.slice(offset, next));
      offset = next;
      if (offset >= encoded.length) controller.close();
    }
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
};
`, "utf8");

    const fixtureId = translationId(fixtureSource);
    const inspection = runGenerator([`--inspect-entry=${fixtureId}`, `--map-file=${temporaryMap}`]);
    assert.equal(inspection.status, 0, inspection.stderr);
    assert.equal((JSON.parse(inspection.stdout) as { source?: string }).source, fixtureSource);

    const result = runGenerator(
      ["--stream", "--limit=1", "--concurrency=1", "--batch-size=1", `--map-file=${temporaryMap}`],
      {
        preloaderPath,
        env: {
          DEEPSEEK_API_KEY: "test-redacted-key",
          DEEPSEEK_API_URL: "https://api.deepseek.com/chat/completions",
          DEEPSEEK_MODEL: "deepseek-v4-pro"
        }
      }
    );
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    assert.equal(result.stderr, "");
    const outputLines = result.stdout.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
    assert.ok(outputLines.some((line) => line.thinking === "disabled" && line.transport === "sse"));
    assert.equal((JSON.parse(readFileSync(temporaryMap, "utf8")) as Record<string, string>)[fixtureSource], fixtureTarget);
    assert.equal(readFileSync(realMapPath, "utf8"), realMapBefore, "Transport test must not mutate the production map");
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("existing-map repair is exact-pair scoped and idempotent before or after confirmed-pair removal", () => {
  const realMapBefore = readFileSync(realMapPath, "utf8");
  const realTranslations = JSON.parse(realMapBefore) as Record<string, string>;
  const confirmedInvalidIdSet = new Set<string>(confirmedInvalidIds);

  const validation = runGenerator(["--validate-existing"]);
  assert.equal(validation.stderr, "");
  const validationReport = JSON.parse(validation.stdout) as ValidationReport;
  assert.equal(validationReport.mode, "validate-existing");
  assert.equal(validationReport.failureCount, validationReport.failures.length);
  assert.equal(
    validationReport.confirmedInvalidCount,
    validationReport.failures.filter((entry) => entry.adjudication === "confirmed-invalid").length
  );
  assert.equal(
    validationReport.unadjudicatedFailureCount,
    validationReport.failures.filter((entry) => entry.adjudication === "unadjudicated").length
  );
  assert.equal(
    validationReport.failureCount,
    validationReport.confirmedInvalidCount + validationReport.unadjudicatedFailureCount
  );
  assert.ok(validationReport.confirmedInvalidCount <= confirmedInvalidIds.length);
  validationReport.failures
    .filter((entry) => entry.adjudication === "confirmed-invalid")
    .forEach((entry) => assert.ok(confirmedInvalidIdSet.has(entry.id), `Unexpected confirmed id ${entry.id}`));
  assert.ok(validationReport.automatedValidationFailureCount >= validationReport.adjudicatedFalsePositiveCount);
  assertSurfaceLanguageAuditInvariants(validationReport.surfaceLanguageAudit);
  const expectedValidationStatus = (
    validationReport.missingCount > 0
      || validationReport.failureCount > 0
      || validationReport.surfaceLanguageAudit.blockingUnion.referenceCount > 0
  ) ? 1 : 0;
  assert.equal(validation.status, expectedValidationStatus);
  assert.equal(readFileSync(realMapPath, "utf8"), realMapBefore, "Validation must be report-only");

  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "mais-translation-adjudication-"));
  const temporaryMap = path.join(temporaryDirectory, "translations.json");
  const knownFalsePositiveId = "t-039c901186b653d2";
  const knownFalsePositiveSource = sourceForId(realTranslations, knownFalsePositiveId);
  const currentConfirmedFailures = validationReport.failures
    .filter((entry) => entry.adjudication === "confirmed-invalid");
  const currentConfirmedInvalidId = currentConfirmedFailures[0]?.id;
  const currentConfirmedInvalidSource = currentConfirmedInvalidId
    ? sourceForId(realTranslations, currentConfirmedInvalidId)
    : undefined;
  try {
    const baselineFailureIds = new Set(validationReport.failures.map((entry) => entry.id));
    const changedPairMap = { ...realTranslations };
    const changedIds: string[] = [];
    let changedCleanPairCount = 0;
    let changedConfirmedPairCount = 0;
    if (knownFalsePositiveSource && !baselineFailureIds.has(knownFalsePositiveId)) {
      changedPairMap[knownFalsePositiveSource] = `${realTranslations[knownFalsePositiveSource]} 999`;
      changedIds.push(knownFalsePositiveId);
      changedCleanPairCount += 1;
    }
    if (currentConfirmedInvalidId && currentConfirmedInvalidSource) {
      changedPairMap[currentConfirmedInvalidSource] = `${realTranslations[currentConfirmedInvalidSource]} 999`;
      changedIds.push(currentConfirmedInvalidId);
      changedConfirmedPairCount += 1;
    }
    if (changedIds.length) {
      writeFileSync(temporaryMap, `${JSON.stringify(changedPairMap, null, 2)}\n`, "utf8");
      const changedValidation = runGenerator(["--validate-existing", `--map-file=${temporaryMap}`]);
      assert.notEqual(changedValidation.status, 0);
      const changedReport = JSON.parse(changedValidation.stdout) as ValidationReport;
      assert.equal(
        changedReport.confirmedInvalidCount,
        validationReport.confirmedInvalidCount - changedConfirmedPairCount
      );
      assert.equal(
        changedReport.unadjudicatedFailureCount,
        validationReport.unadjudicatedFailureCount + changedIds.length
      );
      assert.equal(changedReport.failureCount, validationReport.failureCount + changedCleanPairCount);
      const changedUnadjudicatedIds = new Set(
        changedReport.failures
          .filter((entry) => entry.adjudication === "unadjudicated")
          .map((entry) => entry.id)
      );
      changedIds.forEach((id) => assert.ok(changedUnadjudicatedIds.has(id), `${id} must be revalidated`));

      const changedRepair = runGenerator(["--repair-map", "--apply", `--map-file=${temporaryMap}`]);
      assert.equal(changedRepair.status, 0, changedRepair.stderr);
      const changedRepairReport = JSON.parse(changedRepair.stdout) as RepairReport;
      assert.equal(
        changedRepairReport.confirmedInvalidCandidateCount,
        validationReport.confirmedInvalidCount - changedConfirmedPairCount
      );
      assert.equal(
        changedRepairReport.unadjudicatedInvalidCandidateCount,
        validationReport.unadjudicatedFailureCount + changedIds.length
      );
      assert.equal(
        changedRepairReport.removedInvalidCount,
        validationReport.confirmedInvalidCount - changedConfirmedPairCount
      );
      const changedRepairedTranslations = JSON.parse(readFileSync(temporaryMap, "utf8")) as Record<string, string>;
      if (knownFalsePositiveSource) {
        assert.equal(changedRepairedTranslations[knownFalsePositiveSource], changedPairMap[knownFalsePositiveSource]);
      }
      if (currentConfirmedInvalidSource) {
        assert.equal(
          changedRepairedTranslations[currentConfirmedInvalidSource],
          changedPairMap[currentConfirmedInvalidSource]
        );
      }
    }

    writeFileSync(temporaryMap, realMapBefore, "utf8");
    const repair = runGenerator(["--repair-map", "--apply", `--map-file=${temporaryMap}`]);
    assert.equal(repair.status, 0, repair.stderr);
    const repairReport = JSON.parse(repair.stdout) as RepairReport;
    assert.equal(repairReport.mode, "repair-map-plan");
    assert.equal(repairReport.applied, true);
    assert.equal(repairReport.automatedValidationFailureCount, validationReport.automatedValidationFailureCount);
    assert.equal(repairReport.adjudicatedFalsePositiveCount, validationReport.adjudicatedFalsePositiveCount);
    assert.equal(repairReport.invalidCandidateCount, validationReport.failureCount);
    assert.equal(repairReport.confirmedInvalidCandidateCount, validationReport.confirmedInvalidCount);
    assert.equal(repairReport.unadjudicatedInvalidCandidateCount, validationReport.unadjudicatedFailureCount);
    assert.equal(repairReport.plannedInvalidRemovalCount, validationReport.confirmedInvalidCount);
    assert.equal(repairReport.removedInvalidCount, validationReport.confirmedInvalidCount);
    assert.equal(repairReport.removedStaleCount, 0);
    assertSurfaceLanguageAuditInvariants(repairReport.surfaceLanguageAudit);

    const repairedTranslations = JSON.parse(readFileSync(temporaryMap, "utf8")) as Record<string, string>;
    assert.equal(
      Object.keys(repairedTranslations).length,
      Object.keys(realTranslations).length - validationReport.confirmedInvalidCount
    );
    currentConfirmedFailures.forEach(({ id }) => {
      const source = sourceForId(realTranslations, id);
      assert.ok(source, `Expected source for current confirmed id ${id}`);
      assert.equal(repairedTranslations[source], undefined, `${id} should be removed`);
    });
    if (knownFalsePositiveSource) {
      assert.equal(repairedTranslations[knownFalsePositiveSource], realTranslations[knownFalsePositiveSource]);
    }

    const afterFirstApply = readFileSync(temporaryMap, "utf8");
    const secondRepair = runGenerator(["--repair-map", "--apply", `--map-file=${temporaryMap}`]);
    assert.equal(secondRepair.status, 0, secondRepair.stderr);
    const secondRepairReport = JSON.parse(secondRepair.stdout) as RepairReport;
    assert.equal(secondRepairReport.applied, true);
    assert.equal(secondRepairReport.confirmedInvalidCandidateCount, 0);
    assert.equal(secondRepairReport.unadjudicatedInvalidCandidateCount, validationReport.unadjudicatedFailureCount);
    assert.equal(secondRepairReport.plannedInvalidRemovalCount, 0);
    assert.equal(secondRepairReport.removedInvalidCount, 0);
    assert.equal(readFileSync(temporaryMap, "utf8"), afterFirstApply, "A second apply must be byte-idempotent");
    assert.equal(readFileSync(realMapPath, "utf8"), realMapBefore, "The production map must remain report-only in this test");
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
