import { runGuardedProviderAttemptV5R3 } from "./guarded-provider-attempt-v5-r3.mjs";
import { validatePriorRoleArtifactV5R3 } from "./execution-integrity-v5-r3.mjs";
import { parseOpenAIReferenceLiveResponseV5R2 } from "./openai-reference-adapter-v5.mjs";

const REQUIRED = Object.freeze({
  A_SOLVE: Object.freeze([]),
  A_LABEL: Object.freeze(["A_SOLVE"]),
  B_SOLVE: Object.freeze([]),
  B_LABEL: Object.freeze(["B_SOLVE"]),
  ADJUDICATOR: Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"]),
});
const REQUEST_FIELDS = Object.freeze({
  A_LABEL: Object.freeze({ A_SOLVE: "itemSolveArtifact" }),
  B_LABEL: Object.freeze({ B_SOLVE: "itemSolveArtifact" }),
  ADJUDICATOR: Object.freeze({ A_SOLVE: "aSolveArtifact", A_LABEL: "aLabelArtifact", B_SOLVE: "bSolveArtifact", B_LABEL: "bLabelArtifact" }),
});

function blocked(errors) {
  return Object.freeze({
    schemaVersion: "OpenAIReferenceAttemptRunV5R3",
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
  const required = REQUIRED[role];
  if (!required) return { errors: ["OpenAI role is outside the frozen reference panel"], bindings: [] };
  const supplied = input.priorArtifacts && typeof input.priorArtifacts === "object" ? input.priorArtifacts : {};
  const keys = Object.keys(supplied).sort();
  if (JSON.stringify(keys) !== JSON.stringify([...required].sort())) {
    return { errors: [`OpenAI ${role} requires exactly prior roles: ${required.join(",") || "NONE"}`], bindings: [] };
  }
  const errors = [];
  const bindings = [];
  const declaredHashes = input.request.priorArtifactHashes && typeof input.request.priorArtifactHashes === "object"
    ? input.request.priorArtifactHashes
    : {};
  if (JSON.stringify(Object.keys(declaredHashes).sort()) !== JSON.stringify([...required].sort())) {
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
    const field = REQUEST_FIELDS[role]?.[expectedRole];
    const embedded = input.request.logicalRequest?.userPayload?.[field];
    if (!field || embedded?.selfHash !== value?.artifact?.selfHash) errors.push(`${expectedRole}: outbound logical request does not embed the validated artifact`);
    bindings.push({ artifact: value?.artifact, attemptReceipt: value?.attemptReceipt, expectedRole });
  }
  return { errors, bindings };
}

export async function runOpenAIReferenceAttemptV5R3(input = {}) {
  const prior = priorBindings(input);
  if (prior.errors.length > 0) return blocked(prior.errors);
  return runGuardedProviderAttemptV5R3({
    ...input,
    priorRoleBindings: prior.bindings,
    parseResponse: ({ responseEnvelope, rawResponseBody, request }) => {
      const parsed = parseOpenAIReferenceLiveResponseV5R2({
        role: request.role,
        logicalRequest: request.logicalRequest,
        wireRequest: request.wireRequest,
        rawResponseBody,
        responseEnvelope,
        responseHeaders: {},
      });
      return {
        observedModel: parsed.observedModel,
        finishReason: responseEnvelope.status,
        parsedPayload: parsed.structuredPayload,
        parsedPayloadHash: parsed.structuredPayloadHash,
      };
    },
  });
}

export const OPENAI_REFERENCE_RUNNER_V5_R3_CONSTANTS = Object.freeze({ requiredPriorRoles: REQUIRED, requestArtifactFields: REQUEST_FIELDS });
