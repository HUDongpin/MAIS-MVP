// Content gate for the AI Tutor voice (text-to-speech) route.
//
// The voice route exists to read a tutor reply aloud in Professor Nova's voice.
// The reply it is *supposed* to receive already cleared the /resolve gates — but
// the text arrives in the request body, so nothing about the transport proves
// that. An authenticated student can POST arbitrary text to /api/ai-tutor/voice
// and, without this gate, have it spoken back to them in the tutor's voice. That
// is a bypass of both duty-of-care (lib/server/contentSafety.ts) and policy
// moderation (lib/server/tutorModeration.ts), because the voice route never ran
// either one.
//
// So the voice text is held to exactly the bar /resolve holds real tutor output
// to, in the same order:
//
//   1. content-safety (crisis / duty-of-care) — ANY flag withholds, and the flag
//      is raised to the teacher surface, because a student routing self-harm text
//      through the speaker is still a student in distress.
//   2. tutor-output moderation (policy / appropriateness) — lexical first, then
//      the opt-in provider layer, via resolveTutorOutputModeration. The tutor bar
//      is the strict one: any flag, block or flag severity, withholds.
//
// Only step 1 or step 2 runs, never both: /resolve stops at the first gate that
// fires, and so does this. A crisis flag is a duty-of-care event, and re-filing
// it as a policy violation would muddy the audit log.
//
// Where /resolve substitutes replacement text and keeps talking, this refuses.
// The student did not ask the tutor a question here — they asked for audio of
// text they supplied — so there is no conversational turn to redirect. Refusing
// returns no audio at all, which is the only outcome that cannot be gamed.
//
// Scoped to students, mirroring both gates in /resolve. The decision is returned
// as data (governance events included) rather than written here, so the route
// owns its own audit writes and this module stays testable without a store.

import { classifyContentSafety } from "@/lib/server/contentSafety";
import type { AiGovernanceAuditAction } from "@/lib/server/aiGovernance";
import type {
  ContentSafetyCategory,
  ContentSafetySeverity,
  ContentSafetySource
} from "@/types";
import type {
  ContentSafetyClassification
} from "@/lib/server/contentSafety";
import type {
  TutorModerationClassification,
  TutorRole
} from "@/lib/server/tutorModeration";
import {
  resolveTutorOutputModeration,
  type TutorModerationLayer,
  type TutorModerationProviderOptions,
  type TutorModerationProviderStatus
} from "@/lib/server/tutorModerationProvider";

// Which gate refused. Absent when the text is cleared to be spoken.
export type TutorVoiceRefusalReason = "content-safety" | "content-moderation";

// Widens the moderation layer's event shape to the full audit vocabulary, because
// this gate also emits the "content-safety-flagged" action that moderation alone
// never produces. Events from resolveTutorOutputModeration are assignable as-is.
export type TutorVoiceGovernanceEvent = {
  action: AiGovernanceAuditAction;
  reason: string;
  metadata: Record<string, unknown>;
};

// The arguments for a recordContentSafetyFlag call, returned rather than written
// so the route (which owns the store) performs the write. Structurally a subset
// of that function's input.
export type TutorVoiceSafetyFlagRecord = {
  category: ContentSafetyCategory;
  severity: ContentSafetySeverity;
  source: ContentSafetySource;
  excerpt: string;
  matchedTerms: string[];
  language: string;
  blockedReply: true;
};

export type TutorVoiceModerationDecision = {
  // False means: do not synthesize, do not speak. Refuse the request.
  allowed: boolean;
  refusal?: TutorVoiceRefusalReason;
  safety: ContentSafetyClassification;
  moderation: TutorModerationClassification;
  // Which moderation layer produced the verdict, when moderation refused.
  layer?: TutorModerationLayer;
  // Audit events for the caller to write against the "ai-tutor-voice" capability.
  governanceEvents: TutorVoiceGovernanceEvent[];
  // Present only on a content-safety refusal: the teacher-facing flag to record.
  safetyFlag?: TutorVoiceSafetyFlagRecord;
  providerStatus: TutorModerationProviderStatus;
};

const notFlaggedSafety: ContentSafetyClassification = {
  flagged: false,
  matchedTerms: [],
  excerpt: ""
};

const notFlaggedModeration: TutorModerationClassification = {
  flagged: false,
  matchedTerms: [],
  excerpt: ""
};

export async function resolveTutorVoiceModeration({
  text,
  role,
  language,
  config,
  timeoutMs,
  fetchImpl
}: {
  text: string;
  role: TutorRole;
  language: string;
} & TutorModerationProviderOptions): Promise<TutorVoiceModerationDecision> {
  const allowed: TutorVoiceModerationDecision = {
    allowed: true,
    safety: notFlaggedSafety,
    moderation: notFlaggedModeration,
    governanceEvents: [],
    providerStatus: "skipped"
  };

  // Mirrors the scoping of both gates in /resolve. A teacher, parent, or admin
  // reply is not moderated there, so it is not moderated here either.
  if (role !== "student") return allowed;

  // Gate 1 — duty of care. The voice text is judged as tutor output because that
  // is what it claims to be, and the tutor-output bar withholds on any flag
  // rather than only on critical/high.
  const safety = classifyContentSafety(text, { source: "tutor-output" });
  if (safety.flagged && safety.category && safety.severity) {
    return {
      allowed: false,
      refusal: "content-safety",
      safety,
      moderation: notFlaggedModeration,
      governanceEvents: [
        {
          action: "content-safety-flagged",
          reason: `content-safety:tutor-output:${safety.category}:${safety.severity}:withheld`,
          metadata: {
            category: safety.category,
            severity: safety.severity,
            source: "tutor-output",
            blockedReply: true
          }
        }
      ],
      safetyFlag: {
        category: safety.category,
        severity: safety.severity,
        source: "tutor-output",
        excerpt: safety.excerpt,
        matchedTerms: safety.matchedTerms,
        language,
        blockedReply: true
      },
      providerStatus: "skipped"
    };
  }

  // Gate 2 — policy moderation, both layers. `language` only selects the redirect
  // wording this route discards; the verdict itself is language-independent.
  const moderation = await resolveTutorOutputModeration({
    modelReply: text,
    role,
    language,
    config,
    timeoutMs,
    fetchImpl
  });

  return {
    allowed: !moderation.redirected,
    ...(moderation.redirected ? { refusal: "content-moderation" as const } : {}),
    safety,
    moderation: moderation.classification,
    ...(moderation.layer ? { layer: moderation.layer } : {}),
    // Carries the provider-unavailable audit event through on the allowed path
    // too, so a fail-open moderation hop stays visible in the governance log.
    governanceEvents: moderation.governanceEvents,
    providerStatus: moderation.providerStatus
  };
}
