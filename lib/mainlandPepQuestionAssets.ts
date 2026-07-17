import type { Question, QuestionAsset } from "@/types";

export type MainlandPepQuestionIllustrationApproval = {
  questionId: string;
  promptHash: string;
  qaStatus: "approved";
  approvedAtHkt: string;
  approvedBySession: "S18";
  mathLayer: "prompt-specific-exact";
};

// Temporary safety gate: generic Mainland PEP question illustrations are not
// student-visible until S21 regenerates exact prompt-level math layers and S18
// records an approval here.
export const mainlandPepQuestionIllustrationApprovals: MainlandPepQuestionIllustrationApproval[] = [];

const assetRootsByIdPrefix = [
  {
    prefix: "pep-primary-",
    srcRoot: "/question-illustrations/mainland-pep-primary/questions",
    zhLabel: "人教版小学题目配图",
    enLabel: "Mainland PEP primary question illustration"
  },
  {
    prefix: "pep-junior-v2-",
    srcRoot: "/question-illustrations/mainland-pep-junior/questions",
    zhLabel: "人教版初中题目配图",
    enLabel: "Mainland PEP junior question illustration"
  },
  {
    prefix: "pep-high-",
    srcRoot: "/question-illustrations/mainland-pep-high/questions",
    zhLabel: "人教版高中题目配图",
    enLabel: "Mainland PEP high question illustration"
  }
] as const;

export function mainlandPepQuestionAssetSrc(questionId: string) {
  const match = assetRootsByIdPrefix.find((entry) => questionId.startsWith(entry.prefix));
  return match ? `${match.srcRoot}/${questionId}.png` : null;
}

export function mainlandPepQuestionPromptHash(question: Pick<Question, "prompt">) {
  return stableHash(question.prompt.zhHans ?? question.prompt.zh ?? question.prompt.en);
}

export function mainlandPepQuestionIllustrationApprovalFor(question: Question) {
  const promptHash = mainlandPepQuestionPromptHash(question);

  return mainlandPepQuestionIllustrationApprovals.find(
    (approval) =>
      approval.questionId === question.id &&
      approval.promptHash === promptHash &&
      approval.qaStatus === "approved" &&
      approval.mathLayer === "prompt-specific-exact"
  ) ?? null;
}

export function mainlandPepQuestionAssetFor(question: Question): QuestionAsset | null {
  const match = assetRootsByIdPrefix.find((entry) => question.id.startsWith(entry.prefix));
  if (!match) return null;
  if (question.publisher && question.publisher !== "MAINLAND_PEP") return null;
  if (!question.publisher && question.curriculumTrack !== "MAINLAND_PEP_HIGH") return null;
  if (!mainlandPepQuestionIllustrationApprovalFor(question)) return null;

  return {
    kind: "image",
    src: `${match.srcRoot}/${question.id}.png`,
    alt: {
      en: match.enLabel,
      zh: match.zhLabel,
      zhHans: match.zhLabel
    }
  };
}

export function withResolvedMainlandPepQuestionAssets(question: Question): Question {
  const resolvedAsset = mainlandPepQuestionAssetFor(question);
  if (!resolvedAsset) return question;

  const currentAssets = question.questionAssets ?? [];
  if (currentAssets.some((asset) => asset.kind === "image" && asset.src === resolvedAsset.src)) {
    return question;
  }

  return {
    ...question,
    questionAssets: [...currentAssets, resolvedAsset]
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
