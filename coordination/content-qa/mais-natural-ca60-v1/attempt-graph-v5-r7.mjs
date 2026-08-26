import GRAPH_SCHEMA from "./schemas/AttemptGraphReconstructionReceiptV1.schema.json" with { type: "json" };
import ROLE_ATTEMPT_SCHEMA from "./schemas/RoleAttemptEvidenceReceiptV1.schema.json" with { type: "json" };

import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateExecutionLedgerEntriesV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  validateAndRebuildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  independentlyReparseRawResponseV5R6,
  validateRawResponseArtifactV5R6,
  validateRawResponseBindingReceiptV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  validateProviderAttemptCommitIntentV5R7,
  validateResolvedProviderAttemptReceiptV5R7,
} from "./attempt-transaction-v5-r7.mjs";
import {
  buildResolvedDispatchPermitV5R6,
  validateStateBoundDispatchAuditV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  buildCompatibilityCanaryC0DecisionSetV5R7,
  validateSemanticDispatchAuthorityV5R7,
} from "./semantic-dispatch-v5-r7.mjs";
import {
  buildProviderDispatchPermitV5R7,
  validateProviderDispatchPermitV5R7,
  validateReferenceDispatchAuthorityV5R7,
} from "./dispatch-authority-v5-r7.mjs";
import {
  assertClosedSelfHashedAgainstV5R5,
  validateClosedSelfHashedAgainstV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

function root(values) {
  return sha256V5R3(canonicalJsonV5R3([...values].sort()));
}

function uniqueMap(values, key, errors, label) {
  const map = new Map();
  for (const value of values ?? []) {
    const id = value?.[key];
    if (typeof id !== "string" || map.has(id)) errors.push(`${label} identity is absent or duplicated`);
    else map.set(id, value);
  }
  return map;
}

function findLeaf(input, request) {
  const row = input.sampleManifest?.selectedRows?.[request.manifestOrdinal - 1];
  return input.itemLeaves?.find(({ itemId }) => itemId === row?.itemId)
    ?? input.itemLeaves?.[request.manifestOrdinal - 1];
}

function semanticKey(value) {
  return `${value?.itemHash}:${value?.role}:${value?.ledgerPrefixTerminalHash ?? "EMPTY"}:${value?.attemptOrdinal}`;
}

function evidenceReceipt(input, values) {
  const receipt = sealV5R3Artifact({
    schemaVersion: "RoleAttemptEvidenceReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    compatibilityAuthorizationHash: input.authorization.compatibilityAuthorizationHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    attemptId: values.request.attemptId,
    provider: input.authorization.provider,
    role: values.request.role,
    itemHash: values.request.itemHash,
    itemIdPseudonym: values.request.itemIdPseudonym,
    attemptStatus: values.completion.attemptStatus,
    requestArtifactHash: values.request.selfHash,
    compatibilityRequestArtifactHash: values.request.compatibilityRequestArtifactHash,
    dispatchAuditHash: values.audit.selfHash,
    semanticDispatchAuthorityHash: values.semanticAuthority?.selfHash ?? null,
    reservationHash: values.reservation.selfHash,
    dispatchPermitHash: values.permit.selfHash,
    compatibilityDispatchPermitHash: values.compatibilityPermit.selfHash,
    rawResponseArtifactHash: values.raw.selfHash,
    rawResponseBindingReceiptHash: values.binding.selfHash,
    providerEventReceiptHash: values.event.selfHash,
    roleOutputHash: values.roleOutput?.selfHash ?? null,
    completionHash: values.completion.selfHash,
    resolvedAttemptReceiptHash: values.resolved.selfHash,
    attemptCommitIntentHash: values.intent.selfHash,
    rawResponseReparsed: values.rawReparsed,
    lineageRebuilt: true,
    naturalQuestionReferenceInputCount: values.request.referenceInputCount,
    derivedAt: input.derivedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, ROLE_ATTEMPT_SCHEMA, receipt.schemaVersion);
  return receipt;
}

export function reconstructAttemptGraphV5R7(input) {
  const errors = [];
  const ledgerEntries = input.ledgerEntries ?? [];
  const innerAuthorization = input.authorization?.compatibilityAuthorization;
  errors.push(...validateExecutionLedgerEntriesV5R4({ entries: ledgerEntries,
    authorization: innerAuthorization, inventory: input.inventory }).map((error) => `ledger: ${error}`));
  const reservations = ledgerEntries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const completions = ledgerEntries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED");
  const completionByReservation = uniqueMap(completions, "reservationHash", errors, "completion reservation");
  const requestByCompatibilityHash = uniqueMap(input.requestArtifacts ?? [],
    "compatibilityRequestArtifactHash", errors, "outer request compatibility hash");
  const auditByHash = uniqueMap(input.dispatchAudits ?? [], "selfHash", errors, "dispatch audit");
  const semanticAuthorityByKey = uniqueMap((input.semanticDispatchAuthorities ?? []).map((authority) => ({
    semanticKey: semanticKey(authority), authority,
  })), "semanticKey", errors, "semantic dispatch authority");
  const permitByHash = uniqueMap(input.dispatchPermits ?? [], "selfHash", errors, "outer dispatch permit");
  const compatibilityPermitByHash = uniqueMap(input.compatibilityDispatchPermits ?? [], "selfHash", errors,
    "compatibility dispatch permit");
  const rawByHash = uniqueMap(input.rawResponseArtifacts ?? [], "selfHash", errors, "raw response artifact");
  const bindingByHash = uniqueMap(input.rawResponseBindingReceipts ?? [], "selfHash", errors, "raw binding receipt");
  const intentByHash = uniqueMap(input.attemptCommitIntents ?? [], "selfHash", errors, "attempt commit intent");
  const resolvedByReservation = uniqueMap(input.resolvedAttemptReceipts ?? [], "reservationHash", errors,
    "resolved attempt reservation");
  const roleAttemptEvidenceReceipts = [];
  let rawReparseFailureCount = 0;

  for (const reservation of reservations) {
    const completion = completionByReservation.get(reservation.selfHash);
    if (!completion) continue;
    const resolved = resolvedByReservation.get(reservation.selfHash);
    const request = requestByCompatibilityHash.get(reservation.requestArtifactHash);
    if (!resolved || !request) {
      errors.push(`${reservation.attemptId}: resolved receipt or exact outer request is absent`);
      continue;
    }
    const audit = auditByHash.get(resolved.dispatchAuditHash);
    const permit = permitByHash.get(resolved.dispatchPermitHash);
    const compatibilityPermit = compatibilityPermitByHash.get(resolved.compatibilityDispatchPermitHash);
    const raw = rawByHash.get(resolved.rawResponseArtifactHash);
    const binding = bindingByHash.get(resolved.rawResponseBindingReceiptHash);
    const intent = intentByHash.get(resolved.attemptCommitIntentHash);
    const event = completion.providerEventReceipt;
    const roleOutput = completion.roleOutput;
    if (!audit || !permit || !compatibilityPermit || !raw || !binding || !intent) {
      errors.push(`${reservation.attemptId}: audit/permit/raw/binding/intent evidence is incomplete`);
      continue;
    }
    const schemaErrors = [
      ...validateClosedSelfHashedArtifactV5R7(request, "ProviderRequestArtifactV5"),
      ...validateClosedSelfHashedArtifactV5R7(audit, audit.schemaVersion),
      ...validateClosedSelfHashedArtifactV5R7(permit, permit.schemaVersion),
      ...validateClosedSelfHashedArtifactV5R7(compatibilityPermit, "ProviderDispatchPermitV3"),
      ...validateRawResponseArtifactV5R6(raw),
      ...validateRawResponseBindingReceiptV5R6(binding),
      ...validateClosedSelfHashedArtifactV5R7(event, "ProviderEventReceiptV4"),
      ...validateClosedSelfHashedArtifactV5R7(completion, "ProviderDispatchCompletionV2"),
      ...validateClosedSelfHashedArtifactV5R7(intent, "ProviderAttemptCommitIntentV1"),
      ...validateClosedSelfHashedArtifactV5R7(resolved, "ResolvedProviderAttemptReceiptV2"),
    ];
    if (roleOutput) schemaErrors.push(...validateClosedSelfHashedArtifactV5R7(roleOutput, "ProviderRoleOutputV1"));
    if (schemaErrors.length > 0) {
      errors.push(...schemaErrors.map((error) => `${reservation.attemptId}: ${error}`));
      continue;
    }
    const prefix = ledgerEntries.slice(0, ledgerEntries.indexOf(reservation));
    const itemLeaf = findLeaf(input, request);
    const requestErrors = validateAndRebuildProviderRequestArtifactV5R6({
      activeRegistration: input.activeRegistration,
      authorization: input.authorization,
      registration: input.registration,
      inventory: input.inventory,
      sampleManifest: input.sampleManifest,
      itemLeaf,
      role: request.role,
      attemptId: request.attemptId,
      ledgerEntries: prefix,
      requestArtifact: request,
    });
    errors.push(...requestErrors.map((error) => `${reservation.attemptId}: request: ${error}`));
    const runtimeState = {
      ...input,
      requestArtifact: request,
      ledgerEntries: prefix,
      mode: audit.executionPlan?.mode ?? audit.mode,
      at: audit.issuedAt,
      canaryPredicateReceipt: audit.canaryPredicateReceiptHash
        ? input.canaryPredicateReceipt : null,
      canaryPredicateInput: audit.canaryPredicateReceiptHash
        ? input.canaryPredicateInput : null,
      canaryGate: audit.canaryGateHash ? input.canaryGate : null,
      canaryGateContext: audit.canaryGateHash ? input.canaryGateContext : null,
      c0ExecutionSet: audit.c0ExecutionSetHash ? input.c0ExecutionSet
        : audit.executionPlan?.mode === "DEEPSEEK_CANARY" && audit.canaryPredicateReceiptHash
          ? buildCompatibilityCanaryC0DecisionSetV5R7(input.canaryPredicateReceipt) : null,
      predicateInputsByItem: audit.c0ExecutionSetHash ? input.predicateInputsByItem : null,
    };
    const nativeAuthority = ["SemanticDispatchAuthorityReceiptV1",
      "ReferenceDispatchAuthorityReceiptV1"].includes(audit.schemaVersion);
    const auditErrors = nativeAuthority
      ? audit.schemaVersion === "SemanticDispatchAuthorityReceiptV1"
        ? validateSemanticDispatchAuthorityV5R7({
          ...runtimeState,
          c0ExecutionSet: audit.c0ExecutionSetHash ? input.c0ExecutionSet : null,
          predicateInputsByItem: audit.c0ExecutionSetHash ? input.predicateInputsByItem : null,
          semanticDispatchAuthority: audit,
        })
        : validateReferenceDispatchAuthorityV5R7({
          ...runtimeState,
          referenceDispatchAuthority: audit,
        })
      : validateStateBoundDispatchAuditV5R6({
        ...runtimeState,
        dispatchAudit: audit,
      });
    errors.push(...auditErrors.map((error) => `${reservation.attemptId}: dispatch audit: ${error}`));
    let permitErrors = [];
    try {
      if (permit.schemaVersion === "ProviderDispatchPermitV5") {
        permitErrors.push(...validateProviderDispatchPermitV5R7({
          permit,
          input: { ...runtimeState, dispatchAuthority: audit,
            dispatchAuthorityContext: runtimeState },
          reservation,
        }));
      } else {
        const rebuiltPermit = buildResolvedDispatchPermitV5R6({
          input: runtimeState,
          reservation,
          dispatchAudit: audit,
        });
        if (canonicalJsonV5R3(rebuiltPermit) !== canonicalJsonV5R3(permit)) {
          permitErrors.push("outer dispatch permit differs from exact audit/request/reservation reconstruction");
        }
      }
    } catch (error) {
      permitErrors.push(error instanceof Error ? error.message : String(error));
    }
    errors.push(...permitErrors.map((error) => `${reservation.attemptId}: dispatch permit: ${error}`));
    let semanticAuthority = null;
    let semanticErrors = [];
    if (input.authorization.provider === "DEEPSEEK_DIRECT") {
      const semanticAttemptOrdinal = reservations.slice(0, reservations.indexOf(reservation))
        .filter(({ itemHash, role }) => itemHash === reservation.itemHash && role === reservation.role).length + 1;
      semanticAuthority = audit.schemaVersion === "SemanticDispatchAuthorityReceiptV1" ? audit
        : semanticAuthorityByKey.get(`${reservation.itemHash}:${reservation.role}:${
          prefix.at(-1)?.selfHash ?? "EMPTY"}:${semanticAttemptOrdinal}`)?.authority;
      if (!semanticAuthority) {
        semanticErrors.push("exact pre-reservation semantic dispatch authority is absent");
      } else {
        semanticErrors.push(...validateSemanticDispatchAuthorityV5R7({
          ...runtimeState,
          c0ExecutionSet: semanticAuthority.c0ExecutionSetHash ? input.c0ExecutionSet : null,
          predicateInputsByItem: semanticAuthority.c0ExecutionSetHash
            ? input.predicateInputsByItem : null,
          semanticDispatchAuthority: semanticAuthority,
        }));
        if (semanticAuthority.itemIdPseudonym !== request.itemIdPseudonym
          || semanticAuthority.manifestOrdinal !== request.manifestOrdinal) {
          semanticErrors.push("semantic authority item identity differs from the exact request");
        }
      }
    }
    errors.push(...semanticErrors.map((error) => `${reservation.attemptId}: semantic authority: ${error}`));
    let rawReparsed = false;
    if (completion.attemptStatus === "SUCCEEDED") {
      try {
        const replay = independentlyReparseRawResponseV5R6({ rawResponseArtifact: raw, requestArtifact: request });
        rawReparsed = binding.independentReparseVerified === true
          && binding.parsedPayloadHash === replay.parsedPayloadHash
          && binding.roleOutputHash === roleOutput?.selfHash
          && roleOutput?.parsedPayloadHash === replay.parsedPayloadHash
          && canonicalJsonV5R3(roleOutput?.parsedPayload) === canonicalJsonV5R3(replay.parsedPayload);
        if (!rawReparsed) throw new Error("raw replay differs from binding or role output");
      } catch (error) {
        rawReparseFailureCount += 1;
        errors.push(`${reservation.attemptId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      rawReparsed = false;
    }
    const common = {
      activeRunnerRegistrationHash: input.activeRegistration.selfHash,
      authorizationHash: input.authorization.selfHash,
      authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
      requestArtifact: request,
      dispatchAudit: audit,
      reservation,
      dispatchPermit: permit,
      compatibilityDispatchPermit: compatibilityPermit,
      rawResponseArtifact: raw,
      rawResponseBindingReceipt: binding,
      providerEventReceipt: event,
      roleOutput,
      preparedCompletion: completion,
      rawAndBindingDurable: true,
      projectResidency: input.authorization.projectResidency,
      dataRegion: input.authorization.dataRegion,
      credentialReadCount: resolved.credentialReadCount,
    };
    const intentErrors = validateProviderAttemptCommitIntentV5R7({ ...common, intent });
    const resolvedErrors = validateResolvedProviderAttemptReceiptV5R7({ ...common,
      intent, committedCompletion: completion, resolvedAttemptReceipt: resolved });
    errors.push(...intentErrors.map((error) => `${reservation.attemptId}: intent: ${error}`));
    errors.push(...resolvedErrors.map((error) => `${reservation.attemptId}: resolved: ${error}`));
    if (requestErrors.length === 0 && auditErrors.length === 0 && permitErrors.length === 0
      && semanticErrors.length === 0 && intentErrors.length === 0 && resolvedErrors.length === 0
      && (completion.attemptStatus !== "SUCCEEDED" || rawReparsed)) {
      roleAttemptEvidenceReceipts.push(evidenceReceipt(input, { request, audit, reservation, permit,
        compatibilityPermit, semanticAuthority, raw, binding, event, roleOutput, completion, resolved, intent,
        rawReparsed }));
    }
  }

  for (const resolved of input.resolvedAttemptReceipts ?? []) {
    if (!reservations.some(({ selfHash }) => selfHash === resolved.reservationHash)) {
      errors.push(`${resolved.attemptId}: resolved attempt has no ledger reservation`);
    }
  }
  const activeReservationCount = reservations.filter(({ selfHash }) => !completionByReservation.has(selfHash)).length;
  const lineageErrors = [...new Set(errors)].sort();
  const graphStatus = lineageErrors.length === 0 && activeReservationCount === 0
    && roleAttemptEvidenceReceipts.length === completions.length ? "COMPLETE_VALID" : "INCOMPLETE_OR_INVALID";
  const receipt = sealV5R3Artifact({
    schemaVersion: "AttemptGraphReconstructionReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRegistration.selfHash,
    authorizationHash: input.authorization.selfHash,
    sampleExecutionInventoryHash: input.inventory.selfHash,
    provider: input.authorization.provider,
    ledgerEntryRootHash: root(ledgerEntries.map(({ selfHash }) => selfHash)),
    ledgerTerminalHash: ledgerEntries.at(-1)?.selfHash ?? null,
    requestArtifactRootHash: root((input.requestArtifacts ?? []).map(({ selfHash }) => selfHash)),
    dispatchAuditRootHash: root((input.dispatchAudits ?? []).map(({ selfHash }) => selfHash)),
    semanticDispatchAuthorityRootHash: root((input.semanticDispatchAuthorities ?? [])
      .map(({ selfHash }) => selfHash)),
    rawResponseArtifactRootHash: root((input.rawResponseArtifacts ?? []).map(({ selfHash }) => selfHash)),
    rawResponseBindingRootHash: root((input.rawResponseBindingReceipts ?? []).map(({ selfHash }) => selfHash)),
    attemptCommitIntentRootHash: root((input.attemptCommitIntents ?? []).map(({ selfHash }) => selfHash)),
    resolvedAttemptReceiptRootHash: root((input.resolvedAttemptReceipts ?? []).map(({ selfHash }) => selfHash)),
    roleAttemptEvidenceRootHash: root(roleAttemptEvidenceReceipts.map(({ selfHash }) => selfHash)),
    roleAttemptEvidenceReceipts,
    reservationCount: reservations.length,
    completionCount: completions.length,
    resolvedAttemptCount: input.resolvedAttemptReceipts?.length ?? 0,
    successfulAttemptCount: completions.filter(({ attemptStatus }) => attemptStatus === "SUCCEEDED").length,
    failedAttemptCount: completions.filter(({ attemptStatus }) => attemptStatus !== "SUCCEEDED").length,
    activeReservationCount,
    rawReparseFailureCount,
    lineageErrorCount: lineageErrors.length,
    lineageErrors,
    graphStatus,
    derivedAt: input.derivedAt,
  });
  assertClosedSelfHashedAgainstV5R5(receipt, GRAPH_SCHEMA, receipt.schemaVersion);
  return Object.freeze({ receipt, roleAttemptEvidenceReceipts: Object.freeze(roleAttemptEvidenceReceipts) });
}

export function validateAttemptGraphReconstructionReceiptV5R7({ attemptGraphReceipt, ...input }) {
  const errors = [...validateClosedSelfHashedAgainstV5R5(attemptGraphReceipt, GRAPH_SCHEMA)];
  try {
    const rebuilt = reconstructAttemptGraphV5R7({ ...input, derivedAt: attemptGraphReceipt?.derivedAt });
    if (canonicalJsonV5R3(rebuilt.receipt) !== canonicalJsonV5R3(attemptGraphReceipt)) {
      errors.push("R7 attempt graph differs from exact ledger/request/raw/binding/intent/completion reconstruction");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return Object.freeze([...new Set(errors)]);
}

export function roleOutputByEvidenceV5R7({ roleAttemptEvidenceReceipts, ledgerEntries }) {
  const outputByHash = new Map((ledgerEntries ?? []).filter(({ entryType, roleOutput }) =>
    entryType === "DISPATCH_COMPLETED" && roleOutput).map(({ roleOutput }) => [roleOutput.selfHash, roleOutput]));
  return roleAttemptEvidenceReceipts.map((receipt) => {
    const errors = validateClosedSelfHashedAgainstV5R5(receipt, ROLE_ATTEMPT_SCHEMA);
    const output = outputByHash.get(receipt.roleOutputHash);
    if (errors.length > 0 || !output || output.attemptId !== receipt.attemptId
      || output.itemHash !== receipt.itemHash || output.itemIdPseudonym !== receipt.itemIdPseudonym
      || output.role !== receipt.role || output.attemptReceiptHash !== receipt.providerEventReceiptHash
      || output.requestArtifactHash !== receipt.compatibilityRequestArtifactHash
      || output.authorizationHash !== receipt.compatibilityAuthorizationHash
      || output.sampleExecutionInventoryHash !== receipt.sampleExecutionInventoryHash) {
      throw new TypeError(`R7 role evidence cannot resolve its exact compatibility role output: ${errors.join("; ")}`);
    }
    return output;
  });
}

export const ATTEMPT_GRAPH_V5_R7_CONSTANTS = Object.freeze({
  rawResponseIsAuthoritative: true,
  resolvedAttemptRequiresPriorCommitIntent: true,
  graphValidationRebuildsEveryLineageEdge: true,
  semanticDispatchValidationPerformedSeparatelyAtTransportAndFinalVerify: true,
});
