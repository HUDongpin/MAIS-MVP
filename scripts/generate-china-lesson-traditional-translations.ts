import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { productionLessonSeeds, type ProductionLessonSeed } from "@/data/lessons";
import { questions } from "@/data/questions";
import { topics } from "@/data/topics";
import { chinaLessonTraditionalTranslationKey } from "@/data/chinaLessonTraditionalTranslations";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import type { LocalizedText, Question, Topic } from "@/types";

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "data/chinaLessonTraditionalTranslations.json");
const temporaryOutputPath = `${outputPath}.tmp`;
const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set(["fill-in", "short-answer", "graph"]);
const targetPublishers = new Set(["MAINLAND_PEP", "MAINLAND_BNU", "MAINLAND_HJB"]);
const cjkPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;
const cjkGlobalPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/gu;
const knownLossyConversionPattern = /(?:覆習|復習|坐標|坐標係|聯係|控製|复蓋|復蓋|覆盖|复習|复盖|復數|覆數|復合|覆合|復製|重復|重覆|反復|復雜|答復|覆核|始终|定义|给定|给出|共轭|约束|仅|虚部|虽然|這种|递增|递減|递减|递推|逻辑|韦恩|合並|棱|锥|竖|實际|依赖|足够|係統|观測|观察|影响|轴|椭|栏|墙|邻|讨|种|遗漏|它们|阈值|若幹|幂)/u;
const hongKongTerminologyReplacements = [
  ["始终", "始終"],
  ["定义", "定義"],
  ["给定", "給定"],
  ["给出", "給出"],
  ["共轭", "共軛"],
  ["约束", "約束"],
  ["虚部", "虛部"],
  ["虽然", "雖然"],
  ["递增", "遞增"],
  ["递減", "遞減"],
  ["递减", "遞減"],
  ["递推", "遞推"],
  ["逻辑", "邏輯"],
  ["韦恩", "韋恩"],
  ["合並", "合併"],
  ["聯係", "聯繫"],
  ["控製", "控制"],
  ["限製", "限制"],
  ["覆合", "複合"],
  ["覆數", "複數"],
  ["反復", "反覆"],
  ["答復", "答覆"],
  ["復合", "複合"],
  ["復數", "複數"],
  ["復習", "複習"],
  ["復製", "複製"],
  ["復雜", "複雜"],
  ["重復", "重複"],
  ["重覆", "重複"],
  ["覆核", "複核"],
  ["覆盖", "覆蓋"],
  ["坐標", "座標"],
  ["圖象", "圖像"],
  ["書簽", "書籤"],
  ["釐米", "厘米"],
  ["這种", "這種"],
  ["棱", "稜"],
  ["锥", "錐"],
  ["竖", "豎"],
  ["實际", "實際"],
  ["依赖", "依賴"],
  ["足够", "足夠"],
  ["係統", "系統"],
  ["观測", "觀測"],
  ["影响", "影響"],
  ["轴", "軸"],
  ["椭", "橢"],
  ["栏", "欄"],
  ["墙", "牆"],
  ["邻", "鄰"],
  ["讨", "討"],
  ["种", "種"],
  ["遗漏", "遺漏"],
  ["它们", "它們"],
  ["观察", "觀察"],
  ["阈值", "閾值"],
  ["若幹", "若干"],
  ["仅", "僅"],
  ["幂", "冪"]
] as const;

const swiftProgram = String.raw`
import Foundation

let input = FileHandle.standardInput.readDataToEndOfFile()
let object = try JSONSerialization.jsonObject(with: input)
guard let sources = object as? [String] else {
  FileHandle.standardError.write(Data("Expected a JSON string array".utf8))
  exit(2)
}
let transform = StringTransform("Hans-Hant")
let translated = sources.map { source in
  source.applyingTransform(transform, reverse: false) ?? source
}
let output = try JSONSerialization.data(withJSONObject: translated)
FileHandle.standardOutput.write(output)
`;

function argumentValue(name: string) {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

const dryRun = process.argv.includes("--dry-run");
const refresh = process.argv.includes("--refresh");
const requestedLimit = Number.parseInt(argumentValue("--limit") ?? "0", 10);
const batchSize = Number.parseInt(argumentValue("--batch-size") ?? "500", 10);

function targetTopic(topic: Topic | undefined) {
  return Boolean(topic?.publisher && targetPublishers.has(topic.publisher));
}

function practiceQuestionCandidates(seed: ProductionLessonSeed) {
  const byTopic = questions.filter((question) => question.topicId === seed.topicId);
  if (!seed.practiceQuestionIds?.length) return byTopic;
  const byId = new Map(questions.map((question) => [question.id, question]));
  return seed.practiceQuestionIds.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question));
}

function displayedPracticeQuestions(seed: ProductionLessonSeed) {
  const candidates = practiceQuestionCandidates(seed);
  const deduped = dedupePracticeQuestions(candidates) as Question[];
  if (deduped.length <= lessonPracticeQuestionLimit) return deduped;
  const selected = deduped.slice(0, lessonPracticeQuestionLimit);
  if (selected.some((question) => handwritingCapableQuestionTypes.has(question.type))) return selected;
  const handwritingQuestion = deduped.find((question) => handwritingCapableQuestionTypes.has(question.type));
  return handwritingQuestion
    ? [...selected.slice(0, lessonPracticeQuestionLimit - 1), handwritingQuestion]
    : selected;
}

function collectSources(existing: Record<string, string>) {
  const collected = new Set<string>();

  function add(value: LocalizedText | undefined) {
    const sourceValue = value?.zhHans?.trim() || value?.zh.trim() || "";
    const source = sourceValue ? chinaLessonTraditionalTranslationKey(sourceValue) : "";
    if (source && cjkPattern.test(source) && !existing[source]?.trim()) collected.add(source);
  }

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  productionLessonSeeds.forEach((seed) => {
    const topic = topicById.get(seed.topicId);
    if (!targetTopic(topic)) return;
    add(topic?.title);
    add(topic?.description);
    add(seed.title);
    add(seed.description);
    seed.blocks.forEach((block) => {
      add(block.title);
      add(block.content);
      block.items?.forEach(add);
    });
    displayedPracticeQuestions(seed).forEach((question) => {
      add(question.topic);
      add(question.prompt);
      question.options?.forEach(add);
      if (question.type !== "multiple-choice") {
        add({ en: question.answer, zh: question.answer, zhHans: question.answer });
      }
      add(question.explanation);
      question.questionAssets?.forEach((asset) => {
        add(asset.alt);
        add(asset.caption);
      });
    });
  });

  return Array.from(collected).sort((left, right) => left.localeCompare(right, "zh-Hans"));
}

function nonHanSkeleton(value: string) {
  return value.replace(cjkGlobalPattern, "");
}

function validateTranslation(source: string, translatedValue: string) {
  const translated = translatedValue.trim();
  if (!translated) throw new Error("Traditional Chinese conversion produced empty text");
  if (nonHanSkeleton(source) !== nonHanSkeleton(translated)) {
    throw new Error("Traditional Chinese conversion changed non-Han characters, numbers, punctuation, or math markup");
  }
  if (knownLossyConversionPattern.test(translated)) {
    throw new Error(`Traditional Chinese conversion produced a known lossy form: ${translated.match(knownLossyConversionPattern)?.[0]}`);
  }
  return translated;
}

function refineForHongKongTraditional(value: string) {
  return hongKongTerminologyReplacements.reduce(
    (current, [source, replacement]) => current.split(source).join(replacement),
    value
  );
}

function convertBatch(sources: string[]) {
  const output = execFileSync("swift", ["-e", swiftProgram], {
    cwd: projectRoot,
    encoding: "utf8",
    input: JSON.stringify(sources),
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000
  });
  const translated = JSON.parse(output) as unknown;
  if (!Array.isArray(translated) || translated.length !== sources.length || translated.some((value) => typeof value !== "string")) {
    throw new Error("Swift Hans-Hant conversion returned an invalid result array");
  }
  return (translated as string[]).map(refineForHongKongTraditional);
}

function writeTranslations(translations: Record<string, string>) {
  const sorted = Object.fromEntries(Object.entries(translations).sort((left, right) => left[0].localeCompare(right[0], "zh-Hans")));
  writeFileSync(temporaryOutputPath, `${JSON.stringify(sorted, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  renameSync(temporaryOutputPath, outputPath);
}

function main() {
  if (!existsSync(outputPath)) throw new Error("Traditional Chinese translation map is missing");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 2000) throw new Error("--batch-size must be 1-2000");
  const stored = JSON.parse(readFileSync(outputPath, "utf8")) as Record<string, string>;
  const existing = refresh ? {} : stored;
  const allPending = collectSources(existing);
  const pending = requestedLimit > 0 ? allPending.slice(0, requestedLimit) : allPending;
  process.stdout.write(`${JSON.stringify({
    mode: dryRun ? "dry-run" : "convert",
    converter: "Foundation Hans-Hant",
    refresh,
    existingTranslations: Object.keys(existing).length,
    totalPendingTranslations: allPending.length,
    selectedTranslations: pending.length,
    batches: Math.ceil(pending.length / batchSize)
  })}\n`);
  if (dryRun || !pending.length) return;

  for (let offset = 0; offset < pending.length; offset += batchSize) {
    const sources = pending.slice(offset, offset + batchSize);
    const translated = convertBatch(sources);
    translated.forEach((value, index) => {
      const source = sources[index];
      if (!source) throw new Error(`Missing source at conversion index ${offset + index}`);
      existing[source] = validateTranslation(source, value);
    });
    writeTranslations(existing);
    process.stdout.write(`${JSON.stringify({ completedEntries: Math.min(offset + sources.length, pending.length), selectedTranslations: pending.length })}\n`);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${String(error instanceof Error ? error.message : error)}\n`);
  process.exitCode = 1;
}
