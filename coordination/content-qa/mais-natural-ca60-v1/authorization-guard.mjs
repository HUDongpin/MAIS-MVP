import ON_DISK_DESIGN_REGISTRATION from "../../research/mais-natural-ca60-v1/versions/design-v4/design-registration.json" with { type: "json" };
import {
  authorizeDispatchCheckV4,
  canonicalJson,
  validateFrozenProviderRequest,
  validateProviderAuthorizationV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  calculateRegistrationHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/validate-design-registration.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V4";
const FROZEN_LIFECYCLE = "FROZEN_PRE_EXECUTION_DESIGN_REGISTRATION";
const FIXTURE_TRANSPORT_KIND = "FIXTURE_ONLY_NO_NETWORK_V1";
const SHA256 = /^[0-9a-f]{64}$/u;

const REQUEST_FIELDS = Object.freeze([
  "provider",
  "model",
  "endpoint",
  "role",
  "providerInput",
  "wireRequest",
  "reserveTokens",
  "reserveUsd",
]);

const BUDGET_FIELDS = Object.freeze([
  "attemptsUsed",
  "successfulCallsUsed",
  "totalTokensUsed",
  "estimatedUsdUsed",
  "pendingReservedTokens",
  "pendingReservedUsd",
  "concurrencyActive",
]);

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactFields(value, expected) {
  return plainObject(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...expected].sort());
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function add(errors, error) {
  if (typeof error === "string" && error.length > 0 && !errors.includes(error)) errors.push(error);
}

function validateFrozenDesignRegistration(designRegistration) {
  const errors = [];
  if (!plainObject(designRegistration)) return ["design registration is missing"];
  if (designRegistration.designId !== DESIGN_ID) add(errors, "design registration identity mismatch");
  if (designRegistration.designKind !== "IMMUTABLE_PRE_EXECUTION_DESIGN_REGISTRATION"
    || designRegistration.lifecycleStatus !== FROZEN_LIFECYCLE
    || designRegistration.freezeAllowed !== true) {
    add(errors, "design registration is a candidate or is not frozen for execution registration");
  }
  if (!Array.isArray(designRegistration.blockingDecisionCodes)
    || designRegistration.blockingDecisionCodes.length !== 0) {
    add(errors, "design registration retains blocking decision codes");
  }
  if (!validTimestamp(designRegistration.frozenAt)
    || !validTimestamp(designRegistration.thresholdsFrozenAt)
    || Date.parse(designRegistration.thresholdsFrozenAt) > Date.parse(designRegistration.frozenAt)) {
    add(errors, "decision thresholds were not frozen before the design registration");
  }
  if (designRegistration.providerEventCount !== 0
    || designRegistration.preExecutionState?.providerEventCount !== 0) {
    add(errors, "design registration does not prove a zero-provider-event pre-execution state");
  }
  if (!SHA256.test(designRegistration.registrationHash ?? "")) {
    add(errors, "design registration hash is missing or malformed");
  } else {
    try {
      if (calculateRegistrationHash(designRegistration) !== designRegistration.registrationHash) {
        add(errors, "design registration self-hash mismatch");
      }
    } catch (error) {
      add(errors, `design registration hash could not be verified: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  return errors;
}

function validateRequest(request, authorization) {
  const errors = [];
  if (!exactFields(request, REQUEST_FIELDS)) return ["provider request envelope fields are invalid"];
  if (request.provider !== authorization?.provider
    || request.model !== authorization?.model
    || request.endpoint !== authorization?.endpoint) {
    add(errors, "provider request tuple differs from the authorization tuple");
  }
  if (!authorization?.roleSet?.includes(request.role)) add(errors, "provider request role is not authorized");
  if (!plainObject(request.providerInput) || !plainObject(request.wireRequest)) {
    add(errors, "provider request input or wire body is invalid");
  } else {
    try {
      for (const error of validateFrozenProviderRequest(request.wireRequest, request.role, request.providerInput)) {
        add(errors, `frozen provider request: ${error}`);
      }
    } catch (error) {
      add(errors, `frozen provider request validation failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  if (!Number.isSafeInteger(request.reserveTokens) || request.reserveTokens <= 0) {
    add(errors, "provider request token reserve must be a positive integer");
  }
  if (!Number.isFinite(request.reserveUsd) || request.reserveUsd <= 0) {
    add(errors, "provider request USD reserve must be positive and finite");
  }
  return errors;
}

function validateBudgetState(budgetState, request, authorization) {
  const errors = [];
  if (!exactFields(budgetState, BUDGET_FIELDS)) return ["budget state fields are invalid"];
  for (const field of ["attemptsUsed", "successfulCallsUsed", "totalTokensUsed", "pendingReservedTokens", "concurrencyActive"]) {
    if (!Number.isSafeInteger(budgetState[field]) || budgetState[field] < 0) add(errors, `budget ${field} is invalid`);
  }
  for (const field of ["estimatedUsdUsed", "pendingReservedUsd"]) {
    if (!Number.isFinite(budgetState[field]) || budgetState[field] < 0) add(errors, `budget ${field} is invalid`);
  }
  if (errors.length > 0 || !plainObject(authorization)) return errors;
  if (budgetState.attemptsUsed + 1 > authorization.maximumAttempts) add(errors, "provider attempt cap is exhausted");
  if (budgetState.successfulCallsUsed + 1 > authorization.maximumSuccessfulCalls) add(errors, "provider successful-call cap is exhausted");
  if (budgetState.totalTokensUsed + budgetState.pendingReservedTokens + request.reserveTokens > authorization.maximumTokens) {
    add(errors, "provider token cap cannot cover the pessimistic request reserve");
  }
  if (budgetState.estimatedUsdUsed + budgetState.pendingReservedUsd + request.reserveUsd > authorization.maximumEstimatedUsd) {
    add(errors, "provider USD cost cap cannot cover the pessimistic request reserve");
  }
  if (budgetState.concurrencyActive + 1 > authorization.concurrencyCap) add(errors, "provider concurrency cap is exhausted");
  return errors;
}

/**
 * Pure preflight used by the pinned production wrapper and by offline tests.
 * A true result authorizes only the A21 fixture transport. It is not a live
 * provider authorization and never increments an HTTP counter.
 */
export function evaluateProviderDispatchPreflightForTestOnlyV1({
  designRegistration,
  authorization,
  trustedAuthorization,
  request,
  budgetState,
  transport,
}) {
  const errors = validateFrozenDesignRegistration(designRegistration);
  if (!plainObject(authorization)) {
    add(errors, "provider authorization is missing");
  }
  if (!plainObject(trustedAuthorization)) {
    add(errors, "trusted out-of-band authorization roots are missing");
  }
  if (plainObject(authorization) && plainObject(designRegistration)
    && authorization.registrationHash !== designRegistration.registrationHash) {
    add(errors, "provider authorization does not bind the frozen design registration");
  }
  if (plainObject(authorization) && validTimestamp(designRegistration?.frozenAt)
    && (!validTimestamp(authorization.issuedAt)
      || Date.parse(authorization.issuedAt) <= Date.parse(designRegistration.frozenAt))) {
    add(errors, "provider authorization was not issued after design freeze");
  }
  if (plainObject(authorization) && plainObject(trustedAuthorization)) {
    try {
      for (const error of validateProviderAuthorizationV4(authorization, trustedAuthorization)) {
        add(errors, `provider authorization: ${error}`);
      }
      const rootCheck = authorizeDispatchCheckV4({
        supplied: {
          authorizationHash: authorization.authorizationHash,
          priceSnapshotHash: authorization.priceSnapshot?.priceSnapshotHash,
          ownerGrantRootHash: authorization.ownerGrantHash,
        },
        trusted: {
          authorizationHash: trustedAuthorization.trustedAuthorizationHash,
          priceSnapshotHash: trustedAuthorization.trustedPriceSnapshotHash,
          ownerGrantRootHash: trustedAuthorization.trustedOwnerGrantRootHash,
        },
      });
      rootCheck.errors.forEach((error) => add(errors, `out-of-band authorization root: ${error}`));
    } catch (error) {
      add(errors, `provider authorization validation failed: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }
  validateRequest(request, authorization).forEach((error) => add(errors, error));
  validateBudgetState(budgetState, request ?? {}, authorization).forEach((error) => add(errors, error));
  if (!plainObject(transport) || transport.kind !== FIXTURE_TRANSPORT_KIND || typeof transport.send !== "function") {
    add(errors, "A21 permits only the fixture-only no-network transport; live transport remains A07-owned");
  }
  return Object.freeze({
    schemaVersion: "ProviderDispatchPreflightV1",
    executionMode: "OFFLINE_FIXTURE_ONLY",
    dispatchAllowed: errors.length === 0,
    httpRequestCount: 0,
    fixtureDispatchCount: 0,
    errors: Object.freeze([...errors]),
  });
}

/**
 * Test-only execution seam. It accepts an explicit design registration so the
 * valid branch can be proven without mutating the tracked on-disk candidate.
 * The transport-kind check makes this incapable of representing live proof.
 */
export async function dispatchFixtureTransportAgainstExplicitRegistrationForTestV1(input) {
  const preflight = evaluateProviderDispatchPreflightForTestOnlyV1(input);
  if (!preflight.dispatchAllowed) return preflight;
  const response = await input.transport.send(Object.freeze({
    provider: input.request.provider,
    model: input.request.model,
    endpoint: input.request.endpoint,
    role: input.request.role,
    wireRequest: structuredClone(input.request.wireRequest),
  }));
  return Object.freeze({
    ...preflight,
    fixtureDispatchCount: 1,
    transportKind: FIXTURE_TRANSPORT_KIND,
    response,
  });
}

/**
 * Runtime entrypoint. The registration trust root is hard-pinned to the file
 * adjacent to the V4 package; callers cannot substitute a frozen-looking
 * object. While V4 remains a candidate this function always returns zero
 * dispatches, even when a test authorization is supplied.
 */
export async function dispatchAuthorizedFixtureTransportV1(input) {
  return dispatchFixtureTransportAgainstExplicitRegistrationForTestV1({
    ...input,
    designRegistration: ON_DISK_DESIGN_REGISTRATION,
  });
}
