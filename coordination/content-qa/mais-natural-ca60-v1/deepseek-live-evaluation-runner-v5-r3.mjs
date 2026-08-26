import { parseDeepSeekEvaluationResponseV5R2 } from "./deepseek-evaluation-adapter-v5-r2.mjs";
import { validatePriorRoleArtifactV5R3 } from "./execution-integrity-v5-r3.mjs";
import { runGuardedProviderAttemptV5R3 } from "./guarded-provider-attempt-v5-r3.mjs";

const ROLES = new Set([
  "B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2",
  "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5",
]);

function blocked(errors) {
  return Object.freeze({
    schemaVersion: "DeepSeekEvaluationAttemptRunV5R3",
    status: "PRIOR_LINEAGE_BLOCKED",
    dispatchAllowed: false,
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    reservation: null,
    providerEventReceipt: null,
    completion: null,
    roleOutput: null,
    errors: Object.freeze(errors),
  });
}

function priorBindings(input) {
  const role = input.request?.role;
  if (!ROLES.has(role)) return { errors: ["DeepSeek role is outside the frozen evaluation workflow"], bindings: [] };
  const required = role === "B_PRIME_REVISION" ? ["B_PRIME_CRITIQUE"] : [];
  const supplied = input.priorArtifacts && typeof input.priorArtifacts === "object" ? input.priorArtifacts : {};
  if (JSON.stringify(Object.keys(supplied).sort()) !== JSON.stringify(required)) {
    return { errors: [`DeepSeek ${role} requires exactly prior roles: ${required.join(",") || "NONE"}`], bindings: [] };
  }
  const errors = [];
  const bindings = [];
  const declaredHashes = input.request.priorArtifactHashes && typeof input.request.priorArtifactHashes === "object"
    ? input.request.priorArtifactHashes
    : {};
  if (JSON.stringify(Object.keys(declaredHashes).sort()) !== JSON.stringify(required)) {
    errors.push(`${role}: request prior-artifact hash set is not exact`);
  }
  for (const expectedRole of required) {
    const value = supplied[expectedRole];
    const lineageErrors = validatePriorRoleArtifactV5R3({
      artifact: value?.artifact,
      attemptReceipt: value?.attemptReceipt,
      expectedRole,
      itemHash: input.request.itemHash,
      itemIdPseudonym: input.request.itemIdPseudonym,
    });
    errors.push(...lineageErrors.map((error) => `${expectedRole}: ${error}`));
    if (declaredHashes[expectedRole] !== value?.artifact?.selfHash) errors.push(`${expectedRole}: request prior-artifact hash is not bound`);
    const embedded = input.request.adapterRequest?.logicalRequest?.userPayload?.bPrimeCritiqueArtifact;
    if (embedded?.selfHash !== value?.artifact?.selfHash) errors.push(`${expectedRole}: outbound logical request does not embed the validated artifact`);
    bindings.push({ artifact: value?.artifact, attemptReceipt: value?.attemptReceipt, expectedRole });
  }
  return { errors, bindings };
}

export async function runDeepSeekEvaluationAttemptV5R3(input = {}) {
  const prior = priorBindings(input);
  if (prior.errors.length > 0) return blocked(prior.errors);
  return runGuardedProviderAttemptV5R3({
    ...input,
    priorRoleBindings: prior.bindings,
    parseResponse: ({ rawResponseBody, request }) => {
      const parsed = parseDeepSeekEvaluationResponseV5R2({
        request: request.adapterRequest,
        rawResponseBody,
      });
      return {
        observedModel: parsed.observedModel,
        finishReason: parsed.finishReason,
        parsedPayload: parsed.structuredPayload,
        parsedPayloadHash: parsed.structuredPayloadHash,
      };
    },
  });
}

export const DEEPSEEK_EVALUATION_RUNNER_V5_R3_CONSTANTS = Object.freeze({ roles: Object.freeze([...ROLES]) });
