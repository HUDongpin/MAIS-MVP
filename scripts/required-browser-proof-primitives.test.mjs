import assert from "node:assert/strict";
import test from "node:test";
import { TextEncoder } from "node:util";

import {
  REQUIRED_BROWSER_PROOF_COMPATIBILITY_VECTORS,
  REQUIRED_BROWSER_PROOF_PRIMITIVES_SCHEMA_VERSION,
  REQUIRED_BROWSER_PROOF_REJECT_VECTORS,
  canonicalizeClosedJson,
  canonicalizeClosedJsonArtifact,
  hashCanonicalProof,
  hashEnvironmentText,
  hashEnvironmentValue,
  verifyCanonicalJsonArtifactBytes,
} from "./required-browser-proof-primitives.mjs";

const TEST_TEXT_ENCODER = new TextEncoder();

const VALUE_ERROR = "REQUIRED_BROWSER_PROOF_VALUE_REJECTED";
const DOMAIN_ERROR = "REQUIRED_BROWSER_PROOF_DOMAIN_REJECTED";
const ENVIRONMENT_KEY_ERROR =
  "REQUIRED_BROWSER_ENVIRONMENT_KEY_REJECTED";
const ENVIRONMENT_BYTES_ERROR =
  "REQUIRED_BROWSER_ENVIRONMENT_BYTES_REJECTED";
const ENVIRONMENT_TEXT_ERROR =
  "REQUIRED_BROWSER_ENVIRONMENT_TEXT_REJECTED";
const ARTIFACT_BYTES_ERROR =
  "REQUIRED_BROWSER_CANONICAL_ARTIFACT_BYTES_REJECTED";

const KNOWN_ANSWER_VECTORS = Object.freeze([
  Object.freeze({
    byteLength: 55,
    canonicalUtf8Hex: "65cc81",
    exactText: "e\u0301",
    expectedSha256:
      "1e0c7429b193fae96a8132d00d363603f4341fc23ef8604e84b49f09a724bd4d",
    framedBytesHex:
      "4d4149535f454e565f56323a303030303030303030303030303030353a4c4142454c3a303030303030303030303030303030333a65cc81",
    id: "environment-text.decomposed",
    key: "LABEL",
  }),
  Object.freeze({
    byteLength: 55,
    canonicalUtf8Hex: "610062",
    exactText: "a\u0000b",
    expectedSha256:
      "dee10c05e0e17dd43cd3e6519866248e700f589a0fa1efad7d161b408b28f77b",
    framedBytesHex:
      "4d4149535f454e565f56323a303030303030303030303030303030353a544f4b454e3a303030303030303030303030303030333a610062",
    id: "environment-text.nul",
    key: "TOKEN",
  }),
  Object.freeze({
    byteLength: 56,
    canonicalUtf8Hex: "f09f9880",
    exactText: "\ud83d\ude00",
    expectedSha256:
      "e2c6ca908956bf08c69d9acbe62bb31096b2fbdb7e2f4251dad8fe801d904a9f",
    framedBytesHex:
      "4d4149535f454e565f56323a303030303030303030303030303030353a4c4142454c3a303030303030303030303030303030343af09f9880",
    id: "environment-text.non-bmp",
    key: "LABEL",
  }),
]);

const ENVIRONMENT_KEY_REJECT_CASES = Object.freeze([
  Object.freeze({ caseId: "key-empty", key: "" }),
  Object.freeze({ caseId: "key-nul", key: "HOME\u0000PATH" }),
  Object.freeze({ caseId: "key-equals", key: "HOME=PATH" }),
  Object.freeze({ caseId: "key-lowercase", key: "home" }),
  Object.freeze({ caseId: "key-mixed-case", key: "Home" }),
  Object.freeze({ caseId: "key-leading-digit", key: "1HOME" }),
  Object.freeze({ caseId: "key-nonascii", key: "H\u00d6ME" }),
  Object.freeze({ caseId: "key-leading-underscore", key: "_HOME" }),
  Object.freeze({ caseId: "key-hyphen", key: "HOME-PATH" }),
  Object.freeze({ caseId: "key-whitespace", key: "HOME PATH" }),
  Object.freeze({ caseId: "key-non-string", key: 42 }),
]);

const ENVIRONMENT_TEXT_REJECT_CASES = Object.freeze([
  Object.freeze({ caseId: "text-non-string", exactText: 42 }),
  Object.freeze({ caseId: "text-lone-high-surrogate", exactText: "\ud800" }),
  Object.freeze({ caseId: "text-lone-low-surrogate", exactText: "\udc00" }),
  Object.freeze({
    caseId: "text-reversed-surrogate-pair",
    exactText: "\udc00\ud800",
  }),
]);

const MODULE_SNAPSHOT = Object.freeze({
  artifactByteLength: 17,
  artifactBytesHex: "7b2261223a312c2262223a22616263227d",
  artifactSha256:
    "83bc78f0c4dbc4f726edcdd37f39d6ae5dd7673e7ae817d52ceeff63fe82689e",
  artifactText: "{\"a\":1,\"b\":\"abc\"}",
  canonicalArrayText: "[1,2]",
  canonicalObjectText: "{\"a\":1,\"b\":\"abc\"}",
  environmentByteHash:
    "dee10c05e0e17dd43cd3e6519866248e700f589a0fa1efad7d161b408b28f77b",
  environmentTextHash:
    "1e0c7429b193fae96a8132d00d363603f4341fc23ef8604e84b49f09a724bd4d",
  proofHash:
    "7021f57b12c25639cacd094151b4002ab97fb69eda153b9c454bf1098857dd13",
});

function bytesToHex(bytes) {
  let result = "";
  for (const byte of bytes) {
    result += byte.toString(16).padStart(2, "0");
  }
  return result;
}

function exactRejectionCode(operation) {
  let failure;
  try {
    operation();
  } catch (error) {
    failure = error;
  }
  assert.notEqual(failure, undefined);
  assert.equal(typeof failure.message, "string");
  return failure.message;
}

function hasRejectVector(primitive, caseId, errorCode) {
  return REQUIRED_BROWSER_PROOF_REJECT_VECTORS.some(
    (candidate) =>
      candidate[0] === primitive &&
      candidate[1] === caseId &&
      candidate[2] === errorCode,
  );
}

function assertPrimitiveModuleSnapshot() {
  assert.equal(
    canonicalizeClosedJson({ b: "abc", a: 1 }),
    MODULE_SNAPSHOT.canonicalObjectText,
  );
  assert.equal(
    canonicalizeClosedJson([1, 2]),
    MODULE_SNAPSHOT.canonicalArrayText,
  );

  const artifact = canonicalizeClosedJsonArtifact({ b: "abc", a: 1 });
  assert.equal(artifact.text, MODULE_SNAPSHOT.artifactText);
  assert.equal(artifact.byteLength, MODULE_SNAPSHOT.artifactByteLength);
  assert.equal(artifact.sha256, MODULE_SNAPSHOT.artifactSha256);
  assert.equal(
    bytesToHex(artifact.copyBytes()),
    MODULE_SNAPSHOT.artifactBytesHex,
  );

  assert.equal(
    hashCanonicalProof("proof", { b: "abc", a: 1 }),
    MODULE_SNAPSHOT.proofHash,
  );
  assert.equal(
    hashEnvironmentValue("TOKEN", new Uint8Array([0x61, 0x00, 0x62])),
    MODULE_SNAPSHOT.environmentByteHash,
  );
  assert.equal(
    hashEnvironmentText("LABEL", "e\u0301"),
    MODULE_SNAPSHOT.environmentTextHash,
  );

  const verified = verifyCanonicalJsonArtifactBytes(
    artifact.copyBytes(),
    artifact.sha256,
    { b: "abc", a: 1 },
  );
  assert.equal(verified.text, MODULE_SNAPSHOT.artifactText);
  assert.equal(verified.byteLength, MODULE_SNAPSHOT.artifactByteLength);
  assert.equal(verified.sha256, MODULE_SNAPSHOT.artifactSha256);
  assert.equal(
    bytesToHex(verified.copyBytes()),
    MODULE_SNAPSHOT.artifactBytesHex,
  );
  assert.equal(verified.value.a, 1);
  assert.equal(verified.value.b, "abc");
  assert.equal(Object.isFrozen(verified.value), true);

  assert.equal(
    exactRejectionCode(() => canonicalizeClosedJson(undefined)),
    VALUE_ERROR,
  );
  assert.equal(
    exactRejectionCode(() => hashCanonicalProof("", { a: 1 })),
    DOMAIN_ERROR,
  );
  assert.equal(
    exactRejectionCode(() =>
      hashEnvironmentValue("KEY", new DataView(new ArrayBuffer(1))),
    ),
    ENVIRONMENT_BYTES_ERROR,
  );
  assert.equal(
    exactRejectionCode(() => hashEnvironmentText("", "\ud800")),
    ENVIRONMENT_KEY_ERROR,
  );
  assert.equal(
    exactRejectionCode(() => hashEnvironmentText("KEY", "\ud800")),
    ENVIRONMENT_TEXT_ERROR,
  );
  assert.equal(
    exactRejectionCode(() =>
      verifyCanonicalJsonArtifactBytes(
        {},
        "0000000000000000000000000000000000000000000000000000000000000000",
      ),
    ),
    ARTIFACT_BYTES_ERROR,
  );
}

function restoreOwnDescriptor(target, key, descriptor) {
  if (descriptor === undefined) {
    assert.equal(Reflect.deleteProperty(target, key), true);
    return;
  }
  Object.defineProperty(target, key, descriptor);
}

test("required-browser proof primitive schema is 5", () => {
  assert.equal(REQUIRED_BROWSER_PROOF_PRIMITIVES_SCHEMA_VERSION, 5);
});

test("hashEnvironmentText vectors are closed, unique, literal known answers", () => {
  assert.equal(
    Object.isFrozen(REQUIRED_BROWSER_PROOF_COMPATIBILITY_VECTORS),
    true,
  );
  const allIds = REQUIRED_BROWSER_PROOF_COMPATIBILITY_VECTORS.map(
    (candidate) => candidate.id,
  );
  assert.equal(new Set(allIds).size, allIds.length);

  for (const expected of KNOWN_ANSWER_VECTORS) {
    const matches = REQUIRED_BROWSER_PROOF_COMPATIBILITY_VECTORS.filter(
      (candidate) => candidate.id === expected.id,
    );
    assert.equal(matches.length, 1);
    const exported = matches[0];
    assert.equal(exported.byteLength, expected.byteLength);
    assert.equal(exported.canonicalUtf8Hex, expected.canonicalUtf8Hex);
    assert.equal(exported.exactText, expected.exactText);
    assert.equal(exported.expectedSha256, expected.expectedSha256);
    assert.equal(exported.framedBytesHex, expected.framedBytesHex);
    assert.equal(exported.framedBytesHex.length / 2, exported.byteLength);
    assert.equal(exported.key, expected.key);
    assert.equal(exported.primitive, "hashEnvironmentText");
    assert.equal(
      Object.prototype.hasOwnProperty.call(exported, "exactBytesHex"),
      false,
    );
    assert.equal(Object.isFrozen(exported), true);

    const encoded = TEST_TEXT_ENCODER.encode(expected.exactText);
    assert.equal(bytesToHex(encoded), expected.canonicalUtf8Hex);
    assert.equal(
      hashEnvironmentText(expected.key, expected.exactText),
      expected.expectedSha256,
    );
    assert.equal(
      hashEnvironmentValue(expected.key, encoded),
      expected.expectedSha256,
    );
  }
});

test("hashEnvironmentText preserves decomposed scalar text", () => {
  const decomposed = "e\u0301";
  const composed = "\u00e9";
  assert.equal(bytesToHex(TEST_TEXT_ENCODER.encode(decomposed)), "65cc81");
  assert.equal(bytesToHex(TEST_TEXT_ENCODER.encode(composed)), "c3a9");
  assert.equal(
    hashEnvironmentText("LABEL", decomposed),
    MODULE_SNAPSHOT.environmentTextHash,
  );
  assert.notEqual(
    hashEnvironmentText("LABEL", decomposed),
    hashEnvironmentText("LABEL", composed),
  );
});

for (const rejection of ENVIRONMENT_KEY_REJECT_CASES) {
  test(`hashEnvironmentText closes key rejection ${rejection.caseId}`, () => {
    assert.equal(
      exactRejectionCode(() => hashEnvironmentText(rejection.key, "valid")),
      ENVIRONMENT_KEY_ERROR,
    );
    assert.equal(
      exactRejectionCode(() => hashEnvironmentText(rejection.key, "\ud800")),
      ENVIRONMENT_KEY_ERROR,
    );
    assert.equal(
      hasRejectVector(
        "hashEnvironmentText",
        rejection.caseId,
        ENVIRONMENT_KEY_ERROR,
      ),
      true,
    );
  });
}

for (const rejection of ENVIRONMENT_TEXT_REJECT_CASES) {
  test(`hashEnvironmentText closes text rejection ${rejection.caseId}`, () => {
    assert.equal(
      exactRejectionCode(() =>
        hashEnvironmentText("LABEL", rejection.exactText),
      ),
      ENVIRONMENT_TEXT_ERROR,
    );
    assert.equal(
      hasRejectVector(
        "hashEnvironmentText",
        rejection.caseId,
        ENVIRONMENT_TEXT_ERROR,
      ),
      true,
    );
  });
}

test("hashEnvironmentText rejects additional malformed scalar shapes", () => {
  assert.equal(
    exactRejectionCode(() => hashEnvironmentText("LABEL", "\ud800A")),
    ENVIRONMENT_TEXT_ERROR,
  );
  assert.equal(
    exactRejectionCode(() => hashEnvironmentText("LABEL", "A\ud800")),
    ENVIRONMENT_TEXT_ERROR,
  );
  assert.equal(
    hashEnvironmentText("LABEL", "\ud83d\ude00"),
    "e2c6ca908956bf08c69d9acbe62bb31096b2fbdb7e2f4251dad8fe801d904a9f",
  );
});

test("whole primitive module ignores post-import inherited toJSON mutations", () => {
  const objectDescriptor = Object.getOwnPropertyDescriptor(
    Object.prototype,
    "toJSON",
  );
  const arrayDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    "toJSON",
  );

  try {
    assertPrimitiveModuleSnapshot();

    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      enumerable: false,
      get() {
        throw new Error("Object.prototype.toJSON getter must not be read");
      },
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      enumerable: false,
      get() {
        throw new Error("Array.prototype.toJSON getter must not be read");
      },
    });
    assertPrimitiveModuleSnapshot();

    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      enumerable: false,
      value() {
        throw new Error("Object.prototype.toJSON must not be called");
      },
      writable: true,
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      enumerable: false,
      value() {
        throw new Error("Array.prototype.toJSON must not be called");
      },
      writable: true,
    });
    assertPrimitiveModuleSnapshot();

    assert.equal(Reflect.deleteProperty(Object.prototype, "toJSON"), true);
    assert.equal(Reflect.deleteProperty(Array.prototype, "toJSON"), true);
    assertPrimitiveModuleSnapshot();
  } finally {
    try {
      restoreOwnDescriptor(Object.prototype, "toJSON", objectDescriptor);
    } finally {
      restoreOwnDescriptor(Array.prototype, "toJSON", arrayDescriptor);
    }
  }
});
