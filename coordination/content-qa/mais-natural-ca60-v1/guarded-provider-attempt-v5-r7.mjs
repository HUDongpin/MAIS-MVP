import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  buildRawResponseBindingReceiptV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  runGuardedProviderAttemptV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  buildProviderAttemptCommitIntentV5R7,
  buildResolvedProviderAttemptReceiptV5R7,
} from "./attempt-transaction-v5-r7.mjs";
import {
  validateSemanticDispatchAuthorityV5R7,
} from "./semantic-dispatch-v5-r7.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function correctedCompatibilityRoleOutput(input, roleOutput) {
  if (roleOutput === null) return null;
  const { selfHash: _ignored, ...body } = roleOutput;
  return sealV5R3Artifact({
    ...body,
    runnerRegistrationHash: input.registration.selfHash,
  });
}

function knownActivity(transportResult, fallback = {}) {
  return Object.freeze({
    providerEventCount: transportResult?.providerEventCount ?? fallback.providerEventCount ?? null,
    httpRequestCount: transportResult?.httpRequestCount ?? fallback.httpRequestCount ?? null,
    credentialReadCount: transportResult?.credentialReadCount ?? fallback.credentialReadCount ?? null,
    naturalQuestionEgressCount: transportResult?.providerEventCount ?? fallback.naturalQuestionEgressCount ?? null,
    activityStatus: transportResult ? "KNOWN_FROM_TRANSPORT" : "UNKNOWN_FAIL_CLOSED",
  });
}

function persistedHash(result, value) {
  return result?.contentHash ?? result?.artifact?.selfHash ?? result?.binding?.selfHash
    ?? value?.selfHash ?? null;
}

export class ProviderAttemptFailureV5R7 extends Error {
  constructor(message, activity, cause) {
    super(message, { cause });
    this.name = "ProviderAttemptFailureV5R7";
    this.activity = activity;
  }
}

export async function runGuardedProviderAttemptV5R7(input) {
  requireCondition(input?.transport?.kind === "V5_R6_RESOLVED_STATE_BOUND_EXACT_TRANSPORT"
    && typeof input.transport.send === "function",
  "R7 guarded attempt requires the exact compatibility transport");
  requireCondition(typeof input?.ledger?.reserve === "function"
    && typeof input.ledger.completeWithDurableIntent === "function",
  "R7 guarded attempt requires the intent-aware append-only ledger");
  requireCondition(typeof input?.rawResponseStore?.persist === "function"
    && typeof input.rawResponseStore.persistBinding === "function"
    && typeof input?.dispatchAuditStore?.append === "function"
    && typeof input?.dispatchPermitStore?.append === "function"
    && typeof input?.compatibilityDispatchPermitStore?.append === "function"
    && typeof input?.attemptCommitIntentStore?.append === "function"
    && typeof input?.resolvedAttemptReceiptStore?.append === "function",
  "R7 guarded attempt requires append-only audit/raw/binding/intent/final stores");

  const isDeepSeek = input.authorization?.provider === "DEEPSEEK_DIRECT";
  if (isDeepSeek) {
    requireCondition(typeof input?.semanticDispatchAuthorityStore?.append === "function",
      "R7 DeepSeek attempt requires an append-only semantic-authority store");
    const semanticErrors = validateSemanticDispatchAuthorityV5R7({
      ...(input.semanticDispatchContext ?? input),
      semanticDispatchAuthority: input.semanticDispatchAuthority,
    });
    requireCondition(semanticErrors.length === 0,
      `R7 semantic authority rejected before reservation: ${semanticErrors.join("; ")}`);
    const semanticPersisted = await input.semanticDispatchAuthorityStore.append(input.semanticDispatchAuthority);
    requireCondition(semanticPersisted?.contentHash === input.semanticDispatchAuthority.selfHash,
      "R7 semantic authority was not durably appended before reservation");
  } else {
    requireCondition(input.semanticDispatchAuthority == null,
      "OpenAI reference attempts cannot carry DeepSeek semantic authority");
  }

  let rawResponseArtifact = null;
  let originalBinding = null;
  let compatibilityAudit = null;
  let outerPermit = null;
  let compatibilityPermit = null;
  let correctedRoleOutput = null;
  let correctedBinding = null;
  let intent = null;
  let resolvedAttemptReceipt = null;
  let transportResult = null;
  let currentReservation = null;

  const rawResponseStore = {
    persist: async (value) => {
      const persisted = await input.rawResponseStore.persist(value);
      rawResponseArtifact = persisted.artifact;
      return persisted;
    },
    persistBinding: async (value) => {
      // Retain the compatibility binding, but do not treat it as the R7
      // authority. The corrected compatibility role output and its exact
      // binding are durably written in the intent-aware completion adapter.
      const persisted = await input.rawResponseStore.persistBinding(value);
      originalBinding = value;
      return persisted;
    },
  };

  const dispatchAuditStore = {
    append: async (value) => {
      compatibilityAudit = value;
      if (isDeepSeek) {
        requireCondition(value.itemHash === input.semanticDispatchAuthority.itemHash
          && value.role === input.semanticDispatchAuthority.role
          && value.executionPlan?.failedAttemptsForItemRole
            === input.semanticDispatchAuthority.failedAttemptsForItemRole,
        "R7 semantic authority differs from the exact compatibility plan");
      }
      const persisted = await input.dispatchAuditStore.append(value);
      requireCondition(persisted?.contentHash === value.selfHash,
        "compatibility dispatch audit was not durably appended before reservation");
      return persisted;
    },
  };

  const transport = Object.freeze({
    kind: "V5_R6_RESOLVED_STATE_BOUND_EXACT_TRANSPORT",
    async send(args) {
      outerPermit = args.permit;
      requireCondition(compatibilityAudit
        && canonicalJsonV5R3(args.dispatchAudit) === canonicalJsonV5R3(compatibilityAudit),
      "R7 transport received an audit different from the pre-reservation durable audit");
      if (isDeepSeek) {
        const semanticErrors = validateSemanticDispatchAuthorityV5R7({
          ...(input.semanticDispatchContext ?? input),
          semanticDispatchAuthority: input.semanticDispatchAuthority,
        });
        requireCondition(semanticErrors.length === 0
          && input.semanticDispatchAuthority.itemHash === args.dispatchAudit.itemHash
          && input.semanticDispatchAuthority.role === args.dispatchAudit.role,
        `R7 transport rejected semantic authority before credential read: ${semanticErrors.join("; ")}`);
      }
      const permitPersisted = await input.dispatchPermitStore.append(outerPermit);
      requireCondition(persistedHash(permitPersisted, outerPermit) === outerPermit.selfHash,
        "R7 outer dispatch permit was not durably appended before credential read");
      transportResult = await input.transport.send(args);
      return transportResult;
    },
  });

  const ledger = {
    reserve: (value) => input.ledger.reserve(value),
    complete: async ({ reservationHash, providerEventReceipt, roleOutput }) => {
      requireCondition(rawResponseArtifact && originalBinding && compatibilityAudit && outerPermit,
        "R7 completion cannot precede raw, compatibility binding, audit, and permit custody");
      compatibilityPermit = providerEventReceipt.dispatchPermit;
      const compatibilityPermitPersisted = await input.compatibilityDispatchPermitStore
        .append(compatibilityPermit);
      requireCondition(persistedHash(compatibilityPermitPersisted, compatibilityPermit)
        === compatibilityPermit.selfHash,
      "R7 compatibility dispatch permit was not durably appended before attempt intent");
      correctedRoleOutput = correctedCompatibilityRoleOutput(input, roleOutput);
      correctedBinding = buildRawResponseBindingReceiptV5R6({
        activeRunnerRegistrationHash: input.activeRegistration.selfHash,
        rawResponseArtifact,
        providerEventReceipt,
        roleOutput: correctedRoleOutput,
        requestArtifact: input.requestArtifact,
        boundAt: originalBinding.boundAt,
      });
      const bindingPersisted = await input.rawResponseStore.persistBinding(correctedBinding);
      requireCondition(persistedHash(bindingPersisted, correctedBinding) === correctedBinding.selfHash
        && bindingPersisted.persistedBeforeCompletion === true,
      "R7 corrected raw binding was not durably appended before completion");
      const committed = await input.ledger.completeWithDurableIntent({
        reservationHash,
        providerEventReceipt,
        roleOutput: correctedRoleOutput,
        persistIntent: async (preparedCompletion) => {
          intent = buildProviderAttemptCommitIntentV5R7({
            ...input,
            activeRunnerRegistrationHash: input.activeRegistration.selfHash,
            authorizationHash: input.authorization.selfHash,
            dispatchAudit: compatibilityAudit,
            reservation: currentReservation,
            dispatchPermit: outerPermit,
            compatibilityDispatchPermit: compatibilityPermit,
            rawResponseArtifact,
            rawResponseBindingReceipt: correctedBinding,
            providerEventReceipt,
            roleOutput: correctedRoleOutput,
            preparedCompletion,
            rawAndBindingDurable: true,
            preparedAt: providerEventReceipt.finishedAt,
          });
          const persisted = await input.attemptCommitIntentStore.append(intent);
          requireCondition(persisted?.contentHash === intent.selfHash,
            "R7 attempt intent was not durably appended before completion");
          return { intent, contentHash: intent.selfHash };
        },
      });
      requireCondition(intent && committed?.intentHash === intent.selfHash,
        "R7 completion does not bind its prior durable intent");
      resolvedAttemptReceipt = buildResolvedProviderAttemptReceiptV5R7({
        ...input,
        activeRunnerRegistrationHash: input.activeRegistration.selfHash,
        authorizationHash: input.authorization.selfHash,
        authenticatedRouteEvidenceHash: input.authenticatedRouteEvidence.selfHash,
        projectResidency: input.authorization.projectResidency,
        dataRegion: input.authorization.dataRegion,
        credentialReadCount: transportResult?.credentialReadCount ?? 0,
        dispatchAudit: compatibilityAudit,
        reservation: currentReservation,
        dispatchPermit: outerPermit,
        compatibilityDispatchPermit: compatibilityPermit,
        rawResponseArtifact,
        rawResponseBindingReceipt: correctedBinding,
        providerEventReceipt,
        roleOutput: correctedRoleOutput,
        preparedCompletion: committed.completion,
        rawAndBindingDurable: true,
        preparedAt: intent.preparedAt,
        intent,
        committedCompletion: committed.completion,
      });
      const finalPersisted = await input.resolvedAttemptReceiptStore.append(resolvedAttemptReceipt);
      requireCondition(finalPersisted?.contentHash === resolvedAttemptReceipt.selfHash,
        "R7 final resolved receipt was not durably appended after completion");
      return committed.completion;
    },
  };

  // Capture the exact reservation selected by the compatibility runner without
  // allowing a caller to inject it into custody reconstruction.
  const originalReserve = ledger.reserve;
  ledger.reserve = async (value) => {
    const reservation = await originalReserve(value);
    currentReservation = reservation;
    return reservation;
  };

  try {
    const compatibilityRun = await runGuardedProviderAttemptV5R6({
      ...input,
      ledger,
      transport,
      rawResponseStore,
      dispatchAuditStore,
      attemptReceiptStore: { append: async (value) => ({ contentHash: value.selfHash }) },
    });
    requireCondition(resolvedAttemptReceipt && intent && correctedBinding
      && compatibilityRun.completion?.selfHash === resolvedAttemptReceipt.compatibilityCompletionHash,
    `R7 compatibility run ended without the complete two-phase outer evidence: ${
      compatibilityRun?.status ?? "NO_STATUS"}: ${(compatibilityRun?.errors ?? []).join("; ")}`);
    return Object.freeze({
      ...compatibilityRun,
      roleOutput: correctedRoleOutput,
      rawResponseArtifact,
      rawResponseBindingReceipt: correctedBinding,
      attemptCommitIntent: intent,
      resolvedAttemptReceipt,
      semanticDispatchAuthority: input.semanticDispatchAuthority ?? null,
      compatibilityDispatchAudit: compatibilityAudit,
      compatibilityResolvedAttemptReceipt: compatibilityRun.resolvedAttemptReceipt,
      activity: knownActivity(transportResult, compatibilityRun),
    });
  } catch (error) {
    throw new ProviderAttemptFailureV5R7(
      error instanceof Error ? error.message : String(error),
      knownActivity(transportResult),
      error,
    );
  }
}

export const GUARDED_PROVIDER_ATTEMPT_V5_R7_CONSTANTS = Object.freeze({
  semanticAuthorityPersistedBeforeReservation: true,
  credentialReadRequiresSemanticAuthorityRebuild: true,
  correctedRawBindingPersistedBeforeCompletion: true,
  commitProtocol: "RAW_BINDING_THEN_INTENT_THEN_COMPLETION_THEN_FINAL_RESOLVED",
  unknownPostProviderActivityMayBeReportedAsZero: false,
});
