import { mainlandPepHighTopics } from "@/data/mainlandPepHighTopics";
import { mainlandPepJuniorTopics } from "@/data/mainlandPepJuniorTopics";
import { mainlandPepPrimaryTopicSeeds, mainlandPepPrimaryTopics } from "@/data/mainlandPepPrimaryTopics";
import { mainlandPepHighRagCards } from "@/data/rag/mainlandPepHigh";
import { mainlandPepJuniorRagCards } from "@/data/rag/mainlandPepJunior";
import { mainlandPepPrimaryRagCards } from "@/data/rag/mainlandPepPrimary";
import { lessonSlugForTopicId } from "@/lib/lessonLinks";
import type { CurriculumProfile, GradeId, LocalizedText, Topic } from "@/types";

export type MainlandPepRoadmapBand = "primary" | "secondary";

export type MainlandPepRoadmapStation = {
  station: string;
  stationLabel: LocalizedText;
  busStops: string[];
  busStopLabels: LocalizedText[];
};

export type MainlandPepRoadmapNode = {
  topicId: string;
  canonicalTopicId: string;
  grade: GradeId;
  band: MainlandPepRoadmapBand;
  stage: "primary" | "junior-secondary" | "senior-secondary";
  semester: "upper" | "lower" | "full-year";
  moduleLabel: LocalizedText;
  unitTitle: LocalizedText;
  routeName: LocalizedText;
  lessonSlug: string;
  practiceTopicId: string;
  sourceRefs: string[];
  stations: MainlandPepRoadmapStation[];
};

export type MainlandPepMapDistrictLabel = {
  x: number;
  y: number;
  label: LocalizedText;
};

type EvidenceCard = {
  id: string;
  unitTitle?: string;
  chapter?: string;
  conceptIds?: string[];
  competencyTags?: string[];
  skillTags?: string[];
  misconceptionTags?: string[];
  safeSummary?: string;
};

const mainlandPepProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_PEP" };

const stageLabels: Record<MainlandPepRoadmapNode["stage"], LocalizedText> = {
  primary: { en: "Primary PEP Mathematics", zh: "人教版小學數學", zhHans: "人教版小学数学" },
  "junior-secondary": { en: "Junior-secondary PEP Mathematics", zh: "人教版初中數學", zhHans: "人教版初中数学" },
  "senior-secondary": { en: "Senior-secondary PEP Mathematics", zh: "人教版高中數學", zhHans: "人教版高中数学" }
};

const gradeLabels: Partial<Record<GradeId, LocalizedText>> = {
  P1: { en: "Primary 1", zh: "小學一年級", zhHans: "小学一年级" },
  P2: { en: "Primary 2", zh: "小學二年級", zhHans: "小学二年级" },
  P3: { en: "Primary 3", zh: "小學三年級", zhHans: "小学三年级" },
  P4: { en: "Primary 4", zh: "小學四年級", zhHans: "小学四年级" },
  P5: { en: "Primary 5", zh: "小學五年級", zhHans: "小学五年级" },
  P6: { en: "Primary 6", zh: "小學六年級", zhHans: "小学六年级" },
  S1: { en: "Grade 7", zh: "初一", zhHans: "初一" },
  S2: { en: "Grade 8", zh: "初二", zhHans: "初二" },
  S3: { en: "Grade 9", zh: "初三", zhHans: "初三" },
  S4: { en: "Grade 10", zh: "高一", zhHans: "高一" },
  S5: { en: "Grade 11", zh: "高二", zhHans: "高二" },
  S6: { en: "Grade 12", zh: "高三", zhHans: "高三" }
};

const semesterLabels: Record<MainlandPepRoadmapNode["semester"], LocalizedText> = {
  upper: { en: "Upper semester", zh: "上學期", zhHans: "上学期" },
  lower: { en: "Lower semester", zh: "下學期", zhHans: "下学期" },
  "full-year": { en: "Full-year module", zh: "全年模組", zhHans: "全年模块" }
};

const highRagIdByTopicId: Record<string, string> = {
  "pep-high-s4-sets-logic": "pep-high-sets-logic",
  "pep-high-s4-quadratic-inequalities": "pep-high-quadratic-inequalities",
  "pep-high-s4-function-properties": "pep-high-function-concepts-properties",
  "pep-high-s4-exp-log": "pep-high-exponential-logarithmic-functions",
  "pep-high-s4-trigonometry": "pep-high-trigonometric-functions",
  "pep-high-s4-plane-vectors": "pep-high-plane-vectors",
  "pep-high-s4-complex-numbers": "pep-high-complex-numbers",
  "pep-high-s4-solid-geometry-intro": "pep-high-solid-geometry-intro",
  "pep-high-s4-statistics": "pep-high-statistics",
  "pep-high-s4-probability": "pep-high-probability",
  "pep-high-s5-space-vectors": "pep-high-space-vectors-solid-geometry",
  "pep-high-s5-lines-circles": "pep-high-lines-circles",
  "pep-high-s5-conics": "pep-high-conic-sections",
  "pep-high-s5-sequences": "pep-high-sequences",
  "pep-high-s5-derivatives": "pep-high-derivatives-applications",
  "pep-high-s6-counting": "pep-high-counting-principles",
  "pep-high-s6-random-variables": "pep-high-random-variables-distributions",
  "pep-high-s6-bivariate-data": "pep-high-bivariate-statistics",
  "pep-high-s6-derivative-synthesis": "pep-high-derivatives-tangent-zeros-inequalities",
  "pep-high-s6-analytic-geometry-synthesis": "pep-high-conic-sections",
  "pep-high-s6-probability-statistics-synthesis": "pep-high-conditional-probability-distributions",
  "pep-high-s6-exam-practice": "pep-high-function-zero-modeling"
};

const primarySeedById = new Map(mainlandPepPrimaryTopicSeeds.map((seed) => [seed.id, seed]));
const primaryRagCardsByGradeSemester = new Map<string, EvidenceCard[]>();

mainlandPepPrimaryRagCards.forEach((card) => {
  const key = `${card.grade}-${card.semester}`;
  primaryRagCardsByGradeSemester.set(key, [...(primaryRagCardsByGradeSemester.get(key) ?? []), card]);
});

const juniorRagById = new Map<string, EvidenceCard>(mainlandPepJuniorRagCards.map((card) => [card.id, card]));
const highRagById = new Map<string, EvidenceCard>(mainlandPepHighRagCards.map((card) => [card.id, card]));

function localized(en: string, zhHans: string, zh = zhHans): LocalizedText {
  return { en, zh, zhHans };
}

function textOf(value: LocalizedText, locale: "en" | "zhHans" = "zhHans") {
  if (locale === "en") return value.en;
  return value.zhHans ?? value.zh;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });

  return result;
}

function splitZhTerms(...values: string[]) {
  return unique(
    values.flatMap((value) =>
      value
        .replace(/[（）()《》]/g, " ")
        .split(/[、，,。；;：:／/]|与|和|及其|以及|并|或|的/g)
        .map((part) => part.trim())
        .filter((part) => /[\u3400-\u9fff]/.test(part) && part.length >= 2)
    )
  );
}

function splitEnglishTerms(...values: string[]) {
  return unique(
    values.flatMap((value) =>
      value
        .replace(/[()]/g, " ")
        .split(/,|;|:|\/|\band\b|\bor\b|\bwith\b|\bthrough\b/gi)
        .map((part) => part.trim())
        .filter((part) => /[a-z]/i.test(part) && part.length >= 3)
    )
  );
}

function stageForGrade(grade: GradeId): MainlandPepRoadmapNode["stage"] {
  if (grade.startsWith("P")) return "primary";
  if (grade === "S1" || grade === "S2" || grade === "S3") return "junior-secondary";
  return "senior-secondary";
}

function bandForGrade(grade: GradeId): MainlandPepRoadmapBand {
  return grade.startsWith("P") ? "primary" : "secondary";
}

function semesterForTopic(topic: Topic): MainlandPepRoadmapNode["semester"] {
  const primarySeed = primarySeedById.get(topic.id);
  if (primarySeed) return primarySeed.semester;
  const juniorCard = juniorRagById.get(topic.id);
  if (juniorCard?.id) return (juniorCard as { semester?: MainlandPepRoadmapNode["semester"] }).semester ?? "full-year";
  return "full-year";
}

function evidenceForTopic(topic: Topic): EvidenceCard | null {
  const primarySeed = primarySeedById.get(topic.id);
  if (primarySeed) {
    const sameSemesterCards = primaryRagCardsByGradeSemester.get(`${topic.grade}-${primarySeed.semester}`) ?? [];
    return sameSemesterCards.find((card) => {
      const terms = splitZhTerms(textOf(topic.title), textOf(topic.description));
      return terms.some((term) => `${card.unitTitle ?? ""}${card.safeSummary ?? ""}${card.skillTags?.join("") ?? ""}`.includes(term));
    }) ?? sameSemesterCards[0] ?? null;
  }

  const juniorCard = juniorRagById.get(topic.id);
  if (juniorCard) return juniorCard;

  const highRagId = highRagIdByTopicId[topic.id];
  return highRagId ? highRagById.get(highRagId) ?? null : null;
}

function conceptsForTopic(topic: Topic, evidence: EvidenceCard | null) {
  const zhTerms = splitZhTerms(
    textOf(topic.title),
    textOf(topic.description),
    evidence?.unitTitle ?? "",
    evidence?.chapter ?? "",
    ...(evidence?.skillTags ?? []),
    ...(evidence?.conceptIds ?? []),
    ...(evidence?.competencyTags ?? [])
  );
  const enTerms = splitEnglishTerms(
    topic.title.en,
    topic.description.en,
    evidence?.safeSummary ?? "",
    ...(evidence?.conceptIds ?? [])
  );

  const zh = unique([...zhTerms, textOf(topic.title)]).slice(0, 5);
  const en = unique([...enTerms, topic.title.en]).slice(0, 5);
  return {
    zh: zh.length >= 3 ? zh : unique([...zh, "概念含义", "数量关系", "表达转换"]).slice(0, 5),
    en: en.length >= 3 ? en : unique([...en, "concept meaning", "relationships", "representation"]).slice(0, 5)
  };
}

function makeStop(en: string, zhHans: string): LocalizedText {
  return localized(en, zhHans);
}

function station(stationLabel: LocalizedText, stops: LocalizedText[]): MainlandPepRoadmapStation {
  return {
    station: textOf(stationLabel),
    stationLabel,
    busStops: stops.map((stop) => textOf(stop)),
    busStopLabels: stops
  };
}

function buildStations(topic: Topic, evidence: EvidenceCard | null, semester: MainlandPepRoadmapNode["semester"]) {
  const gradeLabel = gradeLabels[topic.grade] ?? topic.title;
  const stage = stageLabels[stageForGrade(topic.grade)];
  const semesterLabel = semesterLabels[semester];
  const titleZh = textOf(topic.title);
  const concepts = conceptsForTopic(topic, evidence);
  const [firstConcept, secondConcept, thirdConcept] = concepts.zh;
  const [firstConceptEn, secondConceptEn, thirdConceptEn] = concepts.en;

  return [
    station(localized("Textbook unit", "教材单元"), [
      makeStop(`${textOf(gradeLabel, "en")} ${textOf(semesterLabel, "en")} route`, `${textOf(gradeLabel)} · ${textOf(semesterLabel)}路线`),
      makeStop(`${textOf(stage, "en")} scope`, `${textOf(stage)}范围`),
      makeStop(`Lesson route: ${topic.title.en}`, `课节入口：${titleZh}`),
      makeStop("Practice Arena topic is linked", "练习场题组已关联")
    ]),
    station(localized("Concept build", "概念建构"), [
      makeStop(firstConceptEn, firstConcept),
      makeStop(secondConceptEn, secondConcept),
      makeStop(thirdConceptEn, thirdConcept),
      makeStop("mathematical language and representation", "数学语言与表示")
    ]),
    station(localized("Models and methods", "模型方法"), [
      makeStop(`${firstConceptEn} representations`, `${firstConcept}表示`),
      makeStop(`${secondConceptEn} relationships`, `${secondConcept}关系`),
      makeStop("diagram, table, expression conversion", "图形、表格、算式互译"),
      makeStop("step-by-step reasoning", "步骤表达与推理")
    ]),
    station(localized("Practice diagnosis", "练习诊断"), [
      makeStop(`${firstConceptEn} misconception check`, `${firstConcept}易错辨析`),
      makeStop("conditions, units, and range check", "条件、单位与范围检查"),
      makeStop("original practice transfer", "原创练习迁移"),
      makeStop("answer reasonableness verification", "答案合理性验证")
    ])
  ];
}

function buildRoadmapNode(topic: Topic): MainlandPepRoadmapNode {
  const evidence = evidenceForTopic(topic);
  const semester = semesterForTopic(topic);
  const stage = stageForGrade(topic.grade);
  const unitTitle = localized(topic.title.en, textOf(topic.title));
  const gradeLabel = gradeLabels[topic.grade] ?? topic.title;

  return {
    topicId: topic.id,
    canonicalTopicId: topic.canonicalTopicId ?? topic.id,
    grade: topic.grade,
    band: bandForGrade(topic.grade),
    stage,
    semester,
    moduleLabel: localized(`${textOf(stageLabels[stage], "en")} · ${textOf(semesterLabels[semester], "en")}`, `${textOf(stageLabels[stage])} · ${textOf(semesterLabels[semester])}`),
    unitTitle,
    routeName: localized(`PEP ${textOf(gradeLabel, "en")} · ${topic.title.en}`, `人教版${textOf(gradeLabel)} · ${textOf(topic.title)}`),
    lessonSlug: lessonSlugForTopicId(topic.id),
    practiceTopicId: topic.id,
    sourceRefs: unique([
      `topic:${topic.id}`,
      `lesson:${lessonSlugForTopicId(topic.id)}`,
      `practice:${topic.id}`,
      evidence ? `evidence-card:${evidence.id}` : ""
    ]),
    stations: buildStations(topic, evidence, semester)
  };
}

export const mainlandPepRoadmapTopics: Topic[] = [
  ...mainlandPepPrimaryTopics,
  ...mainlandPepJuniorTopics,
  ...mainlandPepHighTopics
].map((topic) => ({
  ...topic,
  curriculumTrack: "MAINLAND_PEP_HIGH",
  curriculumProfile: topic.curriculumProfile ?? mainlandPepProfile,
  region: "MAINLAND",
  publisher: "MAINLAND_PEP"
}));

export const mainlandPepRoadmapNodes: MainlandPepRoadmapNode[] = mainlandPepRoadmapTopics.map(buildRoadmapNode);

export const mainlandPepRoadmapNodesByTopicId = new Map(mainlandPepRoadmapNodes.map((node) => [node.topicId, node]));

export const mainlandPepTransitDetailsByTopicId = Object.fromEntries(
  mainlandPepRoadmapNodes.map((node) => [
    node.topicId,
    {
      branches: node.stations
    }
  ])
);

export const mainlandPepMapDistrictLabels: MainlandPepMapDistrictLabel[] = [
  { x: 120, y: 110, label: localized("Tianhe District", "天河区", "天河區") },
  { x: 1420, y: 520, label: localized("Haizhu District", "海珠区", "海珠區") },
  { x: 2480, y: 1260, label: localized("Baiyun District", "白云区", "白雲區") },
  { x: 3100, y: 420, label: localized("Huangpu District", "黄埔区", "黃埔區") },
  { x: 720, y: 980, label: localized("Yuexiu District", "越秀区", "越秀區") },
  { x: 3400, y: 1040, label: localized("Panyu District", "番禺区", "番禺區") }
];

export function isMainlandPepRoadmapProfile(profile?: CurriculumProfile | null) {
  return profile?.region === "MAINLAND" && profile.publisher === "MAINLAND_PEP";
}

export function isMainlandPepRoadmapTopic(topic?: Pick<Topic, "curriculumTrack" | "publisher" | "region"> | null) {
  return topic?.curriculumTrack === "MAINLAND_PEP_HIGH" || topic?.publisher === "MAINLAND_PEP" || topic?.region === "MAINLAND";
}

export function getMainlandPepRoadmapNode(topicId: string) {
  return mainlandPepRoadmapNodesByTopicId.get(topicId) ?? null;
}

export function getMainlandPepTransitDetails(topic: Pick<Topic, "id" | "curriculumTrack" | "publisher" | "region">) {
  if (!isMainlandPepRoadmapTopic(topic)) return null;
  return mainlandPepTransitDetailsByTopicId[topic.id] ?? null;
}
