import assert from "node:assert/strict";
import test from "node:test";

import { buildModerationRedirectReply } from "@/lib/server/tutorModeration";
import {
  classificationFromProviderPayload,
  classifyTutorModerationWithProvider,
  isTutorModerationProviderConfigured,
  mergeTutorModerationClassifications,
  readTutorModerationProviderConfig,
  resolveTutorInputModeration,
  resolveTutorModerationProviderTimeoutMs,
  resolveTutorOutputModeration,
  type TutorModerationFetch,
  type TutorModerationProviderConfig
} from "@/lib/server/tutorModerationProvider";

const providerConfig: TutorModerationProviderConfig = {
  apiUrl: "https://moderation.test/v1/moderations",
  apiKey: "test-key",
  model: "test-moderation-model"
};

type FetchCall = { url: string; init: RequestInit };

// A fetch double that records what it was asked for and replies with a canned
// OpenAI-moderations-shaped body.
function stubFetch(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}
) {
  const calls: FetchCall[] = [];
  const fetchImpl: TutorModerationFetch = async (url, init) => {
    calls.push({ url, init });
    return { ok, status, json: async () => body };
  };
  return { calls, fetchImpl };
}

function neverResolvingFetch() {
  const calls: FetchCall[] = [];
  const fetchImpl: TutorModerationFetch = (url, init) => {
    calls.push({ url, init });
    return new Promise(() => {});
  };
  return { calls, fetchImpl };
}

function neverResolvingJsonFetch() {
  const calls: FetchCall[] = [];
  const fetchImpl: TutorModerationFetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: () => new Promise(() => {})
    };
  };
  return { calls, fetchImpl };
}

function throwingFetch() {
  const fetchImpl: TutorModerationFetch = async () => {
    throw new Error("network down");
  };
  return fetchImpl;
}

function flaggedBody(categories: Record<string, boolean>) {
  return { results: [{ flagged: true, categories }] };
}

const cleanBody = { results: [{ flagged: false, categories: { sexual: false, hate: false } }] };

// --- configuration -------------------------------------------------------

test("provider config reads the documented env vars and defaults the model", () => {
  const config = readTutorModerationProviderConfig({
    TUTOR_MODERATION_API_URL: " https://moderation.test/v1/moderations ",
    TUTOR_MODERATION_API_KEY: "secret"
  });
  assert.equal(config.apiUrl, "https://moderation.test/v1/moderations");
  assert.equal(config.apiKey, "secret");
  assert.ok(config.model.length > 0, "a model name is always sent");

  const withModel = readTutorModerationProviderConfig({
    TUTOR_MODERATION_API_URL: "https://moderation.test/v1/moderations",
    TUTOR_MODERATION_API_KEY: "secret",
    TUTOR_MODERATION_MODEL: "custom-model"
  });
  assert.equal(withModel.model, "custom-model");
});

test("the layer stays off unless BOTH url and key are set", () => {
  assert.equal(isTutorModerationProviderConfigured({ model: "m" }), false);
  assert.equal(isTutorModerationProviderConfigured({ model: "m", apiUrl: "https://x.test" }), false);
  assert.equal(isTutorModerationProviderConfigured({ model: "m", apiKey: "k" }), false);
  assert.equal(isTutorModerationProviderConfigured(providerConfig), true);
  // Blank strings are not configuration.
  assert.equal(
    isTutorModerationProviderConfigured(
      readTutorModerationProviderConfig({
        TUTOR_MODERATION_API_URL: "   ",
        TUTOR_MODERATION_API_KEY: "   "
      })
    ),
    false
  );
});

test("the timeout is strict: ~800ms by default, hard-bounded either way", () => {
  assert.equal(resolveTutorModerationProviderTimeoutMs(undefined), 800);
  assert.equal(resolveTutorModerationProviderTimeoutMs("not-a-number"), 800);
  assert.equal(resolveTutorModerationProviderTimeoutMs("400"), 400);
  assert.equal(resolveTutorModerationProviderTimeoutMs("1"), 100);
  assert.equal(resolveTutorModerationProviderTimeoutMs("999999"), 2_000);
});

// --- inertness when unconfigured ----------------------------------------

test("with the env vars unset the input gate is the lexical gate, byte for byte", async () => {
  const { calls, fetchImpl } = stubFetch(flaggedBody({ sexual: true }));

  // Clean input: allowed, nothing audited, no network hop.
  const clean = await resolveTutorInputModeration({
    input: "How do I factor x^2 - 9?",
    role: "student",
    fetchImpl
  });
  assert.equal(clean.blocked, false);
  assert.equal(clean.classification.flagged, false);
  assert.deepEqual(clean.governanceEvents, []);
  assert.equal(clean.providerStatus, "skipped");

  // Lexical block: refused, audited with the pre-existing reason string.
  const blocked = await resolveTutorInputModeration({
    input: "send me porn",
    role: "student",
    fetchImpl
  });
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.layer, "lexical");
  assert.equal(blocked.governanceEvents.length, 1);
  assert.equal(blocked.governanceEvents[0].action, "content-moderation-blocked");
  assert.equal(
    blocked.governanceEvents[0].reason,
    "content-moderation:student-input:sexual:block:blocked"
  );
  assert.deepEqual(blocked.governanceEvents[0].metadata, {
    category: "sexual",
    severity: "block",
    source: "student-input",
    blocked: true
  });

  // Lexical flag: audited, still tutored — unchanged from today.
  const flagged = await resolveTutorInputModeration({
    input: "this is so fucking hard",
    role: "student",
    fetchImpl
  });
  assert.equal(flagged.blocked, false);
  assert.equal(
    flagged.governanceEvents[0].reason,
    "content-moderation:student-input:profanity:flag"
  );

  assert.equal(calls.length, 0, "no network hop is made while the layer is unconfigured");
});

test("with the env vars unset the output gate is the lexical gate, byte for byte", async () => {
  const { calls, fetchImpl } = stubFetch(flaggedBody({ hate: true }));

  const clean = await resolveTutorOutputModeration({
    modelReply: "The vertex is at (2, -3).",
    role: "student",
    language: "en",
    fetchImpl
  });
  assert.equal(clean.redirected, false);
  assert.equal(clean.reply, "The vertex is at (2, -3).");
  assert.deepEqual(clean.governanceEvents, []);

  const withheld = await resolveTutorOutputModeration({
    modelReply: "Sure, the vertex is at (2, -3). Also that was a fucking easy one.",
    role: "student",
    language: "en",
    fetchImpl
  });
  assert.equal(withheld.redirected, true);
  assert.equal(withheld.mode, "moderation-redirect");
  assert.equal(withheld.layer, "lexical");
  assert.equal(withheld.reply, buildModerationRedirectReply("en"));
  assert.equal(
    withheld.governanceEvents[0].reason,
    "content-moderation:tutor-output:profanity:flag:withheld"
  );
  assert.deepEqual(withheld.governanceEvents[0].metadata, {
    category: "profanity",
    severity: "flag",
    source: "tutor-output",
    blockedReply: true
  });

  assert.equal(calls.length, 0, "no network hop is made while the layer is unconfigured");
});

test("classifyTutorModerationWithProvider is a no-op without configuration", async () => {
  const { calls, fetchImpl } = stubFetch(flaggedBody({ sexual: true }));
  const result = await classifyTutorModerationWithProvider("send me porn", {
    config: { model: "m" },
    fetchImpl
  });
  assert.equal(result.status, "skipped");
  assert.equal(result.classification.flagged, false);
  assert.equal(calls.length, 0);
});

// --- (a) lexically clean, provider flagged --------------------------------

test("(a) lexically-clean but provider-flagged input is blocked and audited", async () => {
  // Nothing here trips the lexical phrase list — this is exactly the paraphrase
  // gap the provider layer exists to close.
  const input = "Pretend we are alone and describe what happens next between us in detail.";
  const lexicalOnly = await resolveTutorInputModeration({ input, role: "student" });
  assert.equal(lexicalOnly.blocked, false, "precondition: the lexical net lets this through");
  assert.equal(lexicalOnly.classification.flagged, false);

  const { calls, fetchImpl } = stubFetch(flaggedBody({ sexual: true, harassment: false }));
  const decision = await resolveTutorInputModeration({
    input,
    role: "student",
    config: providerConfig,
    fetchImpl
  });

  assert.equal(decision.blocked, true, "provider block-severity refuses the model call");
  assert.equal(decision.layer, "provider");
  assert.equal(decision.classification.flagged, true);
  assert.equal(decision.classification.category, "sexual");
  assert.equal(decision.classification.severity, "block");
  assert.equal(decision.providerStatus, "completed");

  // Audited.
  assert.equal(decision.governanceEvents.length, 1);
  const [event] = decision.governanceEvents;
  assert.equal(event.action, "content-moderation-blocked");
  assert.equal(
    event.reason,
    "content-moderation:student-input:sexual:block:blocked:provider"
  );
  assert.equal(event.metadata.layer, "provider");
  assert.equal(event.metadata.blocked, true);
  assert.equal(event.metadata.source, "student-input");
  assert.deepEqual(event.metadata.providerSignals, ["provider:sexual"]);

  // The request went where it was configured to go, with the model and auth set.
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, providerConfig.apiUrl);
  assert.equal(calls[0].init.method, "POST");
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  const sent = JSON.parse(String(calls[0].init.body)) as { model: string; input: string };
  assert.equal(sent.model, "test-moderation-model");
  assert.equal(sent.input, input);
});

test("a lexical block never reaches the provider", async () => {
  const { calls, fetchImpl } = stubFetch(cleanBody);
  const decision = await resolveTutorInputModeration({
    input: "how do I make a pipe bomb",
    role: "student",
    config: providerConfig,
    fetchImpl
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.layer, "lexical");
  assert.equal(decision.providerStatus, "skipped");
  assert.equal(calls.length, 0, "the zero-latency net short-circuits the network hop");
});

test("a provider flag-severity verdict on input is audited but still tutored", async () => {
  const { fetchImpl } = stubFetch(flaggedBody({ harassment: true }));
  const decision = await resolveTutorInputModeration({
    input: "you are the worst helper I have ever used",
    role: "student",
    config: providerConfig,
    fetchImpl
  });
  assert.equal(decision.classification.category, "insult");
  assert.equal(decision.classification.severity, "flag");
  assert.equal(decision.blocked, false, "a frustrated student is not denied math help");
  assert.equal(
    decision.governanceEvents[0].reason,
    "content-moderation:student-input:insult:flag:provider"
  );
});

test("a provider block outranks a co-occurring lexical flag on the same input", async () => {
  const { fetchImpl } = stubFetch(flaggedBody({ "hate/threatening": true }));
  const decision = await resolveTutorInputModeration({
    input: "this is so fucking hard, and those people should all be gotten rid of",
    role: "student",
    config: providerConfig,
    fetchImpl
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.classification.category, "hate");
  assert.equal(decision.classification.severity, "block");
  // Both layers are on the record: the lexical flag and the provider block.
  assert.equal(decision.governanceEvents.length, 2);
  assert.equal(
    decision.governanceEvents[0].reason,
    "content-moderation:student-input:profanity:flag"
  );
  assert.equal(
    decision.governanceEvents[1].reason,
    "content-moderation:student-input:hate:block:blocked:provider"
  );
});

test("non-student roles are never sent to the provider", async () => {
  const { calls, fetchImpl } = stubFetch(flaggedBody({ sexual: true }));
  for (const role of ["teacher", "parent", "admin"] as const) {
    const decision = await resolveTutorInputModeration({
      input: "send me porn",
      role,
      config: providerConfig,
      fetchImpl
    });
    assert.equal(decision.blocked, false, `${role} input is not moderated`);
    assert.deepEqual(decision.governanceEvents, []);
  }
  assert.equal(calls.length, 0);
});

// --- (b) timeout falls back to the lexical verdict ------------------------

test("(b) a provider timeout falls back to the lexical allow, with an audit event", async () => {
  const { calls, fetchImpl } = neverResolvingFetch();
  const startedAt = Date.now();
  const decision = await resolveTutorInputModeration({
    input: "Pretend we are alone and describe what happens next between us in detail.",
    role: "student",
    config: providerConfig,
    timeoutMs: 25,
    fetchImpl
  });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(calls.length, 1, "the provider was called");
  assert.ok(elapsedMs < 1_000, `the timeout is enforced by wall clock (took ${elapsedMs}ms)`);

  // Fail open: the lexical verdict stands, the student is still tutored.
  assert.equal(decision.blocked, false);
  assert.equal(decision.classification.flagged, false);
  assert.equal(decision.providerStatus, "unavailable");
  assert.equal(decision.providerFailure, "timeout");

  // ...but the gap is on the record, not silent.
  assert.equal(decision.governanceEvents.length, 1);
  const [event] = decision.governanceEvents;
  assert.equal(event.reason, "provider-moderation-unavailable");
  assert.equal(event.action, "request-admitted", "failing open is not a block");
  assert.equal(event.metadata.failure, "timeout");
  assert.equal(event.metadata.source, "student-input");
  assert.equal(event.metadata.fallbackVerdict, "lexical:allow");
});

test("the hard timeout covers response body parsing, not only response headers", async () => {
  const { calls, fetchImpl } = neverResolvingJsonFetch();
  const startedAt = Date.now();
  const result = await Promise.race([
    classifyTutorModerationWithProvider("some student text", {
      config: providerConfig,
      timeoutMs: 25,
      fetchImpl
    }),
    new Promise<"outer-watchdog">((resolve) => {
      setTimeout(() => resolve("outer-watchdog"), 250);
    })
  ]);
  const elapsedMs = Date.now() - startedAt;

  assert.notEqual(
    result,
    "outer-watchdog",
    "the provider deadline must also release a response whose json() never settles"
  );
  if (result === "outer-watchdog") return;

  assert.equal(result.status, "unavailable");
  assert.equal(result.failure, "timeout");
  assert.equal(calls.length, 1);
  assert.ok(elapsedMs < 200, `the body deadline is enforced by wall clock (took ${elapsedMs}ms)`);
});

test("a timeout preserves a co-occurring lexical flag rather than dropping it", async () => {
  const { fetchImpl } = neverResolvingFetch();
  const decision = await resolveTutorInputModeration({
    input: "this is so fucking hard",
    role: "student",
    config: providerConfig,
    timeoutMs: 25,
    fetchImpl
  });
  assert.equal(decision.classification.category, "profanity");
  assert.equal(decision.blocked, false);
  assert.equal(decision.governanceEvents.length, 2);
  assert.equal(
    decision.governanceEvents[0].reason,
    "content-moderation:student-input:profanity:flag"
  );
  assert.equal(decision.governanceEvents[1].reason, "provider-moderation-unavailable");
  assert.equal(decision.governanceEvents[1].metadata.fallbackVerdict, "lexical:flag");
});

test("http errors, network errors and garbage bodies all fail open and are audited", async () => {
  const cases: Array<[string, TutorModerationFetch, string]> = [
    ["http-error", stubFetch({}, { ok: false, status: 503 }).fetchImpl, "http-error"],
    ["network", throwingFetch(), "request-failed"],
    [
      "unparseable",
      (async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("not json");
        }
      })) as TutorModerationFetch,
      "malformed-response"
    ]
  ];

  for (const [label, fetchImpl, expectedFailure] of cases) {
    const decision = await resolveTutorInputModeration({
      input: "Pretend we are alone and describe what happens next.",
      role: "student",
      config: providerConfig,
      fetchImpl
    });
    assert.equal(decision.blocked, false, `${label} fails open`);
    assert.equal(decision.providerFailure, expectedFailure, `${label} failure kind`);
    assert.equal(decision.governanceEvents.length, 1, `${label} is audited`);
    assert.equal(decision.governanceEvents[0].reason, "provider-moderation-unavailable");
  }
});

test("valid JSON with an unsupported schema is unavailable and audited", async () => {
  const { fetchImpl } = stubFetch({ nonsense: true });
  const decision = await resolveTutorInputModeration({
    input: "Please explain how to factor this quadratic.",
    role: "student",
    config: providerConfig,
    fetchImpl
  });

  assert.equal(decision.blocked, false, "malformed provider data still fails open");
  assert.equal(decision.providerStatus, "unavailable");
  assert.equal(decision.providerFailure, "malformed-response");
  assert.equal(decision.governanceEvents.length, 1);
  assert.equal(decision.governanceEvents[0].action, "request-admitted");
  assert.equal(decision.governanceEvents[0].reason, "provider-moderation-unavailable");
  assert.equal(decision.governanceEvents[0].metadata.failure, "malformed-response");
});

test("an exhausted request deadline is audited rather than silently unmoderated", async () => {
  const { calls, fetchImpl } = stubFetch(flaggedBody({ sexual: true }));
  const result = await classifyTutorModerationWithProvider("some student text", {
    config: providerConfig,
    timeoutMs: 0,
    fetchImpl
  });
  assert.equal(result.status, "unavailable");
  assert.equal(result.failure, "deadline-exhausted");
  assert.equal(result.classification.flagged, false);
  assert.equal(calls.length, 0, "no request is started with no time to answer it");
});

// --- (c) tutor output withheld on a provider flag -------------------------

test("(c) tutor output flagged by the provider is withheld with the redirect reply", async () => {
  // Lexically clean model reply — no phrase from the list appears in it.
  const modelReply = "Great question! Here is a spicy little story about the two of us instead.";
  const lexicalOnly = await resolveTutorOutputModeration({
    modelReply,
    role: "student",
    language: "en"
  });
  assert.equal(lexicalOnly.redirected, false, "precondition: the lexical net clears this reply");

  const { calls, fetchImpl } = stubFetch(flaggedBody({ sexual: true }));
  const decision = await resolveTutorOutputModeration({
    modelReply,
    role: "student",
    language: "en",
    config: providerConfig,
    fetchImpl
  });

  assert.equal(decision.redirected, true);
  assert.equal(decision.mode, "moderation-redirect");
  assert.equal(decision.layer, "provider");
  assert.equal(decision.reply, buildModerationRedirectReply("en"));
  assert.doesNotMatch(decision.reply, /spicy|story about the two of us/i);
  assert.equal(decision.providerStatus, "completed");

  assert.equal(decision.governanceEvents.length, 1);
  const [event] = decision.governanceEvents;
  assert.equal(event.action, "content-moderation-blocked");
  assert.equal(
    event.reason,
    "content-moderation:tutor-output:sexual:block:withheld:provider"
  );
  assert.equal(event.metadata.blockedReply, true);
  assert.equal(event.metadata.layer, "provider");

  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(String(calls[0].init.body)).input, modelReply);
});

test("tutor output is withheld on a provider FLAG severity too, and localizes", async () => {
  // The tutor is held to a higher bar than the student: any flag withholds.
  const { fetchImpl } = stubFetch(flaggedBody({ harassment: true }));
  const decision = await resolveTutorOutputModeration({
    modelReply: "答案是 42，你自己想想吧。",
    role: "student",
    language: "zh-Hans",
    config: providerConfig,
    fetchImpl
  });
  assert.equal(decision.redirected, true);
  assert.equal(decision.classification.severity, "flag");
  assert.equal(decision.reply, buildModerationRedirectReply("zh-Hans"));
  assert.match(decision.reply, /数学/);
});

test("a lexically-withheld reply never reaches the provider", async () => {
  const { calls, fetchImpl } = stubFetch(cleanBody);
  const decision = await resolveTutorOutputModeration({
    modelReply: "That was a fucking easy one.",
    role: "student",
    language: "en",
    config: providerConfig,
    fetchImpl
  });
  assert.equal(decision.redirected, true);
  assert.equal(decision.layer, "lexical");
  assert.equal(calls.length, 0);
});

test("a provider-unavailable output check sends the model reply through unchanged", async () => {
  const modelReply = "The vertex form is y = (x - 2)^2 - 1.";
  const { fetchImpl } = neverResolvingFetch();
  const decision = await resolveTutorOutputModeration({
    modelReply,
    role: "student",
    language: "en",
    config: providerConfig,
    timeoutMs: 25,
    fetchImpl
  });
  assert.equal(decision.redirected, false);
  assert.equal(decision.reply, modelReply, "the tutor still answers when moderation is down");
  assert.equal(decision.governanceEvents[0].reason, "provider-moderation-unavailable");
  assert.equal(decision.governanceEvents[0].metadata.source, "tutor-output");
});

test("a clean provider verdict leaves the model reply untouched", async () => {
  const modelReply = "The vertex form is y = (x - 2)^2 - 1, so the vertex is (2, -1).";
  const { calls, fetchImpl } = stubFetch(cleanBody);
  const decision = await resolveTutorOutputModeration({
    modelReply,
    role: "student",
    language: "en",
    config: providerConfig,
    fetchImpl
  });
  assert.equal(decision.redirected, false);
  assert.equal(decision.reply, modelReply);
  assert.deepEqual(decision.governanceEvents, []);
  assert.equal(decision.providerStatus, "completed");
  assert.equal(calls.length, 1);
});

// --- response parsing -----------------------------------------------------

test("provider payload parsing accepts the moderation, flat and chat-JSON shapes", () => {
  const text = "some student text";

  const moderationShape = classificationFromProviderPayload(
    { results: [{ flagged: true, categories: { hate: true } }] },
    text
  );
  assert.equal(moderationShape?.category, "hate");
  assert.equal(moderationShape?.severity, "block");

  const flatShape = classificationFromProviderPayload({ flagged: true, categories: ["violence"] }, text);
  assert.equal(flatShape?.category, "dangerous");

  const chatShape = classificationFromProviderPayload(
    {
      choices: [
        { message: { content: "```json\n{\"flagged\": true, \"categories\": {\"sexual\": true}}\n```" } }
      ]
    },
    text
  );
  assert.equal(chatShape?.category, "sexual");

  // Scores are used only when no boolean verdicts were supplied.
  const scoresOnly = classificationFromProviderPayload(
    { results: [{ flagged: true, category_scores: { harassment: 0.91, hate: 0.02 } }] },
    text
  );
  assert.equal(scoresOnly?.category, "insult");
  const lowScores = classificationFromProviderPayload(
    { results: [{ flagged: false, category_scores: { harassment: 0.01 } }] },
    text
  );
  assert.equal(lowScores, null);
});

test("provider payload parsing discards what it does not recognise", () => {
  const text = "some student text";
  assert.equal(classificationFromProviderPayload(null, text), null);
  assert.equal(classificationFromProviderPayload("not an object", text), null);
  assert.equal(classificationFromProviderPayload({ results: [] }, text), null);
  assert.equal(classificationFromProviderPayload({ nonsense: true }, text), null);
  assert.equal(
    classificationFromProviderPayload({ choices: [{ message: { content: "not json" } }] }, text),
    null
  );
  // An unknown category name is not guessed at.
  assert.equal(
    classificationFromProviderPayload({ flagged: true, categories: { spam: true } }, text),
    null
  );
});

test("self-harm verdicts are left to contentSafety, not filed as policy violations", () => {
  // Routing a student in crisis through the moderation log would record them as a
  // policy violation and never reach their teacher — contentSafety owns this.
  for (const key of ["self-harm", "self_harm", "self-harm/intent", "suicide"]) {
    assert.equal(
      classificationFromProviderPayload({ flagged: true, categories: { [key]: true } }, "text"),
      null,
      `${key} must not map to a tutor-moderation category`
    );
  }
});

test("the provider classification carries audit context without inventing matched text", () => {
  const long = `Solve for x. ${"padding ".repeat(60)}end`;
  const classification = classificationFromProviderPayload(
    { flagged: true, categories: { sexual: true, harassment: true } },
    long
  );
  if (!classification) throw new Error("expected a provider classification");
  assert.equal(classification.category, "sexual", "the most severe category wins");
  assert.deepEqual(classification.matchedTerms, ["provider:sexual", "provider:harassment"]);
  assert.ok(classification.excerpt.length <= 161, "the excerpt is bounded");
  assert.ok(classification.excerpt.startsWith("Solve for x."));
});

test("equally severe provider categories break ties the same way the lexical net does", () => {
  const classification = classificationFromProviderPayload(
    { flagged: true, categories: { violence: true, hate: true, sexual: true } },
    "text"
  );
  // tutorModeration's rule order is sexual, hate, dangerous, profanity, insult.
  assert.equal(classification?.category, "sexual");
});

// --- merge ----------------------------------------------------------------

test("merging classifications keeps the more severe verdict", () => {
  const clean = { flagged: false, matchedTerms: [], excerpt: "" };
  const flag = {
    flagged: true,
    category: "profanity" as const,
    severity: "flag" as const,
    matchedTerms: ["fuck"],
    excerpt: "…"
  };
  const block = {
    flagged: true,
    category: "sexual" as const,
    severity: "block" as const,
    matchedTerms: ["provider:sexual"],
    excerpt: "…"
  };

  assert.equal(mergeTutorModerationClassifications(clean, clean).flagged, false);
  assert.equal(mergeTutorModerationClassifications(clean, flag).category, "profanity");
  assert.equal(mergeTutorModerationClassifications(flag, block).category, "sexual");
  assert.equal(mergeTutorModerationClassifications(block, flag).category, "sexual");
  // Ties break toward the first argument, i.e. toward the lexical layer.
  assert.deepEqual(mergeTutorModerationClassifications(flag, { ...flag, category: "insult" }), flag);
});
