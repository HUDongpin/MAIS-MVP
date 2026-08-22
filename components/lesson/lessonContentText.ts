const californiaGradePrefixPattern = /^\s*California\s+(?:(?:Grade\s+(?:K|[0-9]{1,2}))|Kindergarten)\s*[:：]\s*/i;
const californiaKnowledgePointCodePrefixPattern = /^\s*(?:(?:K|\d{1,2})-)?[A-Z]\.\d+\s*/i;
const californiaDisplayGradePrefixPattern = /^\s*(?:Grade\s+(?:K|[0-9]{1,2})|Kindergarten)\s*/i;
const lessonModuleSuffixPattern = /\s*(?:Lesson\s+Module|課節模組|课节模块)\s*$/i;
const revealableAnswerPattern = /(答案\s*[:：]\s*|Answer\s*:\s*)/;
const standaloneReasoningLinePattern = /^(?:Reasoning\s*:|推理\s*[:：])/i;

export type LessonContentSegment =
  | {
      id: string;
      kind: "text";
      text: string;
    }
  | {
      answerText: string;
      id: string;
      kind: "answer";
      promptText: string;
    };

type LessonContentAnswerRevealOptions = {
  revealStandaloneAnswerLines?: boolean;
};

type CaliforniaCourseTitle = {
  en: string;
  zh: string;
  zhHans: string;
};

const californiaCourseTitlesByGrade: Record<string, CaliforniaCourseTitle> = {
  K: {
    en: "Kindergarten Math Explorers",
    zh: "幼稚園數學探索家",
    zhHans: "幼儿园数学探索家"
  },
  P1: {
    en: "First Grade Math Adventures",
    zh: "一年級數學冒險",
    zhHans: "一年级数学冒险"
  },
  P2: {
    en: "Second Grade Math Builders",
    zh: "二年級數學建造者",
    zhHans: "二年级数学建造者"
  },
  P3: {
    en: "Third Grade Math Problem Solvers",
    zh: "三年級數學解題家",
    zhHans: "三年级数学解题家"
  },
  P4: {
    en: "Fourth Grade Math Investigators",
    zh: "四年級數學探究家",
    zhHans: "四年级数学探究家"
  },
  P5: {
    en: "Fifth Grade Math Strategists",
    zh: "五年級數學策略家",
    zhHans: "五年级数学策略家"
  },
  P6: {
    en: "Sixth Grade Math Launchpad",
    zh: "六年級數學啟航站",
    zhHans: "六年级数学启航站"
  },
  S1: {
    en: "Seventh Grade Math Connections",
    zh: "七年級數學連結",
    zhHans: "七年级数学连接"
  },
  S2: {
    en: "Eighth Grade Math Foundations",
    zh: "八年級數學基石",
    zhHans: "八年级数学基石"
  },
  S3: {
    en: "Algebra I Discovery",
    zh: "代數一探索",
    zhHans: "代数一探索"
  },
  S4: {
    en: "Geometry Reasoning Studio",
    zh: "幾何推理工作室",
    zhHans: "几何推理工作室"
  },
  S5: {
    en: "Algebra II Modeling Lab",
    zh: "代數二建模實驗室",
    zhHans: "代数二建模实验室"
  },
  S6: {
    en: "Precalculus and Statistics Pathways",
    zh: "預備微積分與統計路徑",
    zhHans: "预备微积分与统计路径"
  }
};

function stripLessonDescriptionPrefix(content: string, description: string) {
  const trimmedDescription = description.trim();
  const trimmedContent = content.trimStart();
  if (!trimmedDescription || !trimmedContent.startsWith(trimmedDescription)) return content;

  return trimmedContent.slice(trimmedDescription.length).trimStart();
}

function stripCaliforniaGradePrefix(content: string) {
  return content.replace(californiaGradePrefixPattern, "");
}

function stripCaliforniaDisplayPrefixes(title: string) {
  return stripCaliforniaGradePrefix(title)
    .replace(californiaKnowledgePointCodePrefixPattern, "")
    .replace(californiaDisplayGradePrefixPattern, "");
}

export function cleanLessonDisplayTitle(title: string) {
  return stripCaliforniaDisplayPrefixes(title);
}

export function cleanLessonUnitTitle(title: string) {
  const compactTitle = cleanLessonDisplayTitle(title)
    .replace(/\s*[：:]\s*(?:概念、方法[與与]原[創创][應应]用|concepts?, methods?,? and original applications?)\s*$/i, "")
    .replace(lessonModuleSuffixPattern, "")
    .trim();

  return compactTitle || title;
}

export function californiaCourseTitleForGrade(grade: string) {
  return californiaCourseTitlesByGrade[grade] ?? null;
}

export function cleanLessonConceptContent(content: string, description: string) {
  return stripCaliforniaGradePrefix(stripLessonDescriptionPrefix(content, description));
}

export function splitLessonContentForAnswerReveal(
  content: string,
  options: LessonContentAnswerRevealOptions = {}
): LessonContentSegment[] {
  const revealStandaloneAnswerLines = options.revealStandaloneAnswerLines ?? true;
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const segments: LessonContentSegment[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const answerMatch = line.match(revealableAnswerPattern);
    const answerStartIndex = answerMatch?.index ?? -1;

    if (answerStartIndex > 0) {
      segments.push({
        answerText: line.slice(answerStartIndex).trim(),
        id: `line-${index}`,
        kind: "answer",
        promptText: line.slice(0, answerStartIndex).trim()
      });
      continue;
    }

    if (revealStandaloneAnswerLines && answerStartIndex === 0) {
      const previousSegment = segments[segments.length - 1];

      if (previousSegment?.kind === "text") {
        const answerLines = [line];
        let nextIndex = index + 1;

        while (nextIndex < lines.length && standaloneReasoningLinePattern.test(lines[nextIndex])) {
          answerLines.push(lines[nextIndex]);
          nextIndex += 1;
        }

        segments[segments.length - 1] = {
          answerText: answerLines.join("\n\n"),
          id: previousSegment.id,
          kind: "answer",
          promptText: previousSegment.text
        };
        index = nextIndex - 1;
        continue;
      }
    }

    segments.push({
      id: `line-${index}`,
      kind: "text",
      text: line
    });
  }

  return segments;
}

