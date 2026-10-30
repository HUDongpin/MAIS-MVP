import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { combineProviderPolicyRegions, normalizeProviderVoiceText } from "@/lib/aiProviderCompanyPolicy";
import { createTutorProviderPolicyProof, verifyTutorProviderPolicyProof } from "./tutorProviderPolicyProof";
import { trustedTutorProviderHistory } from "./aiProviderPolicyContext";

test("reply policy proof binds the authenticated actor, normalized spoken text and restrictive region", () => {
  const previous = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "fixture-policy-proof-secret";
  try {
    const proof = createTutorProviderPolicyProof("teacher", "Use $x + 1$.", "US");
    assert.equal(verifyTutorProviderPolicyProof("teacher", "Use x + 1 .", proof), "US");
    assert.equal(combineProviderPolicyRegions("HK", verifyTutorProviderPolicyProof("teacher", "Use x + 1 .", proof) ?? null), "US");
    assert.equal(verifyTutorProviderPolicyProof("other-user", "Use x + 1 .", proof), undefined);
    assert.equal(verifyTutorProviderPolicyProof("teacher", "Different text", proof), undefined);
    assert.equal(verifyTutorProviderPolicyProof("teacher", "Use x + 1 .", `${proof}0`), undefined);
    assert.equal(verifyTutorProviderPolicyProof("teacher", "Use x + 1 .", undefined), undefined);
    const hk = createTutorProviderPolicyProof("teacher", "Hello", "HK");
    assert.equal(verifyTutorProviderPolicyProof("teacher", "Hello", hk), "HK");
    delete process.env.AUTH_SESSION_SECRET;
    assert.equal(createTutorProviderPolicyProof("teacher", "Hello", "HK"), undefined);
  } finally { previous === undefined ? delete process.env.AUTH_SESSION_SECRET : process.env.AUTH_SESSION_SECRET = previous; }
});

test("server-owned history retains US policy across context changes and omits legacy unlabelled turns", () => {
  const messages = [
    { user_id: "teacher", role: "tutor" as const, content: "Legacy unknown context", created_at: "2026-10-30T00:00:00Z", context_json: {} },
    { user_id: "other", role: "tutor" as const, content: "Other user", created_at: "2026-10-30T00:00:01Z", context_json: { providerPolicyRegion: "US" } },
    { user_id: "teacher", role: "tutor" as const, content: "US-target reply", created_at: "2026-10-30T00:00:02Z", context_json: { providerPolicyRegion: "US" } },
    { user_id: "teacher", role: "student" as const, content: "Next HK context", created_at: "2026-10-30T00:00:03Z", context_json: { providerPolicyRegion: "HK" } }
  ];
  const history = trustedTutorProviderHistory(messages, "teacher");
  assert.deepEqual(history.map(message => message.content), ["US-target reply", "Next HK context"]);
  assert.equal(combineProviderPolicyRegions("HK", ...history.map(message => message.providerPolicyRegion)), "US");
});

test("spoken-text canonicalization remains stable when the length boundary falls on whitespace", () => {
  const previous = process.env.AUTH_SESSION_SECRET;
  process.env.AUTH_SESSION_SECRET = "fixture-policy-proof-secret";
  try {
    const reply = "a".repeat(1199) + " b";
    const spoken = normalizeProviderVoiceText(reply);
    assert.equal(normalizeProviderVoiceText(spoken), spoken);
    const proof = createTutorProviderPolicyProof("teacher", reply, "HK");
    assert.equal(verifyTutorProviderPolicyProof("teacher", spoken, proof), "HK");
  } finally { previous === undefined ? delete process.env.AUTH_SESSION_SECRET : process.env.AUTH_SESSION_SECRET = previous; }
});

test("tutor draft serialization and restoration retain only bounded policy proofs", () => {
  // Exercise the actual component's two storage functions without mounting its
  // browser-only UI, using the compiler to preserve their TypeScript semantics.
  const file = ts.createSourceFile("AITutorProvider.tsx", readFileSync("components/ai/AITutorProvider.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ["sanitizeMessagesForDraft", "readTutorMessages"];
  const functions = file.statements.filter(statement => ts.isFunctionDeclaration(statement) && names.includes(statement.name?.text ?? ""));
  assert.equal(functions.length, 2);
  const source = functions.map(statement => statement.getText(file)).join("\n");
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const helpers = vm.runInNewContext(`${js}\n({ sanitizeMessagesForDraft, readTutorMessages })`, {
    isRecord: (value: unknown) => Boolean(value) && typeof value === "object" && !Array.isArray(value),
    normalizeAITutorVisualization: () => undefined
  }) as { sanitizeMessagesForDraft: (messages: unknown[]) => unknown[]; readTutorMessages: (value: unknown) => Array<{ providerPolicyProof?: string }> };
  const messages = [
    { role: "tutor", content: "Valid reply", providerPolicyProof: "fixture-proof" },
    { role: "tutor", content: "Oversized", providerPolicyProof: "x".repeat(1025) },
    { role: "tutor", content: "Malformed", providerPolicyProof: { unexpected: true } },
    { role: "student", content: "Legacy" }
  ];
  const restored = helpers.readTutorMessages(JSON.parse(JSON.stringify(helpers.sanitizeMessagesForDraft(messages))));
  assert.equal(restored[0].providerPolicyProof, "fixture-proof");
  assert.equal(restored[1].providerPolicyProof, undefined);
  assert.equal(restored[2].providerPolicyProof, undefined);
  assert.equal(restored[3].providerPolicyProof, undefined);
  assert.equal(helpers.readTutorMessages(messages)[1].providerPolicyProof, undefined);
});

test("Nova Lens response decoding and tutor opening carry the proof into the displayed reply", () => {
  const overlay = ts.createSourceFile("NovaLensGlobalOverlay.tsx", readFileSync("components/ai/NovaLensGlobalOverlay.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const tutor = ts.createSourceFile("AITutorProvider.tsx", readFileSync("components/ai/AITutorProvider.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const decoder = overlay.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === "readNovaLensResponse");
  let optionsExpression: ts.Expression | undefined;
  let openExpression: ts.Expression | undefined;
  const visitOverlay = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(overlay) === "options" && node.type?.getText(overlay) === "AITutorOpenOptions") optionsExpression = node.initializer;
    ts.forEachChild(node, visitOverlay);
  };
  const visitTutor = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node) && node.name.getText(tutor) === "openTutor") openExpression = node.initializer;
    ts.forEachChild(node, visitTutor);
  };
  visitOverlay(overlay); visitTutor(tutor);
  assert.ok(decoder && optionsExpression && openExpression);
  const js = ts.transpileModule(`${decoder.getText(overlay)}\nconst payload = readNovaLensResponse(raw);\nconst options = ${optionsExpression.getText(overlay)};\nconst open = ${openExpression.getText(tutor)};\nopen({}, options);`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  let messages: Array<{ providerPolicyProof?: string }> = [];
  const noop = () => {};
  vm.runInNewContext(js, {
    raw: { reply: "Fixture Nova Lens reply", status: "completed", providerPolicyProof: "fixture-proof" },
    selection: {}, action: "explain", customQuestion: undefined, redactSelection: false,
    visiblePrompt: () => "Explain this", openRequestedRef: { current: false }, recordLearningEvent: noop,
    setContext: noop, setOpen: noop, setVoiceInputIssue: noop, setVoiceStatus: noop, abortVoiceInputCapture: noop,
    setInput: noop, setMessages: (update: (current: typeof messages) => typeof messages) => { messages = update(messages); },
    hasStudentMessage: () => false, tutorMessage: (role: string, content: string) => ({ role, content }),
    openingMessage: () => "Hello", language: "en", isGuestSession: false, createMessageId: () => "fixture-message"
  });
  assert.equal(messages.at(-1)?.providerPolicyProof, "fixture-proof");
});
