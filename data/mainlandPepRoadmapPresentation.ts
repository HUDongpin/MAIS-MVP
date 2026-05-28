import type { CurriculumProfile, LocalizedText, Topic } from "@/types";

export type MainlandPepMapDistrictLabel = {
  x: number;
  y: number;
  label: LocalizedText;
};

type PresentationBranch = {
  station: string;
  stationLabel: LocalizedText;
  busStops: string[];
  busStopLabels: LocalizedText[];
};

function localized(en: string, zhHans: string, zh = zhHans): LocalizedText {
  return { en, zh, zhHans };
}

function textOf(value: LocalizedText) {
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

function stop(en: string, zhHans: string): LocalizedText {
  return localized(en, zhHans);
}

function branch(stationLabel: LocalizedText, stops: LocalizedText[]): PresentationBranch {
  return {
    station: textOf(stationLabel),
    stationLabel,
    busStops: stops.map(textOf),
    busStopLabels: stops
  };
}

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

export function getMainlandPepTransitDetails(topic: Pick<Topic, "id" | "curriculumTrack" | "publisher" | "region" | "grade" | "title" | "description">) {
  if (!isMainlandPepRoadmapTopic(topic)) return null;

  const titleZh = textOf(topic.title);
  const termsZh = splitZhTerms(titleZh, textOf(topic.description));
  const termsEn = splitEnglishTerms(topic.title.en, topic.description.en);
  const zh = unique([...termsZh, titleZh, "概念含义", "数量关系", "表达转换"]).slice(0, 5);
  const en = unique([...termsEn, topic.title.en, "concept meaning", "relationships", "representation"]).slice(0, 5);
  const [firstZh, secondZh, thirdZh] = zh;
  const [firstEn, secondEn, thirdEn] = en;

  return {
    branches: [
      branch(localized("Textbook unit", "教材单元"), [
        stop(`${topic.grade} PEP route`, `${topic.grade}人教版路线`),
        stop(`Lesson route: ${topic.title.en}`, `课节入口：${titleZh}`),
        stop("Practice Arena topic is linked", "练习场题组已关联"),
        stop("unit boundary and prerequisites", "单元边界与前置知识")
      ]),
      branch(localized("Concept build", "概念建构"), [
        stop(firstEn, firstZh),
        stop(secondEn, secondZh),
        stop(thirdEn, thirdZh),
        stop("mathematical language and representation", "数学语言与表示")
      ]),
      branch(localized("Models and methods", "模型方法"), [
        stop(`${firstEn} representations`, `${firstZh}表示`),
        stop(`${secondEn} relationships`, `${secondZh}关系`),
        stop("diagram, table, expression conversion", "图形、表格、算式互译"),
        stop("step-by-step reasoning", "步骤表达与推理")
      ]),
      branch(localized("Practice diagnosis", "练习诊断"), [
        stop(`${firstEn} misconception check`, `${firstZh}易错辨析`),
        stop("conditions, units, and range check", "条件、单位与范围检查"),
        stop("original practice transfer", "原创练习迁移"),
        stop("answer reasonableness verification", "答案合理性验证")
      ])
    ]
  };
}
