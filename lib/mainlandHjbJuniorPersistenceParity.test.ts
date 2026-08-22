import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { mainlandHjbJuniorQuestions } from "@/data/mainlandHjbJuniorQuestions";

type StoredQuestion = {
  id: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
  [key: string]: unknown;
};

type ContentProjection = Pick<
  StoredQuestion,
  "promptZhHans" | "optionsZhHans" | "answer" | "explanationZhHans"
>;

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "..");
const packageDirectory = path.join(
  repositoryRoot,
  "coordination/content-qa/mainland-hjb-junior-generated-bank-v2-1500"
);
const dataPackPath = path.join(
  repositoryRoot,
  "data/generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json"
);
const correctionManifestPath = path.join(packageDirectory, "curated-corrections.json");
const correctionModulePath = path.join(packageDirectory, "curated-corrections.mjs");

const correctedIds = [
  "hjb-junior-ds-v2-s1-012",
  "hjb-junior-ds-v2-s1-096",
  "hjb-junior-ds-v2-s1-342",
  "hjb-junior-ds-v2-s1-367",
  "hjb-junior-ds-v2-s2-129",
  "hjb-junior-ds-v2-s2-180",
  "hjb-junior-ds-v2-s2-186",
  "hjb-junior-ds-v2-s2-198",
  "hjb-junior-ds-v2-s2-240",
  "hjb-junior-ds-v2-s2-401",
  "hjb-junior-ds-v2-s3-028",
  "hjb-junior-ds-v2-s3-062",
  "hjb-junior-ds-v2-s3-177",
  "hjb-junior-ds-v2-s3-192",
  "hjb-junior-ds-v2-s3-198",
  "hjb-junior-ds-v2-s3-201",
  "hjb-junior-ds-v2-s3-235",
  "hjb-junior-ds-v2-s3-321",
  "hjb-junior-ds-v2-s3-363",
  "hjb-junior-ds-v2-s3-367",
  "hjb-junior-ds-v2-s3-387",
  "hjb-junior-ds-v2-s3-447"
] as const;

function parsePack(filePath: string) {
  return (JSON.parse(fs.readFileSync(filePath, "utf8")) as { questions: StoredQuestion[] }).questions;
}

function parseJsonl(filePath: string) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line) as StoredQuestion);
}

function byId(rows: StoredQuestion[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function storedProjection(row: StoredQuestion): ContentProjection {
  return {
    promptZhHans: row.promptZhHans,
    optionsZhHans: row.optionsZhHans,
    answer: row.answer,
    explanationZhHans: row.explanationZhHans
  };
}

function runtimeProjection(id: string): ContentProjection {
  const row = mainlandHjbJuniorQuestions.find((question) => question.id === id);
  assert.ok(row, `missing runtime HJB Junior row ${id}`);
  return {
    promptZhHans: row.prompt.zhHans ?? row.prompt.zh,
    optionsZhHans: row.options?.map((option) => option.zhHans ?? option.zh) ?? [],
    answer: row.answer,
    explanationZhHans: row.explanation.zhHans ?? row.explanation.zh
  };
}

function batchQuestions() {
  const batchDirectory = path.join(packageDirectory, "batches");
  return fs.readdirSync(batchDirectory)
    .filter((name) => /^batch-\d{3}\.json$/u.test(name))
    .sort()
    .flatMap((name) => parsePack(path.join(batchDirectory, name)));
}

const jsonlQuestions = parseJsonl(path.join(packageDirectory, "questions.jsonl"));
const coordinationPackQuestions = parsePack(path.join(packageDirectory, "question-pack.json"));
const dataPackQuestions = parsePack(dataPackPath);
const cachedBatchQuestions = batchQuestions();

test("all 22 reviewed runtime corrections are persisted in JSONL, both packs, and batch regeneration cache", () => {
  const stores = {
    jsonl: byId(jsonlQuestions),
    coordinationPack: byId(coordinationPackQuestions),
    dataPack: byId(dataPackQuestions),
    batchCache: byId(cachedBatchQuestions)
  };
  const mismatches: string[] = [];

  correctedIds.forEach((id) => {
    const expected = runtimeProjection(id);
    Object.entries(stores).forEach(([storeName, store]) => {
      const stored = store.get(id);
      if (!stored) {
        mismatches.push(`${id}:${storeName}:missing`);
        return;
      }
      try {
        assert.deepEqual(storedProjection(stored), expected);
      } catch {
        mismatches.push(`${id}:${storeName}`);
      }
    });
  });

  assert.deepEqual(mismatches, []);
});

test("the regeneration correction manifest covers exactly the 22 reviewed rows", async () => {
  assert.equal(fs.existsSync(correctionManifestPath), true, "missing curated-corrections.json");
  assert.equal(fs.existsSync(correctionModulePath), true, "missing curated-corrections.mjs");
  const corrections = JSON.parse(fs.readFileSync(correctionManifestPath, "utf8")) as Record<
    string,
    StoredQuestion
  >;
  assert.deepEqual(Object.keys(corrections).sort(), [...correctedIds].sort());

  const correctionModuleUrl = pathToFileURL(correctionModulePath).href;
  const correctionModule = await import(correctionModuleUrl) as {
    applyHjbJuniorCuratedCorrection: (id: string, row: StoredQuestion) => StoredQuestion;
  };
  const staleById = byId(jsonlQuestions);
  const contentFields = [
    "acceptedAnswers",
    "answer",
    "explanationZhHans",
    "optionsZhHans",
    "promptZhHans"
  ];
  const persistentStores = [
    byId(jsonlQuestions),
    byId(coordinationPackQuestions),
    byId(dataPackQuestions),
    byId(cachedBatchQuestions)
  ];
  correctedIds.forEach((id) => {
    const stale = staleById.get(id);
    assert.ok(stale, `missing stale source row ${id}`);
    assert.deepEqual(Object.keys(corrections[id]).sort(), contentFields);
    const regenerated = correctionModule.applyHjbJuniorCuratedCorrection(id, stale);
    assert.deepEqual(storedProjection(regenerated), runtimeProjection(id));
    assert.deepEqual(regenerated.acceptedAnswers, corrections[id].acceptedAnswers);
    const staleMetadata = Object.fromEntries(
      Object.entries(stale).filter(([key]) => !contentFields.includes(key))
    );
    const regeneratedMetadata = Object.fromEntries(
      Object.entries(regenerated).filter(([key]) => !contentFields.includes(key))
    );
    assert.deepEqual(regeneratedMetadata, staleMetadata, `${id} metadata must remain untouched`);
    persistentStores.forEach((store) => {
      assert.deepEqual(store.get(id)?.acceptedAnswers, corrections[id].acceptedAnswers, id);
    });
  });
});

test("the 22 reviewed JSONL rows remain exactly reproducible from their batch cache", () => {
  assert.equal(jsonlQuestions.length, 1_500);
  assert.equal(cachedBatchQuestions.length, 1_500);
  const jsonlById = byId(jsonlQuestions);
  const batchById = byId(cachedBatchQuestions);
  correctedIds.forEach((id) => {
    const raw = jsonlById.get(id);
    const cached = batchById.get(id);
    assert.ok(raw, `missing JSONL row ${id}`);
    assert.ok(cached, `missing batch row ${id}`);
    assert.deepEqual(storedProjection(cached), storedProjection(raw), id);
    assert.deepEqual(cached.acceptedAnswers, raw.acceptedAnswers, `${id} aliases`);
  });
});

test("both 1,500-row packs retain the 22 reviewed JSONL content rows", () => {
  const jsonlById = byId(jsonlQuestions);
  [coordinationPackQuestions, dataPackQuestions].forEach((packQuestions) => {
    assert.equal(packQuestions.length, 1_500);
    const packById = byId(packQuestions);
    correctedIds.forEach((id) => {
      const raw = jsonlById.get(id);
      const packed = packById.get(id);
      assert.ok(raw, `missing JSONL row ${id}`);
      assert.ok(packed, `missing packed row ${id}`);
      assert.deepEqual(storedProjection(packed), storedProjection(raw));
      assert.deepEqual(packed.acceptedAnswers, raw.acceptedAnswers);
    });
  });
});
