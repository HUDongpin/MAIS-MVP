import type {
  ContentSafetyCategory,
  ContentSafetySeverity,
  ContentSafetySource,
  Language
} from "@/types";

// Content-safety classifier for the MAIS AI Tutor.
//
// Schools handing an AI to minors expect an escalation path when a student
// writes something concerning (self-harm, crisis, abuse) or when the tutor is
// steered toward inappropriate content. This module is a fast, deterministic,
// dependency-free lexical classifier that runs inline on the latency-sensitive
// tutor path (no extra LLM call, no network). It intentionally favours precise,
// multi-word phrases over ambiguous single words so a math conversation
// ("kill the negative sign", "the problem is dead", "shoot for 90%") does not
// trip the crisis path. It is a safety net, not a diagnosis: every match is
// surfaced to a human (teacher/admin), never used to punish a student.
//
// The classifier is structured so a stronger model-based classifier can later be
// layered on top without changing the call sites or the persisted flag shape.

export type ContentSafetyClassification = {
  flagged: boolean;
  category?: ContentSafetyCategory;
  severity?: ContentSafetySeverity;
  // The literal phrases that matched, for teacher context and auditing.
  matchedTerms: string[];
  // A short window of the surrounding text around the first match.
  excerpt: string;
};

type SafetyRule = {
  category: ContentSafetyCategory;
  severity: ContentSafetySeverity;
  patterns: RegExp[];
};

const severityRank: Record<ContentSafetySeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1
};

// Rules are evaluated in order; the highest-severity match wins, and ties break
// toward the earlier (more urgent) rule. Patterns are matched against a
// whitespace-normalised, lower-cased copy of the text. Chinese phrases are
// listed alongside English so Simplified/Traditional learners are covered.
const safetyRules: SafetyRule[] = [
  {
    category: "self-harm",
    severity: "critical",
    patterns: [
      /\bkill(?:ing)?\s+myself\b/,
      /\bkill\s+my\s?self\b/,
      /\bi\s+(?:want|wanna|need|have|going|got)\s+to\s+die\b/,
      /\bi\s+wanna\s+die\b/,
      /\bwant\s+to\s+end\s+(?:it|my\s+life|everything)\b/,
      /\bend(?:ing)?\s+my\s+life\b/,
      /\btake\s+my\s+own\s+life\b/,
      /\bsuicid(?:e|al)\b/,
      /\bself[\s-]?harm\b/,
      /\bharm(?:ing)?\s+myself\b/,
      /\bhurt(?:ing)?\s+myself\b/,
      /\bcut(?:ting)?\s+myself\b/,
      /\bno\s+(?:reason|point)\s+(?:to|in)\s+(?:living|live|being\s+alive)\b/,
      /\b(?:i(?:'m| am)\s+)?better\s+off\s+dead\b/,
      /\bdon'?t\s+want\s+to\s+(?:be\s+alive|live|exist)\b/,
      /\bi\s+hate\s+(?:my\s+life|myself)\b/,
      /\bwish\s+i\s+(?:was|were)\s+(?:dead|never\s+born)\b/,
      /自杀|自殺|想死|不想活|活不下去|结束生命|結束生命|伤害自己|傷害自己|割腕|轻生|輕生|了结自己|了結自己/
    ]
  },
  {
    category: "abuse",
    severity: "critical",
    patterns: [
      /\b(?:i\s+am|i'?m|being|getting)\s+abused\b/,
      /\b(?:someone|he|she|they|my\s+\w+)\s+(?:is\s+)?abus(?:es|ing)\s+me\b/,
      /\b(?:hits|beats|hitting|beating)\s+me\b/,
      /\bhurts?\s+me\s+at\s+home\b/,
      /\b(?:touch(?:ed|es|ing)|touches?)\s+me\s+(?:in|where|inappropri)/,
      /\bmolest(?:ed|ing|s)?\b/,
      /\b(?:sexual(?:ly)?\s+)?assault(?:ed|ing)?\s+me\b/,
      /\bmy\s+(?:dad|mom|mum|father|mother|parent|uncle|brother|stepdad|stepfather)\s+(?:hits|beats|hurts|touches)\b/,
      /\bnot\s+safe\s+at\s+home\b/,
      /\bafraid\s+to\s+go\s+home\b/,
      /虐待|家暴|被打|打我|性侵|猥亵|猥褻|被虐|被家暴|不敢回家/
    ]
  },
  {
    category: "violence",
    severity: "high",
    patterns: [
      // Only clear human targets — "kill the negative sign" / "kill the term"
      // are ordinary math phrasing and must not trip the crisis path.
      /\bkill\s+(?:you|him|her|them|everyone|everybody|my\s+(?:teacher|classmate|friend|mom|mum|dad|sister|brother))\b/,
      /\bi\s+(?:want|wanna|am\s+going|going)\s+to\s+(?:kill|shoot|stab|hurt|beat\s+up)\s+(?:you|him|her|them|everyone|everybody|someone|people|my|the\s+(?:teacher|class|school))\b/,
      /\bshoot\s+up\s+(?:the|my|this)\s+\w+/,
      /\bbring\s+a\s+(?:gun|knife|weapon)\b/,
      /\bmake\s+(?:a\s+)?bomb\b/,
      /\bblow\s+up\s+(?:the|my|this)\s+\w+/,
      /\bhurt\s+(?:them|him|her|everyone|people)\b/,
      /杀了|殺了|开枪|開槍|炸掉|炸了|捅死|打死你|打死他/
    ]
  },
  {
    category: "harassment",
    severity: "high",
    patterns: [
      /\b(?:i\s+am|i'?m|being|getting)\s+bullied\b/,
      /\b(?:they|he|she|kids|students)\s+(?:bully|pick\s+on|threaten(?:ed)?)\s+me\b/,
      /\bkids?\s+(?:at\s+school\s+)?(?:hurt|hate|threaten)\s+me\b/,
      /\bthreaten(?:ed|ing)?\s+to\s+(?:hurt|kill|beat)\b/,
      /欺凌|霸凌|被欺负|被欺負|被霸凌|恐吓我|恐嚇我/
    ]
  },
  {
    category: "sexual",
    severity: "high",
    patterns: [
      /\bsend\s+(?:me\s+)?nudes?\b/,
      /\bshow\s+me\s+your\s+(?:body|boobs|breasts|genitals)\b/,
      /\bhave\s+sex\s+with\s+me\b/,
      /\bsexual\s+(?:pictures?|photos?|videos?|content)\b/,
      /\bchild\s+(?:porn|sexual)\b/,
      /裸照|色情|性交|援交/
    ]
  }
];

const maxExcerptLength = 160;
const maxScanLength = 4000;
const maxMatchedTerms = 6;

function normalizeForScan(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxScanLength);
}

function buildExcerpt(original: string, matchIndex: number, matchLength: number) {
  const collapsed = original.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxExcerptLength) return collapsed;

  const padding = Math.max(0, Math.floor((maxExcerptLength - matchLength) / 2));
  const start = Math.max(0, matchIndex - padding);
  const end = Math.min(collapsed.length, start + maxExcerptLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < collapsed.length ? "…" : "";
  return `${prefix}${collapsed.slice(start, end).trim()}${suffix}`;
}

const emptyClassification: ContentSafetyClassification = {
  flagged: false,
  matchedTerms: [],
  excerpt: ""
};

export function classifyContentSafety(
  text: string,
  _options: { source?: ContentSafetySource } = {}
): ContentSafetyClassification {
  if (typeof text !== "string" || !text.trim()) return emptyClassification;

  const scan = normalizeForScan(text).toLowerCase();
  if (!scan) return emptyClassification;

  let best: {
    rule: SafetyRule;
    matchedTerms: string[];
    firstIndex: number;
    firstLength: number;
  } | null = null;

  for (const rule of safetyRules) {
    const matchedTerms: string[] = [];
    let firstIndex = -1;
    let firstLength = 0;

    for (const pattern of rule.patterns) {
      const match = pattern.exec(scan);
      if (!match) continue;
      matchedTerms.push(match[0].trim());
      if (firstIndex === -1 || match.index < firstIndex) {
        firstIndex = match.index;
        firstLength = match[0].length;
      }
    }

    if (!matchedTerms.length) continue;

    const isMoreSevere =
      !best || severityRank[rule.severity] > severityRank[best.rule.severity];
    if (isMoreSevere) {
      best = {
        rule,
        matchedTerms: Array.from(new Set(matchedTerms)).slice(0, maxMatchedTerms),
        firstIndex: Math.max(0, firstIndex),
        firstLength
      };
    }
  }

  if (!best) return emptyClassification;

  return {
    flagged: true,
    category: best.rule.category,
    severity: best.rule.severity,
    matchedTerms: best.matchedTerms,
    excerpt: buildExcerpt(text, best.firstIndex, best.firstLength)
  };
}

// A flagged student input at critical/high severity should not be answered as an
// ordinary math question — the tutor withholds its normal reply and returns a
// supportive redirect instead. Medium-severity input is logged but still tutored.
export function shouldWithholdTutorReply(classification: ContentSafetyClassification) {
  if (!classification.flagged || !classification.severity) return false;
  return classification.severity === "critical" || classification.severity === "high";
}

function normalizeReplyLanguage(language: string | undefined): Extract<Language, "en" | "zh" | "zh-Hans"> {
  if (language?.startsWith("zh-Hans")) return "zh-Hans";
  if (language?.startsWith("zh")) return "zh";
  return "en";
}

// Warm, non-clinical support wording shown to the student instead of a math
// hint when a critical/high safety flag fires. It points the student toward a
// trusted adult and tells them a teacher has been notified, without diagnosing,
// moralising, or embedding region-specific hotline numbers (which vary and can
// go stale). It never repeats the flagged phrase back to the student.
export function buildSafetySupportReply(
  category: ContentSafetyCategory,
  language: string
): string {
  const normalized = normalizeReplyLanguage(language);

  const en: Record<ContentSafetyCategory, string[]> = {
    "self-harm": [
      "I'm really glad you told me, and I want you to be safe. What you're feeling matters, and you don't have to carry it alone.",
      "Please reach out right now to a trusted adult — a parent, teacher, or school counsellor — and tell them how you feel. If you might be in immediate danger, contact your local emergency services.",
      "I've let a teacher on MAIS know so someone who cares can check in with you. I'm here, and I'll keep helping with your learning whenever you're ready."
    ],
    abuse: [
      "Thank you for trusting me with this. You deserve to feel safe, and what you described is not your fault.",
      "Please talk to a trusted adult you feel safe with — a teacher, school counsellor, or another caregiver — as soon as you can. If you're in immediate danger, contact your local emergency services.",
      "I've notified a teacher on MAIS so someone can support you. I'm still here to help with your studies whenever you'd like."
    ],
    violence: [
      "It sounds like you're feeling something really strong right now. I want you and everyone around you to stay safe.",
      "Please talk to a trusted adult — a teacher, counsellor, or parent — about what you're feeling before doing anything. If someone might be in danger, contact your local emergency services.",
      "I've let a teacher on MAIS know so they can check in. When you're ready, we can get back to your math together."
    ],
    harassment: [
      "I'm sorry you're going through this — no one deserves to be treated that way.",
      "Please tell a trusted adult such as a teacher or school counsellor what's happening so they can help you.",
      "I've let a teacher on MAIS know so they can support you. I'm here whenever you want to keep learning."
    ],
    sexual: [
      "I can't help with that, but I do want to make sure you're safe.",
      "If someone is asking you for anything that makes you uncomfortable, please tell a trusted adult like a parent, teacher, or counsellor right away.",
      "I've let a teacher on MAIS know. Let's keep this space focused on your learning — I'm happy to help with a math question."
    ]
  };

  const zhHant: Record<ContentSafetyCategory, string[]> = {
    "self-harm": [
      "謝謝你願意告訴我，我很希望你平安。你的感受很重要，你不需要一個人承受。",
      "請現在就找一位你信任的大人談談——爸媽、老師或學校輔導員，把你的感受說出來。如果你可能有立即危險，請聯絡當地緊急服務。",
      "我已經通知了 MAIS 上的老師，讓關心你的人可以主動找你。我一直都在，等你準備好，我會繼續陪你學習。"
    ],
    abuse: [
      "謝謝你信任我告訴我這件事。你值得被安全對待，你所描述的並不是你的錯。",
      "請盡快找一位你覺得安全、信任的大人談談——老師、學校輔導員或其他照顧你的人。如果你有立即危險，請聯絡當地緊急服務。",
      "我已經通知了 MAIS 上的老師，讓有人可以支持你。需要的時候，我仍然會陪你學習。"
    ],
    violence: [
      "聽起來你現在的情緒很強烈。我希望你和身邊的人都能平安。",
      "在做任何事之前，請先找一位你信任的大人——老師、輔導員或家長——談談你的感受。如果有人可能有危險，請聯絡當地緊急服務。",
      "我已經通知了 MAIS 上的老師，讓他們可以關心你。等你準備好，我們可以再一起做數學。"
    ],
    harassment: [
      "很抱歉你正經歷這些——沒有人應該被這樣對待。",
      "請把發生的事告訴一位你信任的大人，例如老師或學校輔導員，讓他們幫助你。",
      "我已經通知了 MAIS 上的老師，讓他們可以支持你。想繼續學習時，我隨時都在。"
    ],
    sexual: [
      "這個我沒辦法幫忙，但我很在意你的安全。",
      "如果有人向你要求任何讓你感到不舒服的東西，請馬上告訴一位你信任的大人，例如家長、老師或輔導員。",
      "我已經通知了 MAIS 上的老師。我們把這裡留給學習吧——我很樂意幫你解一道數學題。"
    ]
  };

  const lines = normalized === "en"
    ? en[category]
    : zhHant[category];
  const text = lines.join("\n\n");

  // Convert to Simplified when the learner's script is zh-Hans.
  if (normalized === "zh-Hans") return toSimplifiedSafety(text);
  return text;
}

// Small local Traditional→Simplified conversion for the fixed support strings.
// The main app has a full converter (lib/i18n), but this module stays
// dependency-free so it is safe to import from edge-adjacent code paths; the set
// below only needs to cover the characters used in the support messages above.
const traditionalToSimplifiedSafetyMap: Record<string, string> = {
  謝: "谢", 願: "愿", 訴: "诉", 這: "这", 學: "学", 習: "习", 們: "们",
  關: "关", 讓: "让", 準: "准", 備: "备", 緊: "紧", 務: "务",
  聯: "联", 絡: "络", 當: "当", 級: "级", 輔: "辅", 導: "导", 員: "员",
  說: "说", 錯: "错", 覺: "觉", 顧: "顾", 網: "网", 經: "经", 過: "过",
  繼: "继", 續: "续", 隨: "随", 樣: "样", 幫: "帮", 邊: "边", 緒: "绪",
  將: "将", 舒: "舒", 沒: "没", 辦: "办", 傷: "伤", 對: "对", 應: "应",
  結: "结", 東: "东", 兒: "儿", 麼: "么", 談: "谈", 態: "态",
  嗎: "吗", 個: "个", 開: "开", 護: "护", 現: "现"
};

function toSimplifiedSafety(text: string) {
  let result = "";
  for (const character of text) {
    result += traditionalToSimplifiedSafetyMap[character] ?? character;
  }
  return result;
}
