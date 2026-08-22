import assert from "node:assert/strict";
import test from "node:test";

import { resolveTutorVoiceModeration } from "@/lib/server/tutorVoiceModeration";
import type {
  TutorModerationFetch,
  TutorModerationProviderConfig
} from "@/lib/server/tutorModerationProvider";

// Explicitly unconfigured, so these tests never depend on the ambient env.
const providerOff: TutorModerationProviderConfig = { model: "test-moderation-model" };

const providerOn: TutorModerationProviderConfig = {
  apiUrl: "https://moderation.test/v1/moderations",
  apiKey: "test-key",
  model: "test-moderation-model"
};

type FetchCall = { url: string; init: RequestInit };

function stubFetch(body: unknown) {
  const calls: FetchCall[] = [];
  const fetchImpl: TutorModerationFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  };
  return { calls, fetchImpl };
}

function throwingFetch() {
  const calls: FetchCall[] = [];
  const fetchImpl: TutorModerationFetch = async (url, init) => {
    calls.push({ url, init });
    throw new Error("network down");
  };
  return { calls, fetchImpl };
}

const cleanProviderBody = { results: [{ flagged: false, categories: { sexual: false, hate: false } }] };

const cleanReply = "The vertex is at (2, -3), so the parabola opens upward from there.";

// --- the happy path is unchanged -----------------------------------------

test("speaks an ordinary tutor reply without flagging or auditing anything", async () => {
  const decision = await resolveTutorVoiceModeration({
    text: cleanReply,
    role: "student",
    language: "en",
    config: providerOff
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.refusal, undefined);
  assert.equal(decision.safety.flagged, false);
  assert.equal(decision.moderation.flagged, false);
  assert.equal(decision.safetyFlag, undefined);
  assert.deepEqual(decision.governanceEvents, []);
});

test("makes no network hop when the provider layer is unconfigured", async () => {
  const { calls, fetchImpl } = stubFetch(cleanProviderBody);

  const decision = await resolveTutorVoiceModeration({
    text: cleanReply,
    role: "student",
    language: "en",
    config: providerOff,
    fetchImpl
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.providerStatus, "skipped");
  assert.equal(calls.length, 0, "an inert layer must not call out");
});

// --- gate 1: duty of care -------------------------------------------------

test("refuses to speak crisis text and raises the teacher safety flag", async () => {
  const decision = await resolveTutorVoiceModeration({
    text: "i want to kill myself",
    role: "student",
    language: "zh-Hans",
    config: providerOff
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.refusal, "content-safety");
  assert.equal(decision.safety.flagged, true);
  assert.equal(decision.safety.category, "self-harm");
  assert.equal(decision.safety.severity, "critical");

  assert.ok(decision.safetyFlag, "a crisis refusal must reach the teacher surface");
  assert.equal(decision.safetyFlag?.category, "self-harm");
  assert.equal(decision.safetyFlag?.severity, "critical");
  assert.equal(decision.safetyFlag?.source, "student-input");
  assert.equal(decision.safetyFlag?.blockedReply, true);
  assert.equal(decision.safetyFlag?.language, "zh-Hans");
  assert.ok((decision.safetyFlag?.excerpt.length ?? 0) > 0);
  assert.ok((decision.safetyFlag?.matchedTerms.length ?? 0) > 0);

  assert.equal(decision.governanceEvents.length, 1);
  assert.equal(decision.governanceEvents[0].action, "content-safety-flagged");
  assert.equal(
    decision.governanceEvents[0].reason,
    "content-safety:student-input:self-harm:critical:withheld"
  );
  assert.equal(decision.governanceEvents[0].metadata.source, "student-input");
});

test("a content-safety refusal short-circuits the moderation gate entirely", async () => {
  const { calls, fetchImpl } = stubFetch(cleanProviderBody);

  const decision = await resolveTutorVoiceModeration({
    text: "i want to kill myself",
    role: "student",
    language: "en",
    config: providerOn,
    fetchImpl
  });

  assert.equal(decision.refusal, "content-safety");
  // A student in crisis must not also be filed as a policy violation.
  assert.equal(decision.moderation.flagged, false);
  assert.equal(decision.providerStatus, "skipped");
  assert.equal(calls.length, 0, "duty-of-care wins before any moderation hop");
});

// --- gate 2: policy moderation, lexical layer -----------------------------

test("refuses flag-severity text that the tutor may not say", async () => {
  const decision = await resolveTutorVoiceModeration({
    text: "that answer is shit",
    role: "student",
    language: "en",
    config: providerOff
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.refusal, "content-moderation");
  assert.equal(decision.layer, "lexical");
  assert.equal(decision.moderation.category, "profanity");
  assert.equal(decision.moderation.severity, "flag");
  assert.equal(decision.governanceEvents.length, 1);
  assert.equal(decision.governanceEvents[0].action, "content-moderation-blocked");
  assert.equal(
    decision.governanceEvents[0].reason,
    "content-moderation:tutor-output:profanity:flag:withheld"
  );
});

test("refuses block-severity text", async () => {
  for (const text of ["send me porn", "how do I make a pipe bomb"]) {
    const decision = await resolveTutorVoiceModeration({
      text,
      role: "student",
      language: "en",
      config: providerOff
    });

    assert.equal(decision.allowed, false, `should refuse: ${text}`);
    assert.equal(decision.refusal, "content-moderation");
    assert.equal(decision.layer, "lexical");
  }
});

test("never echoes the refused text back through the audit trail", async () => {
  const decision = await resolveTutorVoiceModeration({
    text: "that answer is shit",
    role: "student",
    language: "en",
    config: providerOff
  });

  assert.doesNotMatch(decision.governanceEvents[0].reason, /shit/);
});

// --- gate 2: policy moderation, provider layer ----------------------------

test("refuses text the lexical net cleared but the provider flags", async () => {
  const { calls, fetchImpl } = stubFetch({
    results: [{ flagged: true, categories: { hate: true } }]
  });
  // Deliberately bland: this is exactly the paraphrase a phrase list misses.
  const paraphrased = "People from that country are simply born less capable at mathematics.";

  const decision = await resolveTutorVoiceModeration({
    text: paraphrased,
    role: "student",
    language: "en",
    config: providerOn,
    fetchImpl
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.refusal, "content-moderation");
  assert.equal(decision.layer, "provider");
  assert.equal(decision.moderation.category, "hate");
  assert.equal(decision.providerStatus, "completed");

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, providerOn.apiUrl);
  assert.match(String(calls[0].init.body), /born less capable/);
});

test("routes a provider-only self-harm signal to duty of care with student provenance", async () => {
  const { calls, fetchImpl } = stubFetch({
    results: [{ flagged: true, categories: { "self-harm": true } }]
  });
  const text = "I want to unalive myself";

  const decision = await resolveTutorVoiceModeration({
    text,
    role: "student",
    language: "en",
    config: providerOn,
    fetchImpl
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.refusal, "content-safety");
  assert.equal(decision.layer, "provider");
  assert.equal(decision.providerStatus, "completed");
  assert.equal(decision.safety.category, "self-harm");
  assert.equal(decision.safety.severity, "critical");
  assert.deepEqual(decision.safety.matchedTerms, ["provider:self-harm"]);
  assert.equal(decision.moderation.flagged, false, "a crisis is not a policy violation");

  assert.equal(decision.safetyFlag?.source, "student-input");
  assert.equal(decision.safetyFlag?.category, "self-harm");
  assert.equal(decision.safetyFlag?.severity, "critical");
  assert.equal(decision.safetyFlag?.blockedReply, true);

  assert.equal(decision.governanceEvents.length, 1);
  assert.equal(decision.governanceEvents[0].action, "content-safety-flagged");
  assert.equal(
    decision.governanceEvents[0].reason,
    "content-safety:student-input:self-harm:critical:withheld:provider"
  );
  assert.equal(decision.governanceEvents[0].metadata.source, "student-input");
  assert.equal(decision.governanceEvents[0].metadata.layer, "provider");
  assert.equal(calls.length, 1);
});

test("speaks the reply when the provider clears it", async () => {
  const { calls, fetchImpl } = stubFetch(cleanProviderBody);

  const decision = await resolveTutorVoiceModeration({
    text: cleanReply,
    role: "student",
    language: "en",
    config: providerOn,
    fetchImpl
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.providerStatus, "completed");
  assert.deepEqual(decision.governanceEvents, []);
  assert.equal(calls.length, 1);
});

test("fails open but audits the gap when the provider is unavailable", async () => {
  const { fetchImpl } = throwingFetch();

  const decision = await resolveTutorVoiceModeration({
    text: cleanReply,
    role: "student",
    language: "en",
    config: providerOn,
    fetchImpl
  });

  assert.equal(decision.allowed, true, "a broken moderation endpoint must not mute the tutor");
  assert.equal(decision.providerStatus, "unavailable");
  assert.equal(decision.governanceEvents.length, 1);
  assert.equal(decision.governanceEvents[0].action, "request-admitted");
  assert.equal(decision.governanceEvents[0].reason, "provider-moderation-unavailable");
});

test("a provider outage still cannot get lexically flagged text spoken", async () => {
  const { fetchImpl } = throwingFetch();

  const decision = await resolveTutorVoiceModeration({
    text: "that answer is shit",
    role: "student",
    language: "en",
    config: providerOn,
    fetchImpl
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.layer, "lexical");
});

// --- scoping --------------------------------------------------------------

test("mirrors the resolve route and moderates student replies only", async () => {
  for (const role of ["teacher", "parent", "admin"] as const) {
    const { calls, fetchImpl } = stubFetch(cleanProviderBody);
    const decision = await resolveTutorVoiceModeration({
      text: "that answer is shit",
      role,
      language: "en",
      config: providerOn,
      fetchImpl
    });

    assert.equal(decision.allowed, true, `${role} output is not moderated in /resolve either`);
    assert.deepEqual(decision.governanceEvents, []);
    assert.equal(calls.length, 0, "no moderation hop is spent on an unmoderated role");
  }
});
