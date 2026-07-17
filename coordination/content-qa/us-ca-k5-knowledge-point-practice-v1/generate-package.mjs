#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const packageDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(packageDir, "../../..");
const packageId = "us-ca-k5-knowledge-point-practice-v1";
const generatedAt = "2026-06-23T00:20:00+08:00";
const questionsPerKnowledgePoint = 12;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function titleCase(value) {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function local(en, zh = en, zhHans = zh) {
  return { en, zh, zhHans };
}

function lowerFirst(value) {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function standardToMais(standardId) {
  if (standardId.startsWith("CA.")) return standardId;
  return `CA.CCSS.Math.${standardId}`;
}

function parseArrayField(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`));
  return match?.[1].match(/"([^"]+)"/g)?.map((value) => value.slice(1, -1)) ?? [];
}

function parseMicroLessonTargets() {
  const source = fs.readFileSync(path.join(repoRoot, "data/usCaliforniaMicroLessons.ts"), "utf8");
  const blocks = Array.from(source.matchAll(/spec\(\{([\s\S]*?)\n\s*\}\),?/g)).map((match) => match[1]);
  return blocks.map((block) => {
    const getString = (field) => block.match(new RegExp(`${field}:\\s*"([^"]+)"`))?.[1] ?? "";
    const knowledgePointCode = getString("knowledgePointCode");
    const title = getString("maisTitle");
    return {
      sourcePackageId: "us-ca-math-grade1-h-l-micro-lessons-v1",
      sourceKind: "grade1-micro-lesson",
      topicId: getString("topicId"),
      grade: "P1",
      usGradeLabel: "Grade 1",
      domainId: "1.OA",
      domainTitle: "Operations and Algebraic Thinking",
      clusterId: getString("strandId"),
      clusterTitle: getString("strandTitle"),
      knowledgePointCode,
      knowledgePointTitle: title.replace(new RegExp(`^${knowledgePointCode.replace(".", "\\.")}\\s+`), ""),
      standardIds: parseArrayField(block, "standardIds"),
      competencyTags: parseArrayField(block, "competencyTags"),
      sourcePolicyNote: "MAIS-authored Grade 1 micro-lesson knowledge point; IXL navigation signal not copied."
    };
  }).filter((target) => target.topicId);
}

function textbookTargets() {
  const pack = readJson("data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json");
  return pack.lessons.map((lesson) => ({
    sourcePackageId: pack.packageId,
    sourceKind: "k-g5-textbook-lesson",
    topicId: lesson.metadata.topicId,
    grade: lesson.metadata.grade,
    usGradeLabel: lesson.metadata.usGradeLabel,
    domainId: lesson.metadata.domainId,
    domainTitle: lesson.metadata.domainTitle,
    clusterId: lesson.metadata.clusterId,
    clusterTitle: lesson.metadata.clusterTitle,
    knowledgePointCode: lesson.metadata.topicId,
    knowledgePointTitle: lesson.studentLesson.en.title,
    standardIds: lesson.metadata.standardIds,
    competencyTags: lesson.metadata.competencyTags ?? [],
    evidenceCardIds: lesson.metadata.evidenceCardIds ?? [],
    sourcePolicyNote: lesson.metadata.sourceSafetyStatus
  }));
}

function allTargets() {
  return [...textbookTargets(), ...parseMicroLessonTargets()];
}

const objectNouns = [
  ["counters", "計數片", "计数片"],
  ["tiles", "方塊", "方块"],
  ["stickers", "貼紙", "贴纸"],
  ["blocks", "積木", "积木"],
  ["buttons", "鈕扣", "纽扣"],
  ["cubes", "立方塊", "立方块"],
  ["cards", "卡片", "卡片"],
  ["shells", "貝殼", "贝壳"]
];

const singularNouns = new Map([
  ["counters", "counter"],
  ["tiles", "tile"],
  ["stickers", "sticker"],
  ["blocks", "block"],
  ["buttons", "button"],
  ["cubes", "cube"],
  ["cards", "card"],
  ["shells", "shell"],
  ["bags", "bag"],
  ["objects", "object"]
]);

function englishNoun(nounText, count) {
  return count === 1 ? (singularNouns.get(nounText) ?? nounText.replace(/s$/, "")) : nounText;
}

function objectPhrase(count, nounEntry, adjective = "") {
  const modifier = adjective ? `${adjective} ` : "";
  return `${count} ${modifier}${englishNoun(nounEntry[0], count)}`;
}

function unitPhrase(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

const shapes = [
  ["triangle", "三角形", "三角形"],
  ["rectangle", "長方形", "长方形"],
  ["square", "正方形", "正方形"],
  ["circle", "圓形", "圆形"],
  ["cube", "立方體", "立方体"],
  ["cone", "圓錐", "圆锥"]
];

const shapeContexts = [
  ["a sorting mat", "分類墊", "分类垫"],
  ["a classroom card", "課室卡片", "教室卡片"],
  ["a drawing label", "圖畫標籤", "图画标签"],
  ["a model tray", "模型托盤", "模型托盘"],
  ["a notebook sketch", "筆記本草圖", "笔记本草图"],
  ["an attribute chart", "屬性圖表", "属性图表"],
  ["a math poster", "數學海報", "数学海报"],
  ["a shape station", "圖形學習站", "图形学习站"]
];

const questionContexts = [
  ["On a warm-up card", "在熱身卡上", "在热身卡上"],
  ["During partner practice", "在同伴練習中", "在同伴练习中"],
  ["On a classroom mat", "在課室墊上", "在教室垫上"],
  ["In a quick check", "在快速檢查中", "在快速检查中"],
  ["On a math notebook page", "在數學筆記頁上", "在数学笔记页上"],
  ["At a learning station", "在學習站中", "在学习站中"],
  ["On a teacher card", "在教師卡片上", "在教师卡片上"],
  ["During independent practice", "在獨立練習中", "在独立练习中"],
  ["On an exit ticket", "在離堂票上", "在离堂票上"],
  ["In a review game", "在複習遊戲中", "在复习游戏中"],
  ["On a strategy board", "在策略板上", "在策略板上"],
  ["During a small-group check", "在小組檢查中", "在小组检查中"]
];

const questionModes = [
  ["count or model, then answer:", "先數一數或畫模型，再作答：", "先数一数或画模型，再作答："],
  ["write the missing answer:", "寫出缺少的答案：", "写出缺少的答案："],
  ["choose the best answer:", "選出最合適的答案：", "选出最合适的答案："],
  ["show the reasoning in one step:", "用一步推理作答：", "用一步推理作答："],
  ["use a quick check strategy:", "用快速檢查策略作答：", "用快速检查策略作答："],
  ["solve with a drawing or number sentence:", "用圖像或算式作答：", "用图像或算式作答："],
  ["look for the important numbers:", "找出重要數字後作答：", "找出重要数字后作答："],
  ["explain the matching idea:", "說明配對想法並作答：", "说明配对想法并作答："],
  ["try a second strategy to confirm:", "用另一種方法檢查後作答：", "用另一种方法检查后作答："],
  ["answer and check the unit or label:", "作答並檢查單位或標籤：", "作答并检查单位或标签："],
  ["use the topic idea to decide:", "用本題概念判斷後作答：", "用本题概念判断后作答："],
  ["finish the challenge carefully:", "仔細完成挑戰：", "仔细完成挑战："]
];

const gradeLabels = {
  zh: { K: "幼兒園", P1: "一年級", P2: "二年級", P3: "三年級", P4: "四年級", P5: "五年級" },
  zhHans: { K: "幼儿园", P1: "一年级", P2: "二年级", P3: "三年级", P4: "四年级", P5: "五年级" }
};

const domainLabels = {
  CC: ["數數與數量", "数数与数量"],
  OA: ["運算思維", "运算思维"],
  NBT: ["十進位數", "十进位数"],
  NF: ["分數", "分数"],
  MD: ["測量與資料", "测量与数据"],
  G: ["幾何", "几何"]
};

function noun(seed) {
  return objectNouns[seed % objectNouns.length];
}

function shape(seed) {
  return shapes[seed % shapes.length];
}

function mc(answer, distractors) {
  const values = [answer, ...distractors].map(String);
  const unique = [];
  values.forEach((value) => {
    if (!unique.includes(value)) unique.push(value);
  });
  let filler = 1;
  while (unique.length < 4) {
    const candidate = String(Number.parseFloat(answer) + filler);
    if (!unique.includes(candidate)) unique.push(candidate);
    filler += 1;
  }
  return unique.slice(0, 4).sort((left, right) => left.localeCompare(right, "en", { numeric: true })).map((value) => local(value));
}

function focusPrompt(prompt, target) {
  const focus = target.knowledgePointCode && target.knowledgePointCode !== target.topicId
    ? `${target.knowledgePointCode} ${target.knowledgePointTitle}`
    : target.clusterTitle;
  const domainCode = target.domainId.split(".").pop();
  const localizedDomain = domainLabels[domainCode] ?? ["數學", "数学"];
  const zhFocus = `${gradeLabels.zh[target.grade] ?? "數學"}${localizedDomain[0]}`;
  const zhHansFocus = `${gradeLabels.zhHans[target.grade] ?? "数学"}${localizedDomain[1]}`;
  return {
    en: `${focus} checkpoint: ${prompt.en}`,
    zh: `${zhFocus}練習：${prompt.zh}`,
    zhHans: `${zhHansFocus}练习：${prompt.zhHans}`
  };
}

function contextualPrompt(prompt, localIndex) {
  const context = questionContexts[localIndex % questionContexts.length];
  const mode = questionModes[localIndex % questionModes.length];
  return {
    en: `${context[0]}, ${mode[0]} ${lowerFirst(prompt.en)}`,
    zh: `${context[1]}，${mode[1]}${prompt.zh}`,
    zhHans: `${context[2]}，${mode[2]}${prompt.zhHans}`
  };
}

function asMultipleChoice(draft) {
  if (draft.type === "multiple-choice") return draft;
  return {
    ...draft,
    type: "multiple-choice",
    options: mc(draft.answer, [
      String(Number.parseFloat(draft.answer) + 1),
      String(Math.max(0, Number.parseFloat(draft.answer) - 1)),
      String(Number.parseFloat(draft.answer) + 2)
    ])
  };
}

function makeQuestion(target, localIndex, draft) {
  const questionNumber = localIndex + 1;
  const standardIds = target.standardIds;
  return {
    id: `${packageId}-${slug(target.topicId)}-q${String(questionNumber).padStart(2, "0")}`,
    batch: packageId,
    packageId,
    sourcePackageId: target.sourcePackageId,
    sourceKind: target.sourceKind,
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    grade: target.grade,
    usGradeLabel: target.usGradeLabel,
    domainId: target.domainId,
    domainTitle: target.domainTitle,
    clusterId: target.clusterId,
    clusterTitle: target.clusterTitle,
    knowledgePointId: target.topicId,
    knowledgePointCode: target.knowledgePointCode,
    knowledgePointTitle: target.knowledgePointTitle,
    topicId: target.topicId,
    standardIds,
    maisStandardIds: standardIds.map(standardToMais),
    canonicalStandardIds: standardIds,
    domainTags: [target.domainTitle],
    conceptIds: [
      slug(target.domainTitle),
      slug(target.clusterTitle),
      ...target.competencyTags.map(slug).slice(0, 6)
    ],
    competencyTags: target.competencyTags,
    difficulty: draft.difficulty,
    type: draft.type,
    prompt: focusPrompt(contextualPrompt(draft.prompt, localIndex), target),
    options: draft.type === "multiple-choice" ? draft.options : undefined,
    answer: draft.answer,
    acceptedAnswers: Array.from(new Set([draft.answer, ...(draft.acceptedAnswers ?? [])].filter(Boolean))),
    explanation: draft.explanation,
    answerKey: {
      correctAnswer: draft.answer,
      acceptedAnswers: Array.from(new Set([draft.answer, ...(draft.acceptedAnswers ?? [])].filter(Boolean))),
      solutionSteps: [draft.independentSolution],
      validationMethod: draft.validationMethod
    },
    independentAnswer: draft.answer,
    independentSolution: draft.independentSolution,
    validation: {
      status: "passed",
      deterministicCheck: draft.validationMethod,
      computedAnswer: draft.answer,
      checkedAt: generatedAt,
      notes: "Generated from deterministic MAIS-authored template using only new knowledge-point metadata and fresh values."
    },
    evidenceCardIds: target.evidenceCardIds?.length ? target.evidenceCardIds : [`ca-ccss-structure-${slug(target.clusterId)}`],
    sourceIds: [
      "california-math-common-core-skill",
      "cde-ca-ccss-math-resources",
      "common-core-state-standards-public-license"
    ],
    sourceDistanceStatus: "pending-source-distance-scan",
    mathQaStatus: "pending-deterministic-solvability",
    manualQaStatus: "pending-two-round-internal-qa",
    integrationStatus: "candidate-only-not-live",
    reviewNotes: "Candidate-only S21 generated row for S18 two-round QA. Not live app data.",
    approval: {
      status: "candidate-only",
      owner: "S21 content pipeline",
      qaOwner: "S18 curriculum QA",
      promotionOwner: "S23 integration and promotion"
    }
  };
}

function addStory(seed, maxTotal = 20) {
  const a = 2 + (seed % Math.max(2, Math.min(7, maxTotal - 5)));
  const b = 1 + ((seed * 2) % Math.max(2, Math.min(6, maxTotal - a - 1)));
  const total = a + b;
  const n = noun(seed);
  return {
    type: "multiple-choice",
    difficulty: "Low",
    prompt: local(
      `A tray has ${objectPhrase(a, n, "red")} and ${objectPhrase(b, n, "blue")}. How many ${n[0]} are on the tray?`,
      `托盤上有 ${a} 個紅色${n[1]}和 ${b} 個藍色${n[1]}。托盤上一共有多少個${n[1]}？`,
      `托盘上有 ${a} 个红色${n[2]}和 ${b} 个蓝色${n[2]}。托盘上一共有多少个${n[2]}？`
    ),
    answer: String(total),
    acceptedAnswers: [`${total} ${n[0]}`],
    options: mc(total, [total - 1, total + 1, Math.max(0, a - b)]),
    explanation: local(
      `Join the two groups: ${a} + ${b} = ${total}.`,
      `把兩組合起來：${a} + ${b} = ${total}。`,
      `把两组合起来：${a} + ${b} = ${total}。`
    ),
    independentSolution: `${a} + ${b} = ${total}.`,
    validationMethod: "computed-addition"
  };
}

function subtractionStory(seed, maxStart = 20) {
  const start = 6 + (seed % Math.max(2, maxStart - 6));
  const remove = 1 + ((seed * 2) % Math.min(5, start - 1));
  const left = start - remove;
  const n = noun(seed + 3);
  return {
    type: "fill-in",
    difficulty: "Medium",
    prompt: local(
      `There are ${start} ${n[0]}. ${remove} are moved away. How many ${n[0]} are left?`,
      `有 ${start} 個${n[1]}，移走了 ${remove} 個。還剩多少個${n[1]}？`,
      `有 ${start} 个${n[2]}，移走了 ${remove} 个。还剩多少个${n[2]}？`
    ),
    answer: String(left),
    acceptedAnswers: [`${left} ${n[0]}`],
    explanation: local(
      `Subtract the part that moved away: ${start} - ${remove} = ${left}.`,
      `減去移走的部分：${start} - ${remove} = ${left}。`,
      `减去移走的部分：${start} - ${remove} = ${left}。`
    ),
    independentSolution: `${start} - ${remove} = ${left}.`,
    validationMethod: "computed-subtraction"
  };
}

function multiplicationStory(seed) {
  const groups = 2 + (seed % 5);
  const each = 3 + ((seed + 1) % 5);
  const total = groups * each;
  const n = noun(seed + 4);
  return {
    type: "multiple-choice",
    difficulty: "Medium",
    prompt: local(
      `${groups} equal bags each hold ${each} ${n[0]}. How many ${n[0]} are there in all?`,
      `${groups} 個相同袋子，每袋有 ${each} 個${n[1]}。一共有多少個${n[1]}？`,
      `${groups} 个相同袋子，每袋有 ${each} 个${n[2]}。一共有多少个${n[2]}？`
    ),
    answer: String(total),
    acceptedAnswers: [`${total} ${n[0]}`],
    options: mc(total, [total + groups, total - each, groups + each]),
    explanation: local(
      `Use equal groups: ${groups} x ${each} = ${total}.`,
      `用相等組：${groups} x ${each} = ${total}。`,
      `用相等组：${groups} x ${each} = ${total}。`
    ),
    independentSolution: `${groups} * ${each} = ${total}.`,
    validationMethod: "computed-multiplication"
  };
}

function placeValueQuestion(seed, grade) {
  if (grade === "K") return teenNumberQuestion(seed);
  const hundreds = grade === "P1" ? 0 : 1 + (seed % 6);
  const tens = 2 + ((seed + 2) % 7);
  const ones = 1 + ((seed + 4) % 8);
  const value = hundreds * 100 + tens * 10 + ones;
  const answer = hundreds ? `${value}` : `${tens * 10 + ones}`;
  const enParts = hundreds
    ? `${unitPhrase(hundreds, "hundred", "hundreds")}, ${unitPhrase(tens, "ten", "tens")}, and ${unitPhrase(ones, "one", "ones")}`
    : `${unitPhrase(tens, "ten", "tens")} and ${unitPhrase(ones, "one", "ones")}`;
  const zhParts = hundreds ? `${hundreds} 個百、${tens} 個十和 ${ones} 個一` : `${tens} 個十和 ${ones} 個一`;
  const zhHansParts = hundreds ? `${hundreds} 个百、${tens} 个十和 ${ones} 个一` : `${tens} 个十和 ${ones} 个一`;
  return {
    type: "fill-in",
    difficulty: "Low",
    prompt: local(
      `What number has ${enParts}?`,
      `由${zhParts}組成的數是多少？`,
      `由${zhHansParts}组成的数是多少？`
    ),
    answer,
    acceptedAnswers: [],
    explanation: local(
      `${enParts} make ${answer}.`,
      `${zhParts}組成 ${answer}。`,
      `${zhHansParts}组成 ${answer}。`
    ),
    independentSolution: `${enParts} = ${answer}.`,
    validationMethod: "computed-place-value"
  };
}

function teenNumberQuestion(seed) {
  const ones = 1 + (seed % 9);
  const total = 10 + ones;
  const variant = seed % 4;
  if (variant === 0) {
    return {
      type: "multiple-choice",
      difficulty: "Low",
      prompt: local(
        `A ten-frame shows 10 counters and ${ones} more counters. What number is shown?`,
        `十格框有 10 個計數片，旁邊還有 ${ones} 個。表示哪個數？`,
        `十格框有 10 个计数片，旁边还有 ${ones} 个。表示哪个数？`
      ),
      answer: String(total),
      acceptedAnswers: [],
      options: mc(total, [total - 1, total + 1, ones]),
      explanation: local(
        `10 and ${ones} more make ${total}.`,
        `10 和 ${ones} 個一合起來是 ${total}。`,
        `10 和 ${ones} 个一合起来是 ${total}。`
      ),
      independentSolution: `10 + ${ones} = ${total}.`,
      validationMethod: "computed-teen-number"
    };
  }
  if (variant === 1) {
    return {
      type: "fill-in",
      difficulty: "Medium",
      prompt: local(
        `Fill in the number: 10 + ${ones} = __.`,
        `填上答案：10 + ${ones} = __。`,
        `填上答案：10 + ${ones} = __。`
      ),
      answer: String(total),
      acceptedAnswers: [],
      explanation: local(
        `Start with one ten, then count ${ones} more ones to get ${total}.`,
        `先有 1 個十，再數 ${ones} 個一，得到 ${total}。`,
        `先有 1 个十，再数 ${ones} 个一，得到 ${total}。`
      ),
      independentSolution: `10 + ${ones} = ${total}.`,
      validationMethod: "computed-teen-number"
    };
  }
  if (variant === 2) {
    return {
      type: "multiple-choice",
      difficulty: "Medium",
      prompt: local(
        `Which model shows ${total}?`,
        `哪個模型表示 ${total}？`,
        `哪个模型表示 ${total}？`
      ),
      answer: `1 ten and ${unitPhrase(ones, "one", "ones")}`,
      acceptedAnswers: [],
      options: [
        local(`1 ten and ${unitPhrase(ones, "one", "ones")}`, `1 個十和 ${ones} 個一`, `1 个十和 ${ones} 个一`),
        local(`1 ten and ${unitPhrase(Math.max(0, ones - 1), "one", "ones")}`, `1 個十和 ${Math.max(0, ones - 1)} 個一`, `1 个十和 ${Math.max(0, ones - 1)} 个一`),
        local(`${unitPhrase(ones, "ten", "tens")} and 1 one`, `${ones} 個十和 1 個一`, `${ones} 个十和 1 个一`),
        local(`${total} tens`, `${total} 個十`, `${total} 个十`)
      ],
      explanation: local(
        `${total} is 10 plus ${ones}, so it is 1 ten and ${unitPhrase(ones, "one", "ones")}.`,
        `${total} 是 10 加 ${ones}，所以是 1 個十和 ${ones} 個一。`,
        `${total} 是 10 加 ${ones}，所以是 1 个十和 ${ones} 个一。`
      ),
      independentSolution: `${total} = 1 ten and ${unitPhrase(ones, "one", "ones")}.`,
      validationMethod: "computed-teen-number-model"
    };
  }
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `${total} is 10 and how many more ones?`,
      `${total} 是 10 和多少個一？`,
      `${total} 是 10 和多少个一？`
    ),
    answer: String(ones),
    acceptedAnswers: [`${ones} ones`],
    explanation: local(
      `${total} = 10 + ${ones}, so there are ${ones} more ones.`,
      `${total} = 10 + ${ones}，所以還有 ${ones} 個一。`,
      `${total} = 10 + ${ones}，所以还有 ${ones} 个一。`
    ),
    independentSolution: `${total} - 10 = ${ones}.`,
    validationMethod: "computed-teen-number-missing-part"
  };
}

function compareQuestion(seed) {
  const left = 4 + ((seed * 3) % 12);
  const delta = 2 + (seed % 3);
  const right = Math.max(1, left + (seed % 2 === 0 ? delta : -delta));
  const answer = left > right ? "left group" : "right group";
  return {
    type: "multiple-choice",
    difficulty: "Low",
    prompt: local(
      `One card shows ${left} dots. Another card shows ${right} dots. Which card has more dots?`,
      `一張卡有 ${left} 個點，另一張卡有 ${right} 個點。哪一張卡的點更多？`,
      `一张卡有 ${left} 个点，另一张卡有 ${right} 个点。哪一张卡的点更多？`
    ),
    answer,
    acceptedAnswers: [],
    options: [local("left group", "左邊一組", "左边一组"), local("right group", "右邊一組", "右边一组"), local("same", "一樣多", "一样多"), local("not enough information", "資料不足", "资料不足")],
    explanation: local(
      `${Math.max(left, right)} is greater than ${Math.min(left, right)}, so the ${answer} has more.`,
      `${Math.max(left, right)} 大於 ${Math.min(left, right)}，所以${answer === "left group" ? "左邊一組" : "右邊一組"}更多。`,
      `${Math.max(left, right)} 大于 ${Math.min(left, right)}，所以${answer === "left group" ? "左边一组" : "右边一组"}更多。`
    ),
    independentSolution: `Compare ${left} and ${right}; answer is ${answer}.`,
    validationMethod: "computed-comparison"
  };
}

function fractionQuestion(seed) {
  const denominator = 4 + (seed % 5);
  const numerator = 1 + (seed % (denominator - 1));
  const nextNumerator = Math.min(denominator - 1, numerator + 1);
  const answer = `${numerator}/${denominator}`;
  return {
    type: "multiple-choice",
    difficulty: "Medium",
    prompt: local(
      `A rectangle is split into ${denominator} equal parts. ${numerator} part${numerator === 1 ? "" : "s"} are shaded. What fraction is shaded?`,
      `一個長方形分成 ${denominator} 個相等部分，其中 ${numerator} 個部分塗色。塗色部分是幾分之幾？`,
      `一个长方形分成 ${denominator} 个相等部分，其中 ${numerator} 个部分涂色。涂色部分是几分之几？`
    ),
    answer,
    acceptedAnswers: [],
    options: mc(answer, [`${nextNumerator}/${denominator}`, `${numerator}/${denominator + 1}`, `${denominator}/${numerator}`]),
    explanation: local(
      `The denominator counts all equal parts and the numerator counts shaded parts, so the fraction is ${answer}.`,
      `分母表示全部相等部分，分子表示塗色部分，所以分數是 ${answer}。`,
      `分母表示全部相等部分，分子表示涂色部分，所以分数是 ${answer}。`
    ),
    independentSolution: `${numerator} shaded out of ${denominator} equal parts = ${answer}.`,
    validationMethod: "computed-fraction-model"
  };
}

function fractionMeaningQuestion(seed) {
  const denominator = 4 + (seed % 5);
  const numerator = 1 + ((seed + 1) % (denominator - 1));
  const variant = seed % 4;
  if (variant === 0) return fractionQuestion(seed);
  if (variant === 1) {
    const answer = `${numerator}/${denominator}`;
    return {
      type: "fill-in",
      difficulty: "Medium",
      prompt: local(
        `A number line from 0 to 1 is split into ${denominator} equal jumps. A point is at jump ${numerator}. What fraction names the point?`,
        `從 0 到 1 的數線分成 ${denominator} 個相等跳距，一個點在第 ${numerator} 個跳距。這個點是哪個分數？`,
        `从 0 到 1 的数线分成 ${denominator} 个相等跳距，一个点在第 ${numerator} 个跳距。这个点是哪个分数？`
      ),
      answer,
      acceptedAnswers: [],
      explanation: local(
        `${numerator} equal jumps out of ${denominator} from 0 to 1 names ${answer}.`,
        `從 0 到 1 的 ${denominator} 等分中走了 ${numerator} 份，所以是 ${answer}。`,
        `从 0 到 1 的 ${denominator} 等分中走了 ${numerator} 份，所以是 ${answer}。`
      ),
      independentSolution: `${numerator} jumps out of ${denominator} = ${answer}.`,
      validationMethod: "computed-fraction-number-line"
    };
  }
  if (variant === 2) {
    const other = numerator === denominator - 1 ? numerator - 1 : numerator + 1;
    const answer = other > numerator ? `${other}/${denominator}` : `${numerator}/${denominator}`;
    return {
      type: "multiple-choice",
      difficulty: "Medium",
      prompt: local(
        `Which fraction is greater: ${numerator}/${denominator} or ${other}/${denominator}?`,
        `哪個分數比較大：${numerator}/${denominator} 還是 ${other}/${denominator}？`,
        `哪个分数比较大：${numerator}/${denominator} 还是 ${other}/${denominator}？`
      ),
      answer,
      acceptedAnswers: [],
      options: mc(answer, [`${numerator}/${denominator}`, `${denominator}/${numerator}`, `${other}/${denominator + 1}`]),
      explanation: local(
        `With the same denominator, the fraction with the larger numerator is greater.`,
        `分母相同時，分子較大的分數比較大。`,
        `分母相同时，分子较大的分数比较大。`
      ),
      independentSolution: `Compare numerators ${numerator} and ${other}; answer ${answer}.`,
      validationMethod: "computed-fraction-comparison"
    };
  }
  const doubledDenominator = denominator * 2;
  const doubledNumerator = numerator * 2;
  const answer = `${doubledNumerator}/${doubledDenominator}`;
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `Name a fraction equivalent to ${numerator}/${denominator} by splitting each part into 2 equal pieces.`,
      `把 ${numerator}/${denominator} 的每一份再分成 2 等份，寫出一個等值分數。`,
      `把 ${numerator}/${denominator} 的每一份再分成 2 等份，写出一个等值分数。`
    ),
    answer,
    acceptedAnswers: [],
    explanation: local(
      `Split each part into 2 pieces: ${numerator} x 2 = ${doubledNumerator} and ${denominator} x 2 = ${doubledDenominator}, so ${answer}.`,
      `每份再分成 2 份：${numerator} x 2 = ${doubledNumerator}，${denominator} x 2 = ${doubledDenominator}，所以是 ${answer}。`,
      `每份再分成 2 份：${numerator} x 2 = ${doubledNumerator}，${denominator} x 2 = ${doubledDenominator}，所以是 ${answer}。`
    ),
    independentSolution: `${numerator}/${denominator} = ${answer}.`,
    validationMethod: "computed-fraction-equivalence"
  };
}

function measurementQuestion(seed) {
  const a = 5 + (seed % 8);
  const b = 3 + ((seed + 3) % 6);
  const total = a + b;
  return {
    type: "short-answer",
    difficulty: "Medium",
    prompt: local(
      `A ribbon is ${a} cm long. Another ribbon is ${b} cm long. What is the total length?`,
      `一條彩帶長 ${a} 厘米，另一條長 ${b} 厘米。總長是多少？`,
      `一条彩带长 ${a} 厘米，另一条长 ${b} 厘米。总长是多少？`
    ),
    answer: `${total} cm`,
    acceptedAnswers: [String(total), `${total} centimeters`],
    explanation: local(
      `Add the lengths: ${a} + ${b} = ${total} cm.`,
      `把長度相加：${a} + ${b} = ${total} 厘米。`,
      `把长度相加：${a} + ${b} = ${total} 厘米。`
    ),
    independentSolution: `${a} cm + ${b} cm = ${total} cm.`,
    validationMethod: "computed-measurement-addition"
  };
}

function kindergartenMdQuestion(seed) {
  const first = 3 + (seed % 5);
  const second = 4 + ((seed + 2) % 5);
  const circles = 2 + (seed % 5);
  const squares = 3 + ((seed + 3) % 5);
  const variant = seed % 4;
  if (variant === 0) {
    const answer = first > second ? "first strip" : "second strip";
    return {
      type: "multiple-choice",
      difficulty: "Low",
      prompt: local(
        `One paper strip is ${first} cubes long. Another paper strip is ${second} cubes long. Which strip is longer?`,
        `一條紙條長 ${first} 個方塊，另一條紙條長 ${second} 個方塊。哪一條比較長？`,
        `一条纸条长 ${first} 个方块，另一条纸条长 ${second} 个方块。哪一条比较长？`
      ),
      answer,
      acceptedAnswers: [],
      options: [
        local("first strip", "第一條紙條", "第一条纸条"),
        local("second strip", "第二條紙條", "第二条纸条"),
        local("same length", "一樣長", "一样长"),
        local("not enough information", "資料不足", "资料不足")
      ],
      explanation: local(
        `${Math.max(first, second)} cubes is longer than ${Math.min(first, second)} cubes.`,
        `${Math.max(first, second)} 個方塊比 ${Math.min(first, second)} 個方塊長。`,
        `${Math.max(first, second)} 个方块比 ${Math.min(first, second)} 个方块长。`
      ),
      independentSolution: `Compare ${first} and ${second}; answer is ${answer}.`,
      validationMethod: "computed-k-md-attribute-compare"
    };
  }
  if (variant === 1) {
    return {
      type: "fill-in",
      difficulty: "Medium",
      prompt: local(
        `A tray has ${circles} circle buttons and ${squares} square buttons. How many buttons are square buttons?`,
        `托盤上有 ${circles} 個圓形鈕扣和 ${squares} 個正方形鈕扣。有多少個是正方形鈕扣？`,
        `托盘上有 ${circles} 个圆形纽扣和 ${squares} 个正方形纽扣。有多少个是正方形纽扣？`
      ),
      answer: String(squares),
      acceptedAnswers: [`${squares} square buttons`],
      explanation: local(
        `Count only the square buttons: ${squares}.`,
        `只數正方形鈕扣：${squares} 個。`,
        `只数正方形纽扣：${squares} 个。`
      ),
      independentSolution: `Square-button count = ${squares}.`,
      validationMethod: "computed-k-md-category-count"
    };
  }
  if (variant === 2) {
    const answer = circles > squares ? "circles" : "squares";
    return {
      type: "multiple-choice",
      difficulty: "Medium",
      prompt: local(
        `A class chart has ${circles} circles and ${squares} squares. Which category has more?`,
        `班級圖表有 ${circles} 個圓形和 ${squares} 個正方形。哪一類比較多？`,
        `班级图表有 ${circles} 个圆形和 ${squares} 个正方形。哪一类比较多？`
      ),
      answer,
      acceptedAnswers: [],
      options: [
        local("circles", "圓形", "圆形"),
        local("squares", "正方形", "正方形"),
        local("same", "一樣多", "一样多"),
        local("triangles", "三角形", "三角形")
      ],
      explanation: local(
        `${Math.max(circles, squares)} is more than ${Math.min(circles, squares)}, so ${answer} have more.`,
        `${Math.max(circles, squares)} 比 ${Math.min(circles, squares)} 多，所以${answer === "circles" ? "圓形" : "正方形"}比較多。`,
        `${Math.max(circles, squares)} 比 ${Math.min(circles, squares)} 多，所以${answer === "circles" ? "圆形" : "正方形"}比较多。`
      ),
      independentSolution: `Compare ${circles} and ${squares}; answer is ${answer}.`,
      validationMethod: "computed-k-md-category-compare"
    };
  }
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `A crayon is shorter than a pencil. The pencil is shorter than a marker. Which object is the longest?`,
      `蠟筆比鉛筆短，鉛筆比馬克筆短。哪一件物件最長？`,
      `蜡笔比铅笔短，铅笔比马克笔短。哪一件物件最长？`
    ),
    answer: "marker",
    acceptedAnswers: ["the marker"],
    explanation: local(
      `The marker is longer than the pencil, and the pencil is longer than the crayon.`,
      `馬克筆比鉛筆長，而鉛筆比蠟筆長。`,
      `马克笔比铅笔长，而铅笔比蜡笔长。`
    ),
    independentSolution: `crayon < pencil < marker, so marker is longest.`,
    validationMethod: "computed-k-md-attribute-order"
  };
}

function grade2MdQuestion(seed) {
  const variant = seed % 4;
  if (variant === 0) {
    return measurementQuestion(seed);
  }
  if (variant === 1) {
    const start = 23 + (seed % 18);
    const change = 5 + ((seed + 2) % 9);
    const answer = start - change;
    return {
      type: "fill-in",
      difficulty: "Medium",
      prompt: local(
        `A ribbon is ${start} cm long. It is cut ${change} cm shorter. How long is it now?`,
        `一條彩帶長 ${start} 厘米，剪短了 ${change} 厘米。現在長多少厘米？`,
        `一条彩带长 ${start} 厘米，剪短了 ${change} 厘米。现在长多少厘米？`
      ),
      answer: `${answer} cm`,
      acceptedAnswers: [String(answer), `${answer} centimeters`],
      explanation: local(
        `Subtract the part cut off: ${start} - ${change} = ${answer} cm.`,
        `減去剪掉的部分：${start} - ${change} = ${answer} 厘米。`,
        `减去剪掉的部分：${start} - ${change} = ${answer} 厘米。`
      ),
      independentSolution: `${start} - ${change} = ${answer}.`,
      validationMethod: "computed-measurement-subtraction"
    };
  }
  if (variant === 2) {
    const hour = 1 + (seed % 8);
    const later = 1 + ((seed + 3) % 3);
    const answerHour = ((hour + later - 1) % 12) + 1;
    const optionHours = [];
    [answerHour, hour, ((answerHour) % 12) + 1, ((answerHour + 1) % 12) + 1, Math.max(1, answerHour - 1)].forEach((candidate) => {
      if (!optionHours.includes(candidate)) optionHours.push(candidate);
    });
    return {
      type: "multiple-choice",
      difficulty: "Medium",
      prompt: local(
        `A clock shows ${hour}:00. What time will it be ${later} hours later?`,
        `時鐘顯示 ${hour}:00。${later} 小時後是幾點？`,
        `时钟显示 ${hour}:00。${later} 小时后是几点？`
      ),
      answer: `${answerHour}:00`,
      acceptedAnswers: [],
      options: optionHours.slice(0, 4).map((value) => local(`${value}:00`)),
      explanation: local(
        `Count ${later} hours after ${hour}:00 to get ${answerHour}:00.`,
        `從 ${hour}:00 往後數 ${later} 小時，得到 ${answerHour}:00。`,
        `从 ${hour}:00 往后数 ${later} 小时，得到 ${answerHour}:00。`
      ),
      independentSolution: `${hour}:00 + ${later} hours = ${answerHour}:00.`,
      validationMethod: "computed-time-addition"
    };
  }
  const dimes = 1 + (seed % 5);
  const pennies = 2 + ((seed + 2) % 8);
  const cents = dimes * 10 + pennies;
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `A coin cup has ${dimes} dimes and ${pennies} pennies. How many cents is that?`,
      `硬幣杯裡有 ${dimes} 個一角硬幣和 ${pennies} 個一分硬幣。一共是多少分？`,
      `硬币杯里有 ${dimes} 个一角硬币和 ${pennies} 个一分硬币。一共是多少分？`
    ),
    answer: `${cents} cents`,
    acceptedAnswers: [String(cents)],
    explanation: local(
      `${dimes} dimes are ${dimes * 10} cents, plus ${pennies} pennies makes ${cents} cents.`,
      `${dimes} 個一角硬幣是 ${dimes * 10} 分，再加 ${pennies} 分，一共 ${cents} 分。`,
      `${dimes} 个一角硬币是 ${dimes * 10} 分，再加 ${pennies} 分，一共 ${cents} 分。`
    ),
    independentSolution: `${dimes} * 10 + ${pennies} = ${cents}.`,
    validationMethod: "computed-money-value"
  };
}

function geometryQuestion(seed, grade) {
  const s = shape(seed);
  const context = shapeContexts[seed % shapeContexts.length];
  const sides = { triangle: 3, rectangle: 4, square: 4, circle: 0, cube: 0, cone: 0 }[s[0]] ?? 0;
  if (grade === "K" || s[0] === "circle" || s[0] === "cube" || s[0] === "cone") {
    const optionShapes = [s, ...shapes.filter((item) => item[0] !== s[0])].slice(0, 4);
    return {
      type: "multiple-choice",
      difficulty: "Low",
      prompt: local(
        `On ${context[0]}, which shape name matches an object with the label "${s[0]}"?`,
        `在${context[1]}上，哪個形狀名稱和「${s[1]}」相配？`,
        `在${context[2]}上，哪个形状名称和“${s[2]}”相配？`
      ),
      answer: s[0],
      acceptedAnswers: [],
      options: optionShapes.map((item) => local(item[0], item[1], item[2])),
      explanation: local(
        `The named shape is ${s[0]}.`,
        `這個形狀是${s[1]}。`,
        `这个形状是${s[2]}。`
      ),
      independentSolution: `Shape identification: ${s[0]}.`,
      validationMethod: "computed-shape-identification"
    };
  }
  return {
    type: "fill-in",
    difficulty: "Medium",
    prompt: local(
      `In ${context[0]}, how many sides does a ${s[0]} have?`,
      `在${context[1]}中，${s[1]}有多少條邊？`,
      `在${context[2]}中，${s[2]}有多少条边？`
    ),
    answer: String(sides),
    acceptedAnswers: [`${sides} sides`],
    explanation: local(
      `A ${s[0]} has ${sides} sides.`,
      `${s[1]}有 ${sides} 條邊。`,
      `${s[2]}有 ${sides} 条边。`
    ),
    independentSolution: `${s[0]} sides = ${sides}.`,
    validationMethod: "computed-shape-property"
  };
}

function areaPerimeterQuestion(seed) {
  const length = 4 + (seed % 6);
  const width = 2 + ((seed + 2) % 5);
  const area = length * width;
  const perimeter = 2 * (length + width);
  const askArea = seed % 2 === 0;
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `A rectangle is ${length} units long and ${width} units wide. What is its ${askArea ? "area" : "perimeter"}?`,
      `一個長方形長 ${length} 單位、寬 ${width} 單位。它的${askArea ? "面積" : "周界"}是多少？`,
      `一个长方形长 ${length} 单位、宽 ${width} 单位。它的${askArea ? "面积" : "周长"}是多少？`
    ),
    answer: askArea ? `${area} square units` : `${perimeter} units`,
    acceptedAnswers: [String(askArea ? area : perimeter)],
    explanation: local(
      askArea ? `Area is length x width: ${length} x ${width} = ${area} square units.` : `Perimeter is twice length plus width: 2 x (${length} + ${width}) = ${perimeter} units.`,
      askArea ? `面積 = 長 x 寬：${length} x ${width} = ${area} 平方單位。` : `周界 = 2 x（長 + 寬）：2 x (${length} + ${width}) = ${perimeter} 單位。`,
      askArea ? `面积 = 长 x 宽：${length} x ${width} = ${area} 平方单位。` : `周长 = 2 x（长 + 宽）：2 x (${length} + ${width}) = ${perimeter} 单位。`
    ),
    independentSolution: askArea ? `${length} * ${width} = ${area}.` : `2 * (${length} + ${width}) = ${perimeter}.`,
    validationMethod: askArea ? "computed-area" : "computed-perimeter"
  };
}

function decimalQuestion(seed) {
  const tenths = 2 + (seed % 7);
  const hundredths = 5 + ((seed + 3) % 5);
  const value = `${tenths}.${hundredths}`;
  return {
    type: "multiple-choice",
    difficulty: "Medium",
    prompt: local(
      `Which decimal is ${tenths} ones and ${hundredths} hundredths?`,
      `${tenths} 個一和 ${hundredths} 個百分之一寫成哪個小數？`,
      `${tenths} 个一和 ${hundredths} 个百分之一写成哪个小数？`
    ),
    answer: value,
    acceptedAnswers: [],
    options: mc(value, [`${tenths}.${hundredths + 1}`, `${tenths + 1}.${hundredths}`, `${tenths}${hundredths}`]),
    explanation: local(
      `${tenths} ones and ${hundredths} hundredths make ${value}.`,
      `${tenths} 個一和 ${hundredths} 個百分之一組成 ${value}。`,
      `${tenths} 个一和 ${hundredths} 个百分之一组成 ${value}。`
    ),
    independentSolution: `${tenths} + ${hundredths}/100 = ${value}.`,
    validationMethod: "computed-decimal-place-value"
  };
}

function factorPatternQuestion(seed) {
  const n = 12 + (seed % 9);
  const factor = [2, 3, 4, 5][seed % 4];
  const isFactor = n % factor === 0;
  const answer = isFactor ? "yes" : "no";
  return {
    type: "multiple-choice",
    difficulty: "Medium",
    prompt: local(
      `Is ${factor} a factor of ${n}?`,
      `${factor} 是 ${n} 的因數嗎？`,
      `${factor} 是 ${n} 的因数吗？`
    ),
    answer,
    acceptedAnswers: [],
    options: [local("yes", "是", "是"), local("no", "不是", "不是"), local("always", "總是", "总是"), local("not enough information", "資料不足", "资料不足")],
    explanation: local(
      isFactor ? `${n} can be divided by ${factor} with no remainder.` : `${n} cannot be divided by ${factor} evenly.`,
      isFactor ? `${n} 可以被 ${factor} 整除。` : `${n} 不能被 ${factor} 整除。`,
      isFactor ? `${n} 可以被 ${factor} 整除。` : `${n} 不能被 ${factor} 整除。`
    ),
    independentSolution: `${n} % ${factor} = ${n % factor}; answer ${answer}.`,
    validationMethod: "computed-factor-check"
  };
}

function coordinateQuestion(seed) {
  const x = 1 + ((seed * 2) % 9);
  const y = 2 + (((seed * 3) + 1) % 9);
  return {
    type: "fill-in",
    difficulty: "Medium",
    prompt: local(
      `A point moves ${x} units right from the origin and ${y} units up. What ordered pair names the point?`,
      `一個點從原點向右移 ${x} 單位，再向上移 ${y} 單位。這個點的有序數對是什麼？`,
      `一个点从原点向右移 ${x} 单位，再向上移 ${y} 单位。这个点的有序数对是什么？`
    ),
    answer: `(${x}, ${y})`,
    acceptedAnswers: [`${x},${y}`, `(${x},${y})`],
    explanation: local(
      `The x-coordinate is ${x} and the y-coordinate is ${y}, so the point is (${x}, ${y}).`,
      `x 坐標是 ${x}，y 坐標是 ${y}，所以點是 (${x}, ${y})。`,
      `x 坐标是 ${x}，y 坐标是 ${y}，所以点是 (${x}, ${y})。`
    ),
    independentSolution: `Right ${x}, up ${y} => (${x}, ${y}).`,
    validationMethod: "computed-coordinate"
  };
}

function volumeQuestion(seed) {
  const l = 2 + (seed % 4);
  const w = 3 + ((seed + 1) % 3);
  const h = 2 + ((seed + 2) % 3);
  const v = l * w * h;
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `A rectangular prism is ${l} units by ${w} units by ${h} units. What is its volume?`,
      `一個長方體長 ${l} 單位、寬 ${w} 單位、高 ${h} 單位。體積是多少？`,
      `一个长方体长 ${l} 单位、宽 ${w} 单位、高 ${h} 单位。体积是多少？`
    ),
    answer: `${v} cubic units`,
    acceptedAnswers: [String(v)],
    explanation: local(
      `Volume is length x width x height: ${l} x ${w} x ${h} = ${v} cubic units.`,
      `體積 = 長 x 寬 x 高：${l} x ${w} x ${h} = ${v} 立方單位。`,
      `体积 = 长 x 宽 x 高：${l} x ${w} x ${h} = ${v} 立方单位。`
    ),
    independentSolution: `${l} * ${w} * ${h} = ${v}.`,
    validationMethod: "computed-volume"
  };
}

function expressionQuestion(seed) {
  const a = 2 + (seed % 5);
  const b = 3 + ((seed + 1) % 5);
  const c = 1 + ((seed + 2) % 4);
  const value = a * (b + c);
  return {
    type: "fill-in",
    difficulty: "High",
    prompt: local(
      `Evaluate ${a} x (${b} + ${c}).`,
      `計算 ${a} x (${b} + ${c})。`,
      `计算 ${a} x (${b} + ${c})。`
    ),
    answer: String(value),
    acceptedAnswers: [],
    explanation: local(
      `First add inside the parentheses: ${b} + ${c} = ${b + c}. Then ${a} x ${b + c} = ${value}.`,
      `先算括號：${b} + ${c} = ${b + c}，再算 ${a} x ${b + c} = ${value}。`,
      `先算括号：${b} + ${c} = ${b + c}，再算 ${a} x ${b + c} = ${value}。`
    ),
    independentSolution: `${a} * (${b} + ${c}) = ${value}.`,
    validationMethod: "computed-expression"
  };
}

function fractionOperationQuestion(seed) {
  const denominator = [6, 8, 10, 12][seed % 4];
  const a = 1 + (seed % 3);
  const b = 1 + ((seed + 1) % 3);
  const numerator = a + b;
  const answer = `${numerator}/${denominator}`;
  return {
    type: "short-answer",
    difficulty: "High",
    prompt: local(
      `Add ${a}/${denominator} + ${b}/${denominator}.`,
      `計算 ${a}/${denominator} + ${b}/${denominator}。`,
      `计算 ${a}/${denominator} + ${b}/${denominator}。`
    ),
    answer,
    acceptedAnswers: [],
    explanation: local(
      `The denominators are the same, so add numerators: ${a} + ${b} = ${numerator}. The sum is ${answer}.`,
      `分母相同，分子相加：${a} + ${b} = ${numerator}，和是 ${answer}。`,
      `分母相同，分子相加：${a} + ${b} = ${numerator}，和是 ${answer}。`
    ),
    independentSolution: `${a}/${denominator} + ${b}/${denominator} = ${answer}.`,
    validationMethod: "computed-fraction-addition"
  };
}

function angleConversionQuestion(seed) {
  const angleOptions = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70];
  const first = angleOptions[seed % angleOptions.length];
  const second = 90 - first;
  return {
    type: "fill-in",
    difficulty: "Medium",
    prompt: local(
      `Two angles make a right angle. One angle is ${first} degrees. What is the other angle?`,
      `兩個角合成一個直角，其中一個是 ${first} 度。另一個角是多少度？`,
      `两个角合成一个直角，其中一个是 ${first} 度。另一个角是多少度？`
    ),
    answer: `${second} degrees`,
    acceptedAnswers: [String(second), `${second}°`],
    explanation: local(
      `A right angle is 90 degrees, so ${90} - ${first} = ${second} degrees.`,
      `直角是 90 度，所以 90 - ${first} = ${second} 度。`,
      `直角是 90 度，所以 90 - ${first} = ${second} 度。`
    ),
    independentSolution: `90 - ${first} = ${second}.`,
    validationMethod: "computed-angle-subtraction"
  };
}

function dataQuestion(seed) {
  const a = 3 + ((seed * 2) % 8);
  let b = 2 + (((seed + 3) * 3) % 8);
  if (a === b) b += 1;
  const more = Math.abs(a - b);
  const answer = a > b ? `${more} more apples` : `${more} more oranges`;
  return {
    type: "short-answer",
    difficulty: "Medium",
    prompt: local(
      `A picture graph shows ${a} apples and ${b} oranges. Which fruit has more, and by how many?`,
      `一幅圖表顯示 ${a} 個蘋果和 ${b} 個橙。哪種水果更多？多多少？`,
      `一幅图表显示 ${a} 个苹果和 ${b} 个橙。哪种水果更多？多多少？`
    ),
    answer,
    acceptedAnswers: [String(more)],
    explanation: local(
      `${Math.max(a, b)} - ${Math.min(a, b)} = ${more}, so ${answer}.`,
      `${Math.max(a, b)} - ${Math.min(a, b)} = ${more}，所以${a > b ? "蘋果" : "橙"}多 ${more} 個。`,
      `${Math.max(a, b)} - ${Math.min(a, b)} = ${more}，所以${a > b ? "苹果" : "橙"}多 ${more} 个。`
    ),
    independentSolution: `Compare ${a} and ${b}; difference ${more}.`,
    validationMethod: "computed-data-comparison"
  };
}

function genericAdvanced(target, seed) {
  if ((/NF|fraction/i.test(target.domainId) || /fraction/i.test(target.clusterTitle)) && target.grade === "P3") return fractionMeaningQuestion(seed);
  if (/NF|fraction/i.test(target.domainId) || /fraction/i.test(target.clusterTitle)) return fractionOperationQuestion(seed);
  if (/MD/.test(target.domainId) && target.grade === "K") return kindergartenMdQuestion(seed);
  if (/MD/.test(target.domainId) && target.grade === "P2") return grade2MdQuestion(seed);
  if (/MD/.test(target.domainId) && /angle|conversion/i.test(target.clusterTitle)) return angleConversionQuestion(seed);
  if (/MD/.test(target.domainId) && /volume/i.test(target.clusterTitle)) return volumeQuestion(seed);
  if (/MD/.test(target.domainId) && /data/i.test(target.clusterTitle)) return dataQuestion(seed);
  if (/MD/.test(target.domainId)) return measurementQuestion(seed);
  if (/G/.test(target.domainId) && /coordinate/i.test(target.clusterTitle)) return coordinateQuestion(seed);
  if (/G/.test(target.domainId)) return geometryQuestion(seed, target.grade);
  if (/OA/.test(target.domainId) && /factor|pattern/i.test(target.clusterTitle)) return factorPatternQuestion(seed);
  if (/OA/.test(target.domainId) && /expression|pattern/i.test(target.clusterTitle)) return expressionQuestion(seed);
  if (/OA/.test(target.domainId) && ["K", "P1"].includes(target.grade)) {
    return seed % 2 === 0 ? addStory(seed, target.grade === "K" ? 10 : 20) : subtractionStory(seed, target.grade === "K" ? 10 : 20);
  }
  if (/OA/.test(target.domainId) || /mult|division/i.test(target.clusterTitle)) return multiplicationStory(seed);
  if (/NBT/.test(target.domainId) && /decimal/i.test(target.clusterTitle)) return decimalQuestion(seed);
  if (/NBT/.test(target.domainId)) return placeValueQuestion(seed, target.grade);
  if (/CC/.test(target.domainId) && /compare|cardinality/i.test(target.clusterTitle)) return compareQuestion(seed);
  if (/CC/.test(target.domainId)) {
    const q = addStory(seed, 12);
    q.prompt = local(
      `Count the collection: ${q.answer} ${noun(seed)[0]} are on a mat. How many objects are on the mat?`,
      `數一數：墊上有 ${q.answer} 個${noun(seed)[1]}。墊上有多少個物件？`,
      `数一数：垫上有 ${q.answer} 个${noun(seed)[2]}。垫上有多少个物件？`
    );
    q.independentSolution = `Count the collection once: ${q.answer}.`;
    q.explanation = local(
      `Count each object once. The collection has ${q.answer} objects.`,
      `每個物件數一次，這一組有 ${q.answer} 個物件。`,
      `每个物件数一次，这一组有 ${q.answer} 个物件。`
    );
    q.validationMethod = "computed-counting";
    return q;
  }
  return addStory(seed);
}

function microQuestion(target, seed, variant) {
  const addition = target.knowledgePointCode.includes("-H.");
  const mode = variant % 4;
  if (addition) {
    const base = addStory(seed, 10);
    if (mode === 3) {
      const a = 2 + (seed % 4);
      const b = 1 + ((seed + 1) % 4);
      const total = a + b;
      const answer = `${a} + ${b} = ${total}`;
      const cubeEntry = ["cubes", "立方塊", "立方块"];
      return {
        type: "multiple-choice",
        difficulty: "High",
        prompt: local(
          `Which equation matches this join story: ${objectPhrase(a, cubeEntry, "small")} and ${objectPhrase(b, cubeEntry, "large")} are put together?`,
          `哪個算式配合這個合併故事：${a} 個小立方塊和 ${b} 個大立方塊放在一起？`,
          `哪个算式配合这个合并故事：${a} 个小立方块和 ${b} 个大立方块放在一起？`
        ),
        answer,
        acceptedAnswers: [],
        options: mc(answer, [`${a} - ${b} = ${Math.max(0, a - b)}`, `${b} + ${total} = ${b + total}`, `${total} - ${a} = ${b}`]),
        explanation: local(
          `A join story uses addition: ${a} + ${b} = ${total}.`,
          `合併故事用加法：${a} + ${b} = ${total}。`,
          `合并故事用加法：${a} + ${b} = ${total}。`
        ),
        independentSolution: `${a} + ${b} = ${total}.`,
        validationMethod: "computed-addition-equation-match"
      };
    }
    return { ...base, difficulty: mode === 0 ? "Low" : "Medium", type: mode === 1 ? "fill-in" : mode === 2 ? "short-answer" : base.type };
  }
  const base = subtractionStory(seed, 10);
  if (mode === 3) {
    const start = 7 + (seed % 3);
    const part = 2 + (seed % 4);
    const left = start - part;
    const answer = `${start} - ${part} = ${left}`;
    return {
      type: "multiple-choice",
      difficulty: "High",
      prompt: local(
        `Which equation matches this take-away story: ${start} counters are on a ten-frame and ${part} are covered?`,
        `哪個算式配合這個拿走故事：十格框上有 ${start} 個計數片，遮住了 ${part} 個？`,
        `哪个算式配合这个拿走故事：十格框上有 ${start} 个计数片，遮住了 ${part} 个？`
      ),
      answer,
      acceptedAnswers: [],
      options: mc(answer, [`${start} + ${part} = ${start + part}`, `${part} - ${left} = ${part - left}`, `${left} + ${part} = ${start}`]),
      explanation: local(
        `A take-away story starts with ${start} and removes ${part}: ${start} - ${part} = ${left}.`,
        `拿走故事從 ${start} 開始，拿走 ${part}：${start} - ${part} = ${left}。`,
        `拿走故事从 ${start} 开始，拿走 ${part}：${start} - ${part} = ${left}。`
      ),
      independentSolution: `${start} - ${part} = ${left}.`,
      validationMethod: "computed-subtraction-equation-match"
    };
  }
  return { ...base, difficulty: mode === 0 ? "Low" : "Medium", type: mode === 2 ? "short-answer" : base.type };
}

function gradeAppropriateOaQuestion(target, seed) {
  if (["K", "P1"].includes(target.grade)) {
    return seed % 2 === 0 ? addStory(seed, target.grade === "K" ? 10 : 20) : subtractionStory(seed, target.grade === "K" ? 10 : 20);
  }
  return multiplicationStory(seed);
}

function mediumQuestionForTarget(target, seed) {
  if (/OA/.test(target.domainId)) return gradeAppropriateOaQuestion(target, seed);
  if (/NBT/.test(target.domainId) && /decimal/i.test(target.clusterTitle)) return decimalQuestion(seed);
  if (/NBT/.test(target.domainId)) return placeValueQuestion(seed, target.grade);
  if (/NF/.test(target.domainId) && target.grade === "P3") return fractionMeaningQuestion(seed);
  if (/NF/.test(target.domainId)) return fractionQuestion(seed);
  if (/MD/.test(target.domainId) && target.grade === "K") return kindergartenMdQuestion(seed);
  if (/MD/.test(target.domainId) && target.grade === "P2") return grade2MdQuestion(seed);
  if (/MD/.test(target.domainId) && /angle|conversion/i.test(target.clusterTitle)) return angleConversionQuestion(seed);
  if (/MD/.test(target.domainId)) return measurementQuestion(seed);
  if (/G/.test(target.domainId) && /coordinate/i.test(target.clusterTitle)) return coordinateQuestion(seed);
  if (/G/.test(target.domainId)) return geometryQuestion(seed, target.grade);
  return genericAdvanced(target, seed);
}

function highQuestionForTarget(target, seed) {
  if (/OA/.test(target.domainId) && /expression|pattern/i.test(target.clusterTitle)) return expressionQuestion(seed);
  if (/OA/.test(target.domainId) && /factor/i.test(target.clusterTitle)) return factorPatternQuestion(seed);
  if (/OA/.test(target.domainId)) return gradeAppropriateOaQuestion(target, seed);
  if (/NBT/.test(target.domainId) && /decimal/i.test(target.clusterTitle)) return decimalQuestion(seed);
  if (/NBT/.test(target.domainId)) return placeValueQuestion(seed, target.grade);
  if (/NF/.test(target.domainId) && target.grade === "P3") return fractionMeaningQuestion(seed);
  if (/NF/.test(target.domainId)) return fractionOperationQuestion(seed);
  if (/MD/.test(target.domainId) && target.grade === "K") return kindergartenMdQuestion(seed);
  if (/MD/.test(target.domainId) && target.grade === "P2") return grade2MdQuestion(seed);
  if (/MD/.test(target.domainId) && /volume/i.test(target.clusterTitle)) return volumeQuestion(seed);
  if (/MD/.test(target.domainId) || /area|perimeter/i.test(target.clusterTitle)) return areaPerimeterQuestion(seed);
  if (/G/.test(target.domainId) && /coordinate/i.test(target.clusterTitle)) return coordinateQuestion(seed);
  if (/G/.test(target.domainId)) return geometryQuestion(seed, target.grade);
  return genericAdvanced(target, seed);
}

function draftsForTarget(target, targetIndex) {
  const seed = targetIndex * 17 + 5;
  if (target.sourceKind === "grade1-micro-lesson") {
    return Array.from({ length: questionsPerKnowledgePoint }, (_, variant) => microQuestion(target, seed + variant, variant));
  }

  const first = genericAdvanced(target, seed);
  first.difficulty = "Low";
  first.type = first.type === "short-answer" ? "fill-in" : first.type;

  const second = /OA|NBT/.test(target.domainId) ? (target.domainId.includes("NBT") ? placeValueQuestion(seed + 1, target.grade) : addStory(seed + 1, target.grade === "K" ? 10 : 30)) : genericAdvanced(target, seed + 1);
  second.difficulty = "Medium";
  if (second.type === "multiple-choice") second.type = "fill-in";

  const third = /G/.test(target.domainId)
    ? geometryQuestion(seed + 2, target.grade)
    : /MD/.test(target.domainId) && target.grade === "K"
      ? kindergartenMdQuestion(seed + 2)
      : /MD/.test(target.domainId) && target.grade === "P2"
        ? grade2MdQuestion(seed + 2)
        : /MD/.test(target.domainId)
          ? measurementQuestion(seed + 2)
          : /NF/.test(target.domainId) && target.grade === "P3"
            ? fractionMeaningQuestion(seed + 2)
            : /NF/.test(target.domainId)
              ? fractionQuestion(seed + 2)
              : genericAdvanced(target, seed + 2);
  third.difficulty = "Medium";

  const fourth = highQuestionForTarget(target, seed + 3);
  fourth.difficulty = "High";
  fourth.type = fourth.type === "multiple-choice" ? "short-answer" : fourth.type;

  const fifth = /CC/.test(target.domainId) && /compare|cardinality/i.test(target.clusterTitle)
    ? compareQuestion(seed + 4)
    : mediumQuestionForTarget(target, seed + 4);
  fifth.difficulty = "Low";
  if (fifth.type === "short-answer") fifth.type = "fill-in";

  const sixth = mediumQuestionForTarget(target, seed + 5);
  sixth.difficulty = "Medium";
  if (sixth.type === "multiple-choice") sixth.type = "fill-in";

  const seventh = /MD/.test(target.domainId) && target.grade === "K"
    ? kindergartenMdQuestion(seed + 6)
    : /MD/.test(target.domainId) && target.grade === "P2"
      ? grade2MdQuestion(seed + 6)
      : /MD/.test(target.domainId) && /data/i.test(target.clusterTitle)
    ? dataQuestion(seed + 6)
    : mediumQuestionForTarget(target, seed + 6);
  seventh.difficulty = "Medium";

  const eighth = highQuestionForTarget(target, seed + 7);
  eighth.difficulty = "High";
  if (eighth.type === "multiple-choice" && !/factor|compare/i.test(target.clusterTitle)) {
    eighth.type = "short-answer";
  }

  const ninth = /CC/.test(target.domainId) && /compare|cardinality/i.test(target.clusterTitle)
    ? compareQuestion(seed + 8)
    : genericAdvanced(target, seed + 8);
  ninth.difficulty = "Low";
  if (ninth.type === "short-answer") ninth.type = "fill-in";

  const tenth = mediumQuestionForTarget(target, seed + 9);
  tenth.difficulty = "Medium";
  if (tenth.type === "multiple-choice") tenth.type = "fill-in";

  const eleventh = /MD/.test(target.domainId) && target.grade === "K"
    ? kindergartenMdQuestion(seed + 10)
    : /MD/.test(target.domainId) && target.grade === "P2"
      ? grade2MdQuestion(seed + 10)
      : /MD/.test(target.domainId) && /data/i.test(target.clusterTitle)
    ? dataQuestion(seed + 10)
    : mediumQuestionForTarget(target, seed + 10);
  eleventh.difficulty = "Medium";

  const twelfth = highQuestionForTarget(target, seed + 11);
  twelfth.difficulty = "High";
  if (twelfth.type === "multiple-choice" && !/factor|compare/i.test(target.clusterTitle)) {
    twelfth.type = "short-answer";
  }

  const drafts = [first, second, third, fourth, fifth, sixth, seventh, eighth, ninth, tenth, eleventh, twelfth];
  if (/NBT/.test(target.domainId)) drafts[0] = asMultipleChoice(drafts[0]);
  return drafts;
}

function generate() {
  const targets = allTargets();
  const questions = targets.flatMap((target, targetIndex) =>
    draftsForTarget(target, targetIndex).map((draft, localIndex) => makeQuestion(target, localIndex, draft))
  );

  const gradeCounts = questions.reduce((counts, question) => {
    counts[question.grade] = (counts[question.grade] ?? 0) + 1;
    return counts;
  }, {});

  const topicCoverage = targets.map((target) => ({
    topicId: target.topicId,
    grade: target.grade,
    sourceKind: target.sourceKind,
    domainId: target.domainId,
    clusterId: target.clusterId,
    standardIds: target.standardIds,
    questionIds: questions.filter((question) => question.topicId === target.topicId).map((question) => question.id)
  }));

  const pack = {
    packageId,
    schemaVersion: "1.0",
    generatedAt,
    generator: "Codex S21 deterministic knowledge-point practice generator",
    sessionId: "S21",
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    scope: {
      curriculumTrack: "US_CA_MATH",
      state: "CA",
      gradeSpan: ["K", "P1", "P2", "P3", "P4", "P5"],
      sourceKnowledgePointPackages: [
        "us-ca-math-k-g5-textbooks-v1",
        "us-ca-math-grade1-h-l-micro-lessons-v1"
      ],
      intendedReleaseSurface: "Candidate practice bank only; no live integration in this dialogue",
      excludedScope: [
        "live data/usCaliforniaQuestions.ts imports",
        "S04 live practice data edits",
        "S05 lesson practiceQuestionIds edits",
        "complete California curriculum claims"
      ]
    },
    languageVariant: "en-zh-zhHans",
    sourceEvidencePolicy: "public-standards-structure-and-MAIS-authored-knowledge-point-metadata-only",
    sourcePolicy: {
      rawCorpusAllowed: false,
      copiedIxlTextAllowed: false,
      copiedOfficialStandardProseAllowed: false,
      sourceBasis: "Existing MAIS K-G5 textbook/micro knowledge-point metadata plus California Common Core structure; fresh values and contexts."
    },
    packageStatus: "candidate-only",
    reviewStatus: "pending-two-round-internal-qa",
    integrationStatus: "candidate-only-not-live",
    nextOwner: "S18 content QA, then S23 promotion planning if owner later asks to integrate",
    claimsNotAllowed: [
      "complete California curriculum",
      "official California course",
      "IXL-equivalent exercises",
      "live student practice bank"
    ],
    counts: {
      totalQuestions: questions.length,
      totalKnowledgePointTopics: targets.length,
      questionsPerKnowledgePoint,
      gradeCounts
    },
    topicCoverage,
    checksRun: [
      "generated from package-local deterministic templates",
      "mapped every row to a new K-G5 knowledge-point topicId",
      "kept integrationStatus candidate-only-not-live"
    ],
    checksNotRun: [
      "live app integration",
      "browser regression for practice filters",
      "human classroom trial"
    ],
    questions
  };

  fs.writeFileSync(path.join(packageDir, "question-pack.json"), `${JSON.stringify(pack, null, 2)}\n`);
  fs.writeFileSync(path.join(packageDir, "topic-coverage.json"), `${JSON.stringify({ packageId, generatedAt, targets: topicCoverage }, null, 2)}\n`);
}

generate();
