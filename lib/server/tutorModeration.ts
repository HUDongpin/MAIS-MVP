// Content-moderation gate for the MAIS AI Tutor.
//
// This is a DIFFERENT concern from the content-safety classifier in
// lib/server/contentSafety.ts. Keeping them separate matters:
//
//   - contentSafety = duty-of-care. It answers "is this *student* in danger?"
//     (self-harm, abuse, crisis, threats). A match raises a durable flag and
//     escalates to the student's teacher(s)/admins. It runs first.
//   - tutorModeration (this module) = policy / appropriateness. It answers
//     "does this content belong in a minors' math tutor?" (strong profanity,
//     sexual content, hate speech, requests for dangerous/illicit instructions,
//     abuse aimed at the tutor) — regardless of whether anyone is in danger. A
//     match blocks the model call (input) or withholds the reply (output) and is
//     written to the AI-governance audit log. It does NOT raise a teacher crisis
//     alert, because it is not a duty-of-care signal.
//
// Like contentSafety, it is a fast, deterministic, dependency-free lexical
// classifier that runs inline on the latency-sensitive tutor path — no extra LLM
// call, no network round-trip. It favours precise, multi-word phrases over
// ambiguous single words so ordinary math talk ("kill the term", "the graph
// blows up", "the function explodes to infinity", "cancel the factor") is never
// moderated. It is a policy net, not a judgement of the student.
//
// The classifier is intentionally minimal and is structured so a provider
// moderation endpoint (e.g. an OpenAI/Anthropic-style moderation call) or a
// stronger model-based classifier can later be layered on top WITHOUT changing
// the call sites or the returned shape — see the extension seam noted in
// classifyTutorModeration below.

export type TutorModerationCategory =
  | "sexual"
  | "hate"
  | "dangerous"
  | "profanity"
  | "insult";

// "block" content must not proceed: the model call is refused (input) or the
// model reply is withheld (output). "flag" content is logged for audit but still
// tutored on input — we do not deny a frustrated student help over mild venting.
// Note the asymmetry the route relies on: any flag (block *or* flag) withholds an
// *output*, because the tutor is held to a higher bar than the student and must
// never itself emit profanity, insults, or unsafe content.
export type TutorModerationSeverity = "block" | "flag";

export type TutorModerationSource = "student-input" | "tutor-output";

export type TutorModerationClassification = {
  flagged: boolean;
  category?: TutorModerationCategory;
  severity?: TutorModerationSeverity;
  // The literal phrases that matched, for audit context.
  matchedTerms: string[];
  // A short window of the surrounding text around the first match.
  excerpt: string;
};

type ModerationRule = {
  category: TutorModerationCategory;
  severity: TutorModerationSeverity;
  patterns: RegExp[];
};

const severityRank: Record<TutorModerationSeverity, number> = {
  block: 2,
  flag: 1
};

// Rules are evaluated in order; the highest-severity match wins, and ties break
// toward the earlier (higher-priority) rule. Patterns run against a
// whitespace-normalised, lower-cased copy of the text. Chinese phrases are listed
// alongside English so Simplified/Traditional learners are covered.
//
// Detection is deliberately conservative: strong, unambiguous tokens and phrases
// only. Comprehensive hate-speech / sexual-content coverage is explicitly out of
// scope for a lexical net — that is the job of the provider-moderation upgrade
// documented at the top of this file.
const moderationRules: ModerationRule[] = [
  {
    category: "sexual",
    severity: "block",
    patterns: [
      /\bporn(?:o|os|hub|ography)?\b/,
      /\berotica?\b/,
      /\bmasturbat(?:e|es|ed|ing|ion)\b/,
      /\bblow\s?job(?:s)?\b/,
      /\bhand\s?job(?:s)?\b/,
      /\bcum(?:shot|ming)\b/,
      /\bnudes?\b/,
      /\bdick\s+pics?\b/,
      /\bsext(?:ing)?\b/,
      /\bnsfw\b/,
      /\bhorny\b/,
      // "write me a sexy/erotic/dirty story/roleplay" style solicitation.
      /\b(?:write|tell|give|send)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+)?(?:sex|sexy|erotic|smut|dirty|nsfw|naughty)\s+(?:story|stories|scene|roleplay|role\s?play|joke|jokes|fanfic|pic|pics)/,
      /裸照|色情|性交|做爱|做愛|自慰|援交|黄片|黃片|约炮|約炮/
    ]
  },
  {
    category: "hate",
    severity: "block",
    patterns: [
      // Structural hate: "I hate <group> people", "kill/gas/deport all <group>".
      /\b(?:i\s+)?hate\s+(?:all\s+)?(?:black|white|asian|jewish|jews|muslims?|christians?|gay|gays|lesbians?|trans(?:gender)?|immigrants?|mexicans?|chinese|indians?)\s+(?:people|folks)\b/,
      /\b(?:kill|gas|deport|lynch|exterminate|round\s+up)\s+(?:all\s+)?(?:the\s+)?(?:jews|muslims|gays|blacks|immigrants|asians|mexicans)\b/,
      /\bwhite\s+power\b/,
      /\bheil\s+hitler\b/,
      // Intentionally-minimal explicit slur blocklist (word-bounded, leetspeak
      // tolerant). A provider moderation classifier is the documented upgrade for
      // comprehensive coverage; this list only catches the highest-harm tokens.
      /\bn[i1]gg(?:er|a|ers|as)\b/,
      /\bf[a4]gg?ot(?:s)?\b/
    ]
  },
  {
    category: "dangerous",
    severity: "block",
    patterns: [
      // Instruction-seeking for weapons/explosives/drug synthesis. (Personalised
      // threats like "I'm going to make a bomb" are already caught earlier by the
      // content-safety violence rule; this catches the how-to-build variety.)
      /\bhow\s+(?:to|do\s+i|can\s+i|would\s+i|does\s+(?:one|someone))\s+(?:make|build|construct|assemble|synthesi[sz]e|manufacture|cook|3d\s*print)\s+(?:a\s+|an\s+|my\s+own\s+)?(?:bomb|pipe\s+bomb|explosive|grenade|gun|firearm|silencer|suppressor|ghost\s+gun|meth|methamphetamine|cocaine|heroin|fentanyl|nerve\s+agent|sarin|ricin|poison|chemical\s+weapon|napalm|molotov)\b/,
      /\b(?:make|build|synthesi[sz]e|manufacture)\s+(?:a\s+|an\s+)?(?:pipe\s+bomb|nerve\s+agent|chemical\s+weapon|molotov\s+cocktail)\b/,
      /\bhow\s+to\s+(?:make\s+chlorine\s+gas|make\s+mustard\s+gas|overdose\s+on)\b/,
      /如何.*(?:制作|製作|制造|製造).*(?:炸弹|炸藥|炸药|毒品|冰毒)|怎(?:么|樣|样).*(?:做|造).*(?:炸弹|炸藥|炸药|冰毒)/
    ]
  },
  {
    category: "profanity",
    severity: "flag",
    patterns: [
      /\bfuck(?:ing|er|ers|ed|s|wit)?\b/,
      /\bmotherfuck(?:er|ing)?\b/,
      /\bshit(?:ty|s|head|ted)?\b/,
      /\bbull\s?shit\b/,
      /\bbitch(?:es|ing|y|ass)?\b/,
      /\bbastards?\b/,
      /\bass\s?holes?\b/,
      /\bdickheads?\b/,
      /\bcunts?\b/,
      /\bwtf\b/,
      /\bstfu\b/,
      /\bpiss(?:ed)?\s+off\b/,
      /操你|草你|肏|傻逼|傻屄|滚蛋|滾蛋|妈的|媽的/
    ]
  },
  {
    category: "insult",
    severity: "flag",
    patterns: [
      // Abuse aimed at the tutor ("you're stupid / useless / trash", "shut up").
      /\byou(?:'?re| are)\s+(?:so\s+|such\s+a\s+|a\s+|an\s+)?(?:stupid|dumb|dumbass|idiot|idiotic|moron|moronic|useless|worthless|trash|garbage|pathetic|a\s+joke)\b/,
      /\bshut\s+up\b/,
      /\bi\s+hate\s+you\b/,
      /\byou\s+suck\b/,
      /\bretard(?:ed|s)?\b/,
      /闭嘴|閉嘴|你(?:好)?(?:蠢|笨|白痴|白癡|废物|廢物|垃圾)|去死/
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

const emptyClassification: TutorModerationClassification = {
  flagged: false,
  matchedTerms: [],
  excerpt: ""
};

export function classifyTutorModeration(
  text: string,
  _options: { source?: TutorModerationSource } = {}
): TutorModerationClassification {
  if (typeof text !== "string" || !text.trim()) return emptyClassification;

  const scan = normalizeForScan(text).toLowerCase();
  if (!scan) return emptyClassification;

  let best: {
    rule: ModerationRule;
    matchedTerms: string[];
    firstIndex: number;
    firstLength: number;
  } | null = null;

  for (const rule of moderationRules) {
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

  // Extension seam: a provider moderation endpoint or model-based classifier can
  // be awaited here and merged into `best` (taking the more severe of the two)
  // without changing any call site — the returned shape is stable.

  if (!best) return emptyClassification;

  return {
    flagged: true,
    category: best.rule.category,
    severity: best.rule.severity,
    matchedTerms: best.matchedTerms,
    excerpt: buildExcerpt(text, best.firstIndex, best.firstLength)
  };
}

// Student INPUT is only refused for "block"-severity content. "flag"-severity
// input (mild profanity, insults aimed at the tutor) is logged for audit but
// still answered — a stressed student venting at a hard problem should not be
// denied math help.
export function shouldBlockTutorInput(classification: TutorModerationClassification) {
  return classification.flagged && classification.severity === "block";
}

// Tutor OUTPUT is withheld on ANY flag: the assistant must never emit profanity,
// insults, sexual, hateful, or dangerous content, even at "flag" severity.
export function shouldWithholdTutorOutput(classification: TutorModerationClassification) {
  return classification.flagged;
}

export type TutorRole = "student" | "teacher" | "parent" | "admin";

export type TutorOutputModerationDecision = {
  // The reply to actually send: the model's own text when clean, or the neutral
  // math redirect when withheld.
  reply: string;
  // Whether the model reply was withheld and replaced by the redirect.
  redirected: boolean;
  // Set to the response mode string only when redirected, so the route can pass
  // it straight through to the client and the persisted message context.
  mode?: "moderation-redirect";
  // The underlying classification, so the caller can log the governance event.
  classification: TutorModerationClassification;
};

// Single source of truth for the output-side moderation decision, extracted from
// the resolve route so the route wiring is deterministically testable without a
// live model. Given a model reply, it decides whether to send the model text or
// withhold it in favour of the neutral redirect. Only student replies are
// moderated (mirroring the input gate and content-safety scoping); the caller is
// still responsible for firing the governance audit event when redirected.
export function applyTutorOutputModeration({
  modelReply,
  role,
  language
}: {
  modelReply: string;
  role: TutorRole;
  language: string;
}): TutorOutputModerationDecision {
  const notModerated: TutorOutputModerationDecision = {
    reply: modelReply,
    redirected: false,
    classification: { flagged: false, matchedTerms: [], excerpt: "" }
  };
  if (role !== "student") return notModerated;

  const classification = classifyTutorModeration(modelReply, { source: "tutor-output" });
  if (!shouldWithholdTutorOutput(classification)) {
    return { ...notModerated, classification };
  }

  return {
    reply: buildModerationRedirectReply(language),
    redirected: true,
    mode: "moderation-redirect",
    classification
  };
}

function normalizeReplyLanguage(language: string | undefined): "en" | "zh" | "zh-Hans" {
  if (language?.startsWith("zh-Hans")) return "zh-Hans";
  if (language?.startsWith("zh")) return "zh";
  return "en";
}

// A single, warm, category-agnostic redirect shown to the student when input is
// blocked or output is withheld. It refuses without moralising or repeating the
// offending content, and steers back to math. It reads correctly for every
// moderation category (profanity, sexual, hate, dangerous, insult).
export function buildModerationRedirectReply(language: string): string {
  const normalized = normalizeReplyLanguage(language);

  if (normalized === "zh-Hans") {
    return [
      "这个我没办法帮忙。我是你的数学老师 Professor Nova，我们把对话保持在互相尊重、专注学习上吧。",
      "把一道数学题发给我——你正在做的题目、想弄懂的概念，或想检查的错误——我会一步步陪你解。"
    ].join("\n\n");
  }

  if (normalized === "zh") {
    return [
      "這個我沒辦法幫忙。我是你的數學老師 Professor Nova，我們把對話保持在互相尊重、專注學習上吧。",
      "把一道數學題發給我——你正在做的題目、想弄懂的概念，或想檢查的錯誤——我會一步步陪你解。"
    ].join("\n\n");
  }

  return [
    "I can't help with that. I'm here as your math tutor, Professor Nova, so let's keep our conversation respectful and focused on learning.",
    "Send me a math question — a problem you're working on, a concept you want to understand, or a mistake you'd like to check — and I'll walk through it with you step by step."
  ].join("\n\n");
}
