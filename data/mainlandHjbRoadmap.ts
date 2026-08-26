import { mainlandHjbJuniorTopicMetadata, mainlandHjbJuniorTopics } from "@/data/mainlandHjbJuniorTopics";
import { lessonSlugForTopicId } from "@/lib/lessonLinks";
import type { CurriculumProfile, GradeId, LocalizedText, MainlandPepSemester, Topic } from "@/types";

export type MainlandHjbRoadmapBand = "primary" | "secondary";
export type MainlandHjbRoadmapStage = "primary" | "junior-secondary" | "senior-secondary";

export type MainlandHjbRoadmapStation = {
  station: string;
  stationLabel: LocalizedText;
  busStops: string[];
  busStopLabels: LocalizedText[];
};

export type MainlandHjbRoadmapNode = {
  topicId: string;
  canonicalTopicId: string;
  grade: GradeId;
  band: MainlandHjbRoadmapBand;
  stage: MainlandHjbRoadmapStage;
  semester: MainlandPepSemester;
  moduleLabel: LocalizedText;
  unitTitle: LocalizedText;
  routeName: LocalizedText;
  lessonSlug: string;
  practiceTopicId: string | null;
  sourceRefs: string[];
  stations: MainlandHjbRoadmapStation[];
};

export type MainlandHjbMapDistrictLabel = {
  x: number;
  y: number;
  label: LocalizedText;
};

type HjbTopicMetadata = {
  stage: MainlandHjbRoadmapStage;
  semester: MainlandPepSemester;
  volume: string;
  unitTitle: string;
  conceptIds: string[];
  evidenceCardIds: string[];
  questionCount?: number;
};

const mainlandHjbProfile: CurriculumProfile = { region: "MAINLAND", publisher: "MAINLAND_HJB" };

const stageLabels: Record<MainlandHjbRoadmapStage, LocalizedText> = {
  primary: { en: "HJB Primary Mathematics", zh: "滬教版小學數學", zhHans: "沪教版小学数学" },
  "junior-secondary": { en: "HJB Junior-secondary Mathematics", zh: "滬教版初中數學", zhHans: "沪教版初中数学" },
  "senior-secondary": { en: "HJB Senior-secondary Mathematics", zh: "滬教版高中數學", zhHans: "沪教版高中数学" }
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

const semesterLabels: Record<MainlandPepSemester, LocalizedText> = {
  upper: { en: "Upper semester", zh: "上學期", zhHans: "上学期" },
  lower: { en: "Lower semester", zh: "下學期", zhHans: "下学期" },
  "full-year": { en: "Full-year module", zh: "全年模組", zhHans: "全年模块" }
};

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

function stageForGrade(grade: GradeId): MainlandHjbRoadmapStage {
  if (grade.startsWith("P")) return "primary";
  if (grade === "S1" || grade === "S2" || grade === "S3") return "junior-secondary";
  return "senior-secondary";
}

function bandForGrade(grade: GradeId): MainlandHjbRoadmapBand {
  return grade.startsWith("P") ? "primary" : "secondary";
}

function metadataForTopic(topic: Topic): HjbTopicMetadata {
  const junior = mainlandHjbJuniorTopicMetadata[topic.id];
  if (junior) {
    return {
      stage: "junior-secondary",
      semester: junior.semester,
      volume: junior.volume,
      unitTitle: junior.titleZhHans,
      conceptIds: junior.conceptIds,
      evidenceCardIds: junior.evidenceCardIds
    };
  }

  return {
    stage: stageForGrade(topic.grade),
    semester: "full-year",
    volume: textOf(stageLabels[stageForGrade(topic.grade)]),
    unitTitle: textOf(topic.title),
    conceptIds: [],
    evidenceCardIds: []
  };
}

function conceptsForTopic(topic: Topic, metadata: HjbTopicMetadata) {
  const zhTerms = splitZhTerms(
    textOf(topic.title),
    metadata.unitTitle,
    metadata.volume
  );
  const enTerms = splitEnglishTerms(topic.title.en, metadata.unitTitle, metadata.volume);
  const zh = unique([...zhTerms, textOf(topic.title), "概念含义", "数量关系", "表达转换"]).slice(0, 5);
  const en = unique([...enTerms, topic.title.en, "concept meaning", "relationships", "representation"]).slice(0, 5);

  return { zh, en };
}

function makeStop(en: string, zhHans: string): LocalizedText {
  return localized(en, zhHans);
}

function station(stationLabel: LocalizedText, stops: LocalizedText[]): MainlandHjbRoadmapStation {
  return {
    station: textOf(stationLabel),
    stationLabel,
    busStops: stops.map((stop) => textOf(stop)),
    busStopLabels: stops
  };
}

function practiceLabelFor(metadata: HjbTopicMetadata) {
  if (metadata.stage === "junior-secondary") {
    return makeStop("Lesson-first study route", "先完成课节学习");
  }

  if (metadata.questionCount) {
    return makeStop(`${metadata.questionCount} approved practice items are linked`, `${metadata.questionCount}题已审核练习已关联`);
  }

  return makeStop("Practice checkpoint is linked", "课堂练习检查已关联");
}

function buildStations(topic: Topic, metadata: HjbTopicMetadata) {
  const gradeLabel = gradeLabels[topic.grade] ?? topic.title;
  const stage = stageLabels[metadata.stage];
  const semesterLabel = semesterLabels[metadata.semester];
  const titleZh = textOf(topic.title);
  const concepts = conceptsForTopic(topic, metadata);
  const [firstConcept, secondConcept, thirdConcept] = concepts.zh;
  const [firstConceptEn, secondConceptEn, thirdConceptEn] = concepts.en;

  return [
    station(localized("Textbook unit", "教材单元"), [
      makeStop(`${textOf(gradeLabel, "en")} ${textOf(semesterLabel, "en")} route`, `${textOf(gradeLabel)} · ${textOf(semesterLabel)}路线`),
      makeStop(`${metadata.volume} scope`, `${metadata.volume}范围`),
      makeStop(`Lesson route: ${topic.title.en}`, `课节入口：${titleZh}`),
      practiceLabelFor(metadata)
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
    station(localized("Learning diagnosis", "学习诊断"), [
      makeStop(`${firstConceptEn} misconception check`, `${firstConcept}易错辨析`),
      makeStop("conditions, units, and range check", "条件、单位与范围检查"),
      makeStop("teacher-guided checkpoint", "教师引导检查"),
      makeStop("answer reasonableness verification", "答案合理性验证")
    ])
  ];
}

function buildRoadmapNode(topic: Topic): MainlandHjbRoadmapNode {
  const metadata = metadataForTopic(topic);
  const gradeLabel = gradeLabels[topic.grade] ?? topic.title;
  const stage = metadata.stage;

  return {
    topicId: topic.id,
    canonicalTopicId: topic.canonicalTopicId ?? topic.id,
    grade: topic.grade,
    band: bandForGrade(topic.grade),
    stage,
    semester: metadata.semester,
    moduleLabel: localized(
      `${textOf(stageLabels[stage], "en")} · ${textOf(semesterLabels[metadata.semester], "en")}`,
      `${textOf(stageLabels[stage])} · ${textOf(semesterLabels[metadata.semester])}`
    ),
    unitTitle: localized(topic.title.en, metadata.unitTitle),
    routeName: localized(`HJB ${textOf(gradeLabel, "en")} · ${topic.title.en}`, `沪教版${textOf(gradeLabel)} · ${metadata.unitTitle}`),
    lessonSlug: lessonSlugForTopicId(topic.id),
    practiceTopicId: stage === "junior-secondary" ? null : topic.id,
    sourceRefs: unique([
      `topic:${topic.id}`,
      `lesson:${lessonSlugForTopicId(topic.id)}`,
      stage === "junior-secondary" ? "" : `practice:${topic.id}`,
      ...metadata.evidenceCardIds.map((cardId) => `evidence-card:${cardId}`)
    ]),
    stations: buildStations(topic, metadata)
  };
}

export const mainlandHjbRoadmapTopics: Topic[] = [
  ...mainlandHjbJuniorTopics
].map((topic) => ({
  ...topic,
  curriculumTrack: "MAINLAND_PEP_HIGH",
  curriculumProfile: topic.curriculumProfile ?? mainlandHjbProfile,
  region: "MAINLAND",
  publisher: "MAINLAND_HJB"
}));

export const mainlandHjbRoadmapNodes: MainlandHjbRoadmapNode[] = mainlandHjbRoadmapTopics.map(buildRoadmapNode);

export const mainlandHjbRoadmapNodesByTopicId = new Map(mainlandHjbRoadmapNodes.map((node) => [node.topicId, node]));

export const mainlandHjbTransitDetailsByTopicId = Object.fromEntries(
  mainlandHjbRoadmapNodes.map((node) => [
    node.topicId,
    {
      branches: node.stations
    }
  ])
);

export const mainlandHjbMapDistrictLabels: MainlandHjbMapDistrictLabel[] = [
  { x: 120, y: 110, label: localized("Pudong New Area", "浦东新区", "浦東新區") },
  { x: 920, y: 340, label: localized("Jing'an District", "静安区", "靜安區") },
  { x: 1580, y: 130, label: localized("Huangpu District", "黄浦区", "黃浦區") },
  { x: 2360, y: 480, label: localized("Xuhui District", "徐汇区", "徐匯區") },
  { x: 3100, y: 210, label: localized("Putuo District", "普陀区", "普陀區") },
  { x: 590, y: 900, label: localized("Hongkou District", "虹口区", "虹口區") },
  { x: 1320, y: 1180, label: localized("Changning District", "长宁区", "長寧區") },
  { x: 2420, y: 1280, label: localized("Jinshan District", "金山区", "金山區") },
  { x: 3260, y: 1000, label: localized("Songjiang District", "松江区", "松江區") }
];

export function isMainlandHjbRoadmapProfile(profile?: CurriculumProfile | null) {
  return profile?.region === "MAINLAND" && profile.publisher === "MAINLAND_HJB";
}

export function isMainlandHjbRoadmapTopic(topic?: Pick<Topic, "publisher" | "curriculumProfile" | "region"> | null) {
  return topic?.publisher === "MAINLAND_HJB" || topic?.curriculumProfile?.publisher === "MAINLAND_HJB";
}

export function getMainlandHjbRoadmapNode(topicId: string) {
  return mainlandHjbRoadmapNodesByTopicId.get(topicId) ?? null;
}

export function getMainlandHjbTransitDetails(topic: Pick<Topic, "id" | "publisher" | "curriculumProfile" | "region">) {
  if (!isMainlandHjbRoadmapTopic(topic)) return null;
  return mainlandHjbTransitDetailsByTopicId[topic.id] ?? null;
}
