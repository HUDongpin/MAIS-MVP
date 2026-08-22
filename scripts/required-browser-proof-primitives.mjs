import { Hash, createHash } from "node:crypto";
import { TextDecoder, TextEncoder, types } from "node:util";

export const REQUIRED_BROWSER_PROOF_PRIMITIVES_SCHEMA_VERSION = 5;
export const REQUIRED_BROWSER_ENVIRONMENT_HASH_SCHEMA_VERSION = 2;
export const REQUIRED_BROWSER_PROOF_FRAME_TAG = "MAIS_PROOF_V1";
export const REQUIRED_BROWSER_ENVIRONMENT_FRAME_TAG = "MAIS_ENV_V2";
export const REQUIRED_BROWSER_ENVIRONMENT_KEY_PATTERN = "^[A-Z][A-Z0-9_]*$";

const REFLECT_APPLY = Reflect.apply;
const TRUSTED_ARRAY = Array;
const TRUSTED_NUMBER = Number;
const TRUSTED_TYPE_ERROR = TypeError;
const TRUSTED_UINT8_ARRAY = Uint8Array;
const TRUSTED_WEAK_SET = WeakSet;
const OBJECT_PROTOTYPE = Object.prototype;
const ARRAY_PROTOTYPE = Array.prototype;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const JSON_PARSE = JSON.parse;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const NUMBER_TO_STRING = Number.prototype.toString;
const STRING_CHAR_CODE_AT = String.prototype.charCodeAt;
const STRING_NORMALIZE = String.prototype.normalize;
const REGEXP_TEST = RegExp.prototype.test;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const IS_ANY_ARRAY_BUFFER = types.isAnyArrayBuffer;
const IS_PROXY = types.isProxy;
const IS_SHARED_ARRAY_BUFFER = types.isSharedArrayBuffer;
const IS_UINT8_ARRAY = types.isUint8Array;
const TEXT_ENCODER_ENCODE = TextEncoder.prototype.encode;
const TEXT_DECODER_DECODE = TextDecoder.prototype.decode;
const HASH_UPDATE = Hash.prototype.update;
const HASH_DIGEST = Hash.prototype.digest;
const TYPED_ARRAY_PROTOTYPE = OBJECT_GET_PROTOTYPE_OF(
  TRUSTED_UINT8_ARRAY.prototype
);
const TYPED_ARRAY_BUFFER_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "buffer"
).get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteLength"
).get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  TYPED_ARRAY_PROTOTYPE,
  "byteOffset"
).get;
const UINT8_ARRAY_SET = TRUSTED_UINT8_ARRAY.prototype.set;
const ARRAY_BUFFER_BYTE_LENGTH_GETTER = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  ArrayBuffer.prototype,
  "byteLength"
).get;
const ARRAY_BUFFER_RESIZABLE_DESCRIPTOR = OBJECT_GET_OWN_PROPERTY_DESCRIPTOR(
  ArrayBuffer.prototype,
  "resizable"
);
const ARRAY_BUFFER_RESIZABLE_GETTER = ARRAY_BUFFER_RESIZABLE_DESCRIPTOR
  ? ARRAY_BUFFER_RESIZABLE_DESCRIPTOR.get
  : null;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", {
  fatal: true,
  ignoreBOM: true
});
const ENVIRONMENT_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const LOWERCASE_SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ARRAY_INDEX_PATTERN = /^(?:0|[1-9][0-9]*)$/;

const VALUE_ERROR = "REQUIRED_BROWSER_PROOF_VALUE_REJECTED";
const DOMAIN_ERROR = "REQUIRED_BROWSER_PROOF_DOMAIN_REJECTED";
const ENVIRONMENT_KEY_ERROR = "REQUIRED_BROWSER_ENVIRONMENT_KEY_REJECTED";
const ENVIRONMENT_BYTES_ERROR = "REQUIRED_BROWSER_ENVIRONMENT_BYTES_REJECTED";
const ENVIRONMENT_TEXT_ERROR = "REQUIRED_BROWSER_ENVIRONMENT_TEXT_REJECTED";
const FRAME_ERROR = "REQUIRED_BROWSER_PROOF_FRAME_REJECTED";
const ARTIFACT_BYTES_ERROR = "REQUIRED_BROWSER_CANONICAL_ARTIFACT_BYTES_REJECTED";
const ARTIFACT_SHA256_ERROR = "REQUIRED_BROWSER_CANONICAL_ARTIFACT_SHA256_REJECTED";
const ARTIFACT_UTF8_ERROR = "REQUIRED_BROWSER_CANONICAL_ARTIFACT_UTF8_REJECTED";
const ARTIFACT_JSON_ERROR = "REQUIRED_BROWSER_CANONICAL_ARTIFACT_JSON_REJECTED";
const ARTIFACT_CANONICALITY_ERROR = "REQUIRED_BROWSER_CANONICAL_ARTIFACT_CANONICALITY_REJECTED";
const ARTIFACT_EXPECTED_VALUE_ERROR = "REQUIRED_BROWSER_CANONICAL_ARTIFACT_EXPECTED_VALUE_REJECTED";

function invoke(intrinsic, receiver, args) {
  return REFLECT_APPLY(intrinsic, receiver, args);
}

function reject(code) {
  throw new TRUSTED_TYPE_ERROR(code);
}

function nullRecord() {
  return invoke(OBJECT_CREATE, null, [null]);
}

function dataDescriptor(value) {
  const descriptor = nullRecord();
  descriptor.configurable = true;
  descriptor.enumerable = true;
  descriptor.value = value;
  descriptor.writable = true;
  return descriptor;
}
function defineOwnData(target, key, value) {
  invoke(OBJECT_DEFINE_PROPERTY, null, [target, key, dataDescriptor(value)]);
  return target;
}

function numberToString(value, radix) {
  return invoke(NUMBER_TO_STRING, value, [radix]);
}

function safeList() {
  return new TRUSTED_ARRAY();
}

function assertSafeArray(value, code) {
  assertNotProxy(value, code);
  if (!invoke(ARRAY_IS_ARRAY, null, [value])) reject(code);
  return value.length;
}

function defineDenseIndex(list, index, value, code) {
  const length = assertSafeArray(list, code);
  if (
    !invoke(NUMBER_IS_SAFE_INTEGER, null, [index])
    || index < 0
    || index > length
  ) reject(code);
  defineOwnData(list, numberToString(index, 10), value);
  return list;
}

function appendDense(list, value, code) {
  return defineDenseIndex(list, assertSafeArray(list, code), value, code);
}

function ownDataDescriptor(target, key, code) {
  const descriptor = invoke(
    OBJECT_GET_OWN_PROPERTY_DESCRIPTOR,
    null,
    [target, key]
  );
  if (
    !descriptor
    || !invoke(OBJECT_HAS_OWN, null, [descriptor, "value"])
  ) reject(code);
  return descriptor;
}

function ownDataValue(target, key, code) {
  return ownDataDescriptor(target, key, code).value;
}

function denseValueAt(list, index, code) {
  const length = assertSafeArray(list, code);
  if (
    !invoke(NUMBER_IS_SAFE_INTEGER, null, [index])
    || index < 0
    || index >= length
  ) reject(code);
  const descriptor = ownDataDescriptor(
    list,
    numberToString(index, 10),
    code
  );
  if (descriptor.enumerable !== true) reject(code);
  return descriptor.value;
}

function compareSortableRecords(left, right, comparisonKind, code) {
  if (comparisonKind === "index") {
    return ownDataValue(left, "index", code)
      - ownDataValue(right, "index", code);
  }
  if (comparisonKind === "key") {
    return compareUtf16CodeUnits(
      ownDataValue(left, "key", code),
      ownDataValue(right, "key", code)
    );
  }
  reject(code);
}

function stableSortedCopy(input, comparisonKind, code) {
  const inputLength = assertSafeArray(input, code);
  const output = safeList();
  let inputIndex = 0;
  while (inputIndex < inputLength) {
    const current = denseValueAt(input, inputIndex, code);
    let insertionIndex = assertSafeArray(output, code);
    while (
      insertionIndex > 0
      && compareSortableRecords(
        current,
        denseValueAt(output, insertionIndex - 1, code),
        comparisonKind,
        code
      ) < 0
    ) {
      defineDenseIndex(
        output,
        insertionIndex,
        denseValueAt(output, insertionIndex - 1, code),
        code
      );
      insertionIndex -= 1;
    }
    defineDenseIndex(output, insertionIndex, current, code);
    inputIndex += 1;
  }
  return output;
}

function fixedRecord(firstKey, firstValue, secondKey, secondValue) {
  const record = nullRecord();
  defineOwnData(record, firstKey, firstValue);
  defineOwnData(record, secondKey, secondValue);
  return record;
}

function weakSetHas(seen, value) {
  return invoke(WEAK_SET_HAS, seen, [value]);
}

function weakSetAdd(seen, value) {
  invoke(WEAK_SET_ADD, seen, [value]);
}

function assertNotProxy(value, code) {
  try {
    if (invoke(IS_PROXY, null, [value])) reject(code);
  } catch {
    reject(code);
  }
}

function regexpTest(pattern, value) {
  return invoke(REGEXP_TEST, pattern, [value]);
}
function assertScalarString(value, code) {
  if (typeof value !== "string") {
    reject(code);
  }

  for (let index = 0; index < value.length; index += 1) {
    const unit = invoke(STRING_CHAR_CODE_AT, value, [index]);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (index + 1 >= value.length) {
        reject(code);
      }
      const next = invoke(STRING_CHAR_CODE_AT, value, [index + 1]);
      if (next < 0xdc00 || next > 0xdfff) {
        reject(code);
      }
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      reject(code);
    }
  }

  return value;
}

function assertNfcScalarString(value, code) {
  if (typeof value !== "string") reject(code);
  let normalized;
  try {
    normalized = invoke(STRING_NORMALIZE, value, ["NFC"]);
  } catch {
    reject(code);
  }
  if (normalized !== value) reject(code);
  for (let index = 0; index < value.length; index += 1) {
    const unit = invoke(STRING_CHAR_CODE_AT, value, [index]);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (index + 1 >= value.length) reject(code);
      const next = invoke(STRING_CHAR_CODE_AT, value, [index + 1]);
      if (next < 0xdc00 || next > 0xdfff) reject(code);
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) reject(code);
  }
  return value;
}

function compareUtf16CodeUnits(left, right) {
  const sharedLength = left.length < right.length ? left.length : right.length;
  for (let index = 0; index < sharedLength; index += 1) {
    const leftUnit = invoke(STRING_CHAR_CODE_AT, left, [index]);
    const rightUnit = invoke(STRING_CHAR_CODE_AT, right, [index]);
    if (leftUnit < rightUnit) return -1;
    if (leftUnit > rightUnit) return 1;
  }
  if (left.length < right.length) return -1;
  if (left.length > right.length) return 1;
  return 0;
}

function canonicalArrayIndex(key) {
  if (typeof key !== "string" || key.length === 0) return null;
  if (key === "0") return 0;
  if (invoke(STRING_CHAR_CODE_AT, key, [0]) === 0x30) return null;
  let value = 0;
  for (let index = 0; index < key.length; index += 1) {
    const unit = invoke(STRING_CHAR_CODE_AT, key, [index]);
    if (unit < 0x30 || unit > 0x39) return null;
    value = (value * 10) + (unit - 0x30);
    if (value > 0xfffffffe) return null;
  }
  if (numberToString(value, 10) !== key) return null;
  return value;
}

function trustedByteObservation(value, code) {
  assertNotProxy(value, code);
  if (!invoke(IS_UINT8_ARRAY, undefined, [value])) reject(code);
  let buffer;
  let byteLength;
  let byteOffset;
  let bufferByteLength;
  try {
    buffer = invoke(TYPED_ARRAY_BUFFER_GETTER, value, []);
    byteLength = invoke(TYPED_ARRAY_BYTE_LENGTH_GETTER, value, []);
    byteOffset = invoke(TYPED_ARRAY_BYTE_OFFSET_GETTER, value, []);
    assertNotProxy(buffer, code);
    if (
      !invoke(IS_ANY_ARRAY_BUFFER, undefined, [buffer])
      || invoke(IS_SHARED_ARRAY_BUFFER, undefined, [buffer])
    ) reject(code);
    bufferByteLength = invoke(ARRAY_BUFFER_BYTE_LENGTH_GETTER, buffer, []);
    if (
      typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function"
      && invoke(ARRAY_BUFFER_RESIZABLE_GETTER, buffer, []) === true
    ) reject(code);
    new TRUSTED_UINT8_ARRAY(buffer);
  } catch {
    reject(code);
  }
  if (
    !invoke(NUMBER_IS_SAFE_INTEGER, undefined, [byteLength])
    || !invoke(NUMBER_IS_SAFE_INTEGER, undefined, [byteOffset])
    || !invoke(NUMBER_IS_SAFE_INTEGER, undefined, [bufferByteLength])
    || byteLength < 0
    || byteOffset < 0
    || bufferByteLength < 0
    || byteOffset + byteLength > bufferByteLength
  ) reject(code);
  const observation = nullRecord();
  defineOwnData(observation, "buffer", buffer);
  defineOwnData(observation, "bufferByteLength", bufferByteLength);
  defineOwnData(observation, "byteLength", byteLength);
  defineOwnData(observation, "byteOffset", byteOffset);
  return invoke(OBJECT_FREEZE, undefined, [observation]);
}

function trustedByteLength(value, code) {
  return ownDataValue(trustedByteObservation(value, code), "byteLength", code);
}

function copyTrustedBytes(value, code) {
  const before = trustedByteObservation(value, code);
  const byteLength = ownDataValue(before, "byteLength", code);
  const copy = new TRUSTED_UINT8_ARRAY(byteLength);
  try {
    invoke(UINT8_ARRAY_SET, copy, [value, 0]);
  } catch {
    reject(code);
  }
  const after = trustedByteObservation(value, code);
  if (
    !invoke(OBJECT_IS, undefined, [
      ownDataValue(before, "buffer", code),
      ownDataValue(after, "buffer", code)
    ])
    || ownDataValue(before, "bufferByteLength", code)
      !== ownDataValue(after, "bufferByteLength", code)
    || ownDataValue(before, "byteLength", code)
      !== ownDataValue(after, "byteLength", code)
    || ownDataValue(before, "byteOffset", code)
      !== ownDataValue(after, "byteOffset", code)
    || trustedByteLength(copy, code) !== byteLength
  ) reject(code);
  return copy;
}
function bytesEqual(left, right, code) {
  const leftCopy = copyTrustedBytes(left, code);
  const rightCopy = copyTrustedBytes(right, code);
  const leftLength = trustedByteLength(leftCopy, code);
  const rightLength = trustedByteLength(rightCopy, code);
  if (leftLength !== rightLength) return false;
  for (let index = 0; index < leftLength; index += 1) {
    if (leftCopy[index] !== rightCopy[index]) return false;
  }
  return true;
}

function encodeUtf8(value, code) {
  if (typeof value !== "string") reject(code);
  let encoded;
  try {
    encoded = invoke(TEXT_ENCODER_ENCODE, TEXT_ENCODER, [value]);
  } catch {
    reject(code);
  }
  return copyTrustedBytes(encoded, code);
}

function decodeUtf8(value, code) {
  const copy = copyTrustedBytes(value, code);
  let decoded;
  try {
    decoded = invoke(TEXT_DECODER_DECODE, TEXT_DECODER, [copy]);
  } catch {
    reject(code);
  }
  if (typeof decoded !== "string") reject(code);
  return decoded;
}

function exactLengthHex(value, code) {
  if (!invoke(NUMBER_IS_SAFE_INTEGER, undefined, [value]) || value < 0) reject(code);
  let output = numberToString(value, 16);
  if (output.length > 16) reject(code);
  while (output.length < 16) output = `0${output}`;
  return output;
}

function concatenateBytes(parts, code) {
  const count = assertSafeArray(parts, code);
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    total += trustedByteLength(denseValueAt(parts, index, code), code);
    if (!invoke(NUMBER_IS_SAFE_INTEGER, undefined, [total])) reject(code);
  }
  const output = new TRUSTED_UINT8_ARRAY(total);
  let offset = 0;
  for (let index = 0; index < count; index += 1) {
    const part = copyTrustedBytes(denseValueAt(parts, index, code), code);
    try {
      invoke(UINT8_ARRAY_SET, output, [part, offset]);
    } catch {
      reject(code);
    }
    offset += trustedByteLength(part, code);
  }
  if (offset !== total || trustedByteLength(output, code) !== total) reject(code);
  return output;
}

function lengthFramedBytes(tag, firstBytes, secondBytes, code) {
  const first = copyTrustedBytes(firstBytes, code);
  const second = copyTrustedBytes(secondBytes, code);
  const parts = safeList();
  appendDense(parts, encodeUtf8(tag, code), code);
  appendDense(parts, encodeUtf8(":", code), code);
  appendDense(parts, encodeUtf8(exactLengthHex(trustedByteLength(first, code), code), code), code);
  appendDense(parts, encodeUtf8(":", code), code);
  appendDense(parts, first, code);
  appendDense(parts, encodeUtf8(":", code), code);
  appendDense(parts, encodeUtf8(exactLengthHex(trustedByteLength(second, code), code), code), code);
  appendDense(parts, encodeUtf8(":", code), code);
  appendDense(parts, second, code);
  return concatenateBytes(parts, code);
}

function sha256Hex(value, code) {
  const copy = copyTrustedBytes(value, code);
  let hash;
  let digest;
  try {
    hash = invoke(createHash, undefined, ["sha256"]);
    invoke(HASH_UPDATE, hash, [copy]);
    digest = invoke(HASH_DIGEST, hash, ["hex"]);
  } catch {
    reject(code);
  }
  if (
    typeof digest !== "string"
    || !regexpTest(LOWERCASE_SHA256_PATTERN, digest)
  ) reject(code);
  return digest;
}
function serializeClosedJson(value, seen) {
  if (value === null) return "null";
  const valueType = typeof value;
  if (valueType === "string") {
    assertNfcScalarString(value, VALUE_ERROR);
    const encoded = invoke(JSON_STRINGIFY, undefined, [value]);
    if (typeof encoded !== "string") reject(VALUE_ERROR);
    return encoded;
  }
  if (valueType === "boolean") return value ? "true" : "false";
  if (valueType === "number") {
    if (
      !invoke(NUMBER_IS_FINITE, undefined, [value])
      || invoke(OBJECT_IS, undefined, [value, -0])
    ) reject(VALUE_ERROR);
    const encoded = invoke(JSON_STRINGIFY, undefined, [value]);
    if (typeof encoded !== "string") reject(VALUE_ERROR);
    return encoded;
  }
  if (valueType !== "object") reject(VALUE_ERROR);

  assertNotProxy(value, VALUE_ERROR);
  if (weakSetHas(seen, value)) reject(VALUE_ERROR);
  weakSetAdd(seen, value);

  if (invoke(ARRAY_IS_ARRAY, undefined, [value])) {
    if (
      invoke(OBJECT_GET_PROTOTYPE_OF, undefined, [value]) !== ARRAY_PROTOTYPE
    ) reject(VALUE_ERROR);
    const keys = invoke(REFLECT_OWN_KEYS, undefined, [value]);
    const keyCount = assertSafeArray(keys, VALUE_ERROR);
    const elements = safeList();
    let lengthSeen = false;
    let arrayLength = null;
    for (let position = 0; position < keyCount; position += 1) {
      const key = denseValueAt(keys, position, VALUE_ERROR);
      if (typeof key !== "string") reject(VALUE_ERROR);
      if (key === "toJSON") reject(VALUE_ERROR);
      if (key === "length") {
        if (lengthSeen) reject(VALUE_ERROR);
        const descriptor = ownDataDescriptor(value, key, VALUE_ERROR);
        arrayLength = ownDataValue(descriptor, "value", VALUE_ERROR);
        if (
          !invoke(NUMBER_IS_SAFE_INTEGER, undefined, [arrayLength])
          || arrayLength < 0
          || arrayLength > 0xffffffff
          || ownDataValue(descriptor, "enumerable", VALUE_ERROR) !== false
          || ownDataValue(descriptor, "configurable", VALUE_ERROR) !== false
        ) reject(VALUE_ERROR);
        lengthSeen = true;
        continue;
      }
      const index = canonicalArrayIndex(key);
      if (index === null) reject(VALUE_ERROR);
      const descriptor = ownDataDescriptor(value, key, VALUE_ERROR);
      if (ownDataValue(descriptor, "enumerable", VALUE_ERROR) !== true) {
        reject(VALUE_ERROR);
      }
      appendDense(
        elements,
        fixedRecord(
          "index",
          index,
          "value",
          ownDataValue(descriptor, "value", VALUE_ERROR)
        ),
        VALUE_ERROR
      );
    }
    if (!lengthSeen || arrayLength === null) reject(VALUE_ERROR);
    const elementCount = assertSafeArray(elements, VALUE_ERROR);
    if (elementCount !== arrayLength) reject(VALUE_ERROR);
    const sorted = stableSortedCopy(elements, "index", VALUE_ERROR);
    let output = "[";
    for (let index = 0; index < arrayLength; index += 1) {
      const record = denseValueAt(sorted, index, VALUE_ERROR);
      if (ownDataValue(record, "index", VALUE_ERROR) !== index) {
        reject(VALUE_ERROR);
      }
      if (index > 0) output += ",";
      output += serializeClosedJson(
        ownDataValue(record, "value", VALUE_ERROR),
        seen
      );
    }
    output += "]";
    return output;
  }
  const prototype = invoke(OBJECT_GET_PROTOTYPE_OF, undefined, [value]);
  if (prototype !== OBJECT_PROTOTYPE && prototype !== null) reject(VALUE_ERROR);
  const keys = invoke(REFLECT_OWN_KEYS, undefined, [value]);
  const keyCount = assertSafeArray(keys, VALUE_ERROR);
  const properties = safeList();
  for (let position = 0; position < keyCount; position += 1) {
    const key = denseValueAt(keys, position, VALUE_ERROR);
    if (typeof key !== "string") reject(VALUE_ERROR);
    assertNfcScalarString(key, VALUE_ERROR);
    if (key === "toJSON") reject(VALUE_ERROR);
    const descriptor = ownDataDescriptor(value, key, VALUE_ERROR);
    if (ownDataValue(descriptor, "enumerable", VALUE_ERROR) !== true) {
      reject(VALUE_ERROR);
    }
    appendDense(
      properties,
      fixedRecord(
        "key",
        key,
        "value",
        ownDataValue(descriptor, "value", VALUE_ERROR)
      ),
      VALUE_ERROR
    );
  }
  const sorted = stableSortedCopy(properties, "key", VALUE_ERROR);
  const propertyCount = assertSafeArray(sorted, VALUE_ERROR);
  let output = "{";
  for (let index = 0; index < propertyCount; index += 1) {
    const record = denseValueAt(sorted, index, VALUE_ERROR);
    const key = ownDataValue(record, "key", VALUE_ERROR);
    const encodedKey = invoke(JSON_STRINGIFY, undefined, [key]);
    if (typeof encodedKey !== "string") reject(VALUE_ERROR);
    if (index > 0) output += ",";
    output += encodedKey;
    output += ":";
    output += serializeClosedJson(
      ownDataValue(record, "value", VALUE_ERROR),
      seen
    );
  }
  output += "}";
  return output;
}

function canonicalText(value) {
  const seen = new TRUSTED_WEAK_SET();
  return serializeClosedJson(value, seen);
}

function frozenArtifactDataValue(artifact, key, code) {
  const descriptor = ownDataDescriptor(artifact, key, code);
  if (
    ownDataValue(descriptor, "enumerable", code) !== true
    || ownDataValue(descriptor, "configurable", code) !== false
    || ownDataValue(descriptor, "writable", code) !== false
  ) reject(code);
  return ownDataValue(descriptor, "value", code);
}

function consumeCanonicalArtifact(artifact, code) {
  assertNotProxy(artifact, code);
  if (invoke(OBJECT_GET_PROTOTYPE_OF, undefined, [artifact]) !== null) reject(code);
  const keys = invoke(REFLECT_OWN_KEYS, undefined, [artifact]);
  const count = assertSafeArray(keys, code);
  if (
    count !== 4
    || denseValueAt(keys, 0, code) !== "text"
    || denseValueAt(keys, 1, code) !== "byteLength"
    || denseValueAt(keys, 2, code) !== "sha256"
    || denseValueAt(keys, 3, code) !== "copyBytes"
  ) reject(code);
  const text = frozenArtifactDataValue(artifact, "text", code);
  const byteLength = frozenArtifactDataValue(artifact, "byteLength", code);
  const sha256 = frozenArtifactDataValue(artifact, "sha256", code);
  const copyBytes = frozenArtifactDataValue(artifact, "copyBytes", code);
  if (
    typeof text !== "string"
    || !invoke(NUMBER_IS_SAFE_INTEGER, undefined, [byteLength])
    || byteLength < 0
    || typeof sha256 !== "string"
    || !regexpTest(LOWERCASE_SHA256_PATTERN, sha256)
    || typeof copyBytes !== "function"
  ) reject(code);
  let copied;
  try {
    copied = invoke(copyBytes, undefined, []);
  } catch {
    reject(code);
  }
  const bytes = copyTrustedBytes(copied, code);
  const encodedText = encodeUtf8(text, code);
  if (
    trustedByteLength(bytes, code) !== byteLength
    || sha256Hex(bytes, code) !== sha256
    || !bytesEqual(bytes, encodedText, code)
  ) reject(code);
  const consumed = nullRecord();
  defineOwnData(consumed, "text", text);
  defineOwnData(consumed, "byteLength", byteLength);
  defineOwnData(consumed, "sha256", sha256);
  defineOwnData(consumed, "bytes", bytes);
  return invoke(OBJECT_FREEZE, undefined, [consumed]);
}

function createCanonicalArtifact(value) {
  const text = canonicalText(value);
  const retainedBytes = encodeUtf8(text, VALUE_ERROR);
  const byteLength = trustedByteLength(retainedBytes, VALUE_ERROR);
  const sha256 = sha256Hex(retainedBytes, VALUE_ERROR);
  function copyBytes() {
    return copyTrustedBytes(retainedBytes, ARTIFACT_BYTES_ERROR);
  }
  const artifact = nullRecord();
  defineOwnData(artifact, "text", text);
  defineOwnData(artifact, "byteLength", byteLength);
  defineOwnData(artifact, "sha256", sha256);
  defineOwnData(artifact, "copyBytes", copyBytes);
  return invoke(OBJECT_FREEZE, undefined, [artifact]);
}

export function canonicalizeClosedJsonArtifact(value) {
  const artifact = createCanonicalArtifact(value);
  consumeCanonicalArtifact(artifact, ARTIFACT_CANONICALITY_ERROR);
  return artifact;
}

export function canonicalizeClosedJson(value) {
  const artifact = canonicalizeClosedJsonArtifact(value);
  return ownDataValue(
    consumeCanonicalArtifact(artifact, ARTIFACT_CANONICALITY_ERROR),
    "text",
    ARTIFACT_CANONICALITY_ERROR
  );
}
export function hashCanonicalProof(domain, value) {
  assertNfcScalarString(domain, DOMAIN_ERROR);
  if (domain.length === 0) reject(DOMAIN_ERROR);
  const artifact = canonicalizeClosedJsonArtifact(value);
  const consumed = consumeCanonicalArtifact(
    artifact,
    ARTIFACT_CANONICALITY_ERROR
  );
  const frame = lengthFramedBytes(
    REQUIRED_BROWSER_PROOF_FRAME_TAG,
    encodeUtf8(domain, DOMAIN_ERROR),
    ownDataValue(consumed, "bytes", ARTIFACT_CANONICALITY_ERROR),
    FRAME_ERROR
  );
  return sha256Hex(frame, FRAME_ERROR);
}

function assertEnvironmentKey(key) {
  if (
    typeof key !== "string" ||
    !regexpTest(ENVIRONMENT_KEY_PATTERN, key)
  ) {
    reject(ENVIRONMENT_KEY_ERROR);
  }
  return key;
}

export function hashEnvironmentText(key, exactText) {
  const environmentKey = assertEnvironmentKey(key);
  const scalarText = assertScalarString(exactText, ENVIRONMENT_TEXT_ERROR);
  return hashEnvironmentValue(
    environmentKey,
    encodeUtf8(scalarText, ENVIRONMENT_TEXT_ERROR),
  );
}

export function hashEnvironmentValue(key, exactBytes) {
  assertEnvironmentKey(key);
  const copied = copyTrustedBytes(exactBytes, ENVIRONMENT_BYTES_ERROR);
  const frame = lengthFramedBytes(
    REQUIRED_BROWSER_ENVIRONMENT_FRAME_TAG,
    encodeUtf8(key, ENVIRONMENT_KEY_ERROR),
    copied,
    FRAME_ERROR
  );
  return sha256Hex(frame, FRAME_ERROR);
}

function deepFreezeClosedJsonValue(value, seen) {
  if (value === null || typeof value !== "object") return value;
  assertNotProxy(value, ARTIFACT_CANONICALITY_ERROR);
  if (weakSetHas(seen, value)) reject(ARTIFACT_CANONICALITY_ERROR);
  weakSetAdd(seen, value);
  const array = invoke(ARRAY_IS_ARRAY, undefined, [value]);
  const prototype = invoke(OBJECT_GET_PROTOTYPE_OF, undefined, [value]);
  if (
    (array && prototype !== ARRAY_PROTOTYPE)
    || (!array && prototype !== OBJECT_PROTOTYPE && prototype !== null)
  ) reject(ARTIFACT_CANONICALITY_ERROR);
  const keys = invoke(REFLECT_OWN_KEYS, undefined, [value]);
  const count = assertSafeArray(keys, ARTIFACT_CANONICALITY_ERROR);
  for (let index = 0; index < count; index += 1) {
    const key = denseValueAt(keys, index, ARTIFACT_CANONICALITY_ERROR);
    if (typeof key !== "string") reject(ARTIFACT_CANONICALITY_ERROR);
    if (array && key === "length") continue;
    const descriptor = ownDataDescriptor(value, key, ARTIFACT_CANONICALITY_ERROR);
    deepFreezeClosedJsonValue(
      ownDataValue(descriptor, "value", ARTIFACT_CANONICALITY_ERROR),
      seen
    );
  }
  return invoke(OBJECT_FREEZE, undefined, [value]);
}
export function verifyCanonicalJsonArtifactBytes(
  exactBytes,
  expectedSha256,
  expectedValue
) {
  const expectedValueProvided = arguments.length >= 3;
  const retainedBytes = copyTrustedBytes(exactBytes, ARTIFACT_BYTES_ERROR);
  if (
    typeof expectedSha256 !== "string"
    || !regexpTest(LOWERCASE_SHA256_PATTERN, expectedSha256)
  ) reject(ARTIFACT_SHA256_ERROR);
  const observedSha256 = sha256Hex(retainedBytes, ARTIFACT_SHA256_ERROR);
  if (observedSha256 !== expectedSha256) reject(ARTIFACT_SHA256_ERROR);

  const text = decodeUtf8(retainedBytes, ARTIFACT_UTF8_ERROR);
  let parsed;
  try {
    parsed = invoke(JSON_PARSE, undefined, [text]);
  } catch {
    reject(ARTIFACT_JSON_ERROR);
  }

  let canonicalArtifact;
  try {
    canonicalArtifact = canonicalizeClosedJsonArtifact(parsed);
  } catch {
    reject(ARTIFACT_CANONICALITY_ERROR);
  }
  const canonical = consumeCanonicalArtifact(
    canonicalArtifact,
    ARTIFACT_CANONICALITY_ERROR
  );
  if (
    ownDataValue(canonical, "text", ARTIFACT_CANONICALITY_ERROR) !== text
    || ownDataValue(canonical, "sha256", ARTIFACT_CANONICALITY_ERROR)
      !== observedSha256
    || !bytesEqual(
      retainedBytes,
      ownDataValue(canonical, "bytes", ARTIFACT_CANONICALITY_ERROR),
      ARTIFACT_CANONICALITY_ERROR
    )
  ) reject(ARTIFACT_CANONICALITY_ERROR);

  if (expectedValueProvided) {
    let expectedArtifact;
    try {
      expectedArtifact = canonicalizeClosedJsonArtifact(expectedValue);
    } catch {
      reject(ARTIFACT_EXPECTED_VALUE_ERROR);
    }
    const expected = consumeCanonicalArtifact(
      expectedArtifact,
      ARTIFACT_EXPECTED_VALUE_ERROR
    );
    if (
      !bytesEqual(
        ownDataValue(expected, "bytes", ARTIFACT_EXPECTED_VALUE_ERROR),
        retainedBytes,
        ARTIFACT_EXPECTED_VALUE_ERROR
      )
    ) reject(ARTIFACT_EXPECTED_VALUE_ERROR);
  }

  const frozenValue = deepFreezeClosedJsonValue(
    parsed,
    new TRUSTED_WEAK_SET()
  );
  function copyBytes() {
    return copyTrustedBytes(retainedBytes, ARTIFACT_BYTES_ERROR);
  }
  const verified = nullRecord();
  defineOwnData(verified, "value", frozenValue);
  defineOwnData(verified, "text", text);
  defineOwnData(
    verified,
    "byteLength",
    trustedByteLength(retainedBytes, ARTIFACT_BYTES_ERROR)
  );
  defineOwnData(verified, "sha256", observedSha256);
  defineOwnData(verified, "copyBytes", copyBytes);
  return invoke(OBJECT_FREEZE, undefined, [verified]);
}
function freezeDense(list, code) {
  assertSafeArray(list, code);
  return invoke(OBJECT_FREEZE, undefined, [list]);
}

function sanityCompatibilityVector(
  byteLength,
  canonicalUtf8Hex,
  expectedSha256,
  framedBytesHex,
  id,
  inputBytesHex
) {
  const record = nullRecord();
  defineOwnData(record, "byteLength", byteLength);
  defineOwnData(record, "canonicalUtf8Hex", canonicalUtf8Hex);
  defineOwnData(record, "expectedSha256", expectedSha256);
  defineOwnData(record, "framedBytesHex", framedBytesHex);
  defineOwnData(record, "id", id);
  defineOwnData(record, "inputBytesHex", inputBytesHex);
  defineOwnData(record, "primitive", "sha256-sanity");
  return invoke(OBJECT_FREEZE, undefined, [record]);
}

function canonicalCompatibilityVector(
  byteLength,
  canonicalText,
  canonicalUtf8Hex,
  expectedSha256,
  framedBytesHex,
  id,
  inputJson,
  primitive
) {
  const record = nullRecord();
  defineOwnData(record, "byteLength", byteLength);
  defineOwnData(record, "canonicalText", canonicalText);
  defineOwnData(record, "canonicalUtf8Hex", canonicalUtf8Hex);
  defineOwnData(record, "expectedSha256", expectedSha256);
  defineOwnData(record, "framedBytesHex", framedBytesHex);
  defineOwnData(record, "id", id);
  defineOwnData(record, "inputJson", inputJson);
  defineOwnData(record, "primitive", primitive);
  return invoke(OBJECT_FREEZE, undefined, [record]);
}

function proofCompatibilityVector(
  byteLength,
  canonicalUtf8Hex,
  domain,
  expectedSha256,
  framedBytesHex,
  id,
  inputJson
) {
  const record = nullRecord();
  defineOwnData(record, "byteLength", byteLength);
  defineOwnData(record, "canonicalUtf8Hex", canonicalUtf8Hex);
  defineOwnData(record, "domain", domain);
  defineOwnData(record, "expectedSha256", expectedSha256);
  defineOwnData(record, "framedBytesHex", framedBytesHex);
  defineOwnData(record, "id", id);
  defineOwnData(record, "inputJson", inputJson);
  defineOwnData(record, "primitive", "hashCanonicalProof");
  return invoke(OBJECT_FREEZE, undefined, [record]);
}

function environmentTextCompatibilityVector(
  byteLength,
  canonicalUtf8Hex,
  exactText,
  expectedSha256,
  framedBytesHex,
  id,
  key,
) {
  const record = nullRecord();
  defineOwnData(record, "byteLength", byteLength);
  defineOwnData(record, "canonicalUtf8Hex", canonicalUtf8Hex);
  defineOwnData(record, "exactText", exactText);
  defineOwnData(record, "expectedSha256", expectedSha256);
  defineOwnData(record, "framedBytesHex", framedBytesHex);
  defineOwnData(record, "id", id);
  defineOwnData(record, "key", key);
  defineOwnData(record, "primitive", "hashEnvironmentText");
  return invoke(OBJECT_FREEZE, undefined, [record]);
}

function environmentCompatibilityVector(
  byteLength,
  canonicalUtf8Hex,
  exactBytesHex,
  expectedSha256,
  framedBytesHex,
  id,
  key
) {
  const record = nullRecord();
  defineOwnData(record, "byteLength", byteLength);
  defineOwnData(record, "canonicalUtf8Hex", canonicalUtf8Hex);
  defineOwnData(record, "exactBytesHex", exactBytesHex);
  defineOwnData(record, "expectedSha256", expectedSha256);
  defineOwnData(record, "framedBytesHex", framedBytesHex);
  defineOwnData(record, "id", id);
  defineOwnData(record, "key", key);
  defineOwnData(record, "primitive", "hashEnvironmentValue");
  return invoke(OBJECT_FREEZE, undefined, [record]);
}

const compatibilityVectors = safeList();
appendDense(compatibilityVectors, sanityCompatibilityVector(
  0, "", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "", "sha256.empty", ""
), VALUE_ERROR);
appendDense(compatibilityVectors, sanityCompatibilityVector(
  3, "616263", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  "616263", "sha256.ascii-abc", "616263"
), VALUE_ERROR);
appendDense(compatibilityVectors, canonicalCompatibilityVector(
  17,
  "{\"a\":1,\"b\":\"abc\"}",
  "7b2261223a312c2262223a22616263227d",
  "83bc78f0c4dbc4f726edcdd37f39d6ae5dd7673e7ae817d52ceeff63fe82689e",
  "7b2261223a312c2262223a22616263227d",
  "canonical.ascii-key-order",
  "{\"b\":\"abc\",\"a\":1}",
  "canonicalizeClosedJson"
), VALUE_ERROR);
appendDense(compatibilityVectors, canonicalCompatibilityVector(
  43,
  "{\"\\u0000\":\"\\u0000\",\"a\":\"abc\",\"😀\":\"😀\"}",
  "7b225c7530303030223a225c7530303030222c2261223a22616263222c22f09f9880223a22f09f9880227d",
  "e26c01ca016273bbef3cebeb29eb515798736df210678b82629cf036a0ed6b70",
  "7b225c7530303030223a225c7530303030222c2261223a22616263222c22f09f9880223a22f09f9880227d",
  "canonical.nul-and-non-bmp-key-order",
  "{\"😀\":\"😀\",\"a\":\"abc\",\"\\u0000\":\"\\u0000\"}",
  "canonicalizeClosedJson"
), VALUE_ERROR);
appendDense(compatibilityVectors, canonicalCompatibilityVector(
  26,
  "[-2.5,0,1,true,false,null]",
  "5b2d322e352c302c312c747275652c66616c73652c6e756c6c5d",
  "51112602149bbffd7320dc5f65d47b594520e4fece1223120040344b2d9e20a7",
  "5b2d322e352c302c312c747275652c66616c73652c6e756c6c5d",
  "canonical.array-number-boolean-null",
  "[-2.5,0,1,true,false,null]",
  "canonicalizeClosedJson"
), VALUE_ERROR);
appendDense(compatibilityVectors, canonicalCompatibilityVector(
  32,
  "{\"left\":{\"x\":1},\"right\":{\"x\":1}}",
  "7b226c656674223a7b2278223a317d2c227269676874223a7b2278223a317d7d",
  "65a55e07c2f0df5f09b42f1a2e00364208c2f495076d7ad99c2f0cf617b04038",
  "7b226c656674223a7b2278223a317d2c227269676874223a7b2278223a317d7d",
  "canonical.distinct-equal-subtrees",
  "{\"right\":{\"x\":1},\"left\":{\"x\":1}}",
  "canonicalizeClosedJsonArtifact"
), VALUE_ERROR);
appendDense(compatibilityVectors, proofCompatibilityVector(
  71,
  "7b2261223a312c2262223a22616263227d",
  "proof",
  "7021f57b12c25639cacd094151b4002ab97fb69eda153b9c454bf1098857dd13",
  "4d4149535f50524f4f465f56313a303030303030303030303030303030353a70726f6f663a303030303030303030303030303031313a7b2261223a312c2262223a22616263227d",
  "proof.ascii-domain",
  "{\"b\":\"abc\",\"a\":1}"
), VALUE_ERROR);
appendDense(compatibilityVectors, proofCompatibilityVector(
  75,
  "7b2261223a312c2262223a22616263227d",
  "proof-alt",
  "303e828fa2f9373096282072fed66b90be998ea5d1bd21f95bf86dc14f8455af",
  "4d4149535f50524f4f465f56313a303030303030303030303030303030393a70726f6f662d616c743a303030303030303030303030303031313a7b2261223a312c2262223a22616263227d",
  "proof.domain-separation",
  "{\"b\":\"abc\",\"a\":1}"
), VALUE_ERROR);
appendDense(compatibilityVectors, proofCompatibilityVector(
  60,
  "22f09f988022",
  "emoji",
  "69757172bee8dd0b4f155369322f968b511c433f6f9aa034fcb63377fd498851",
  "4d4149535f50524f4f465f56313a303030303030303030303030303030353a656d6f6a693a303030303030303030303030303030363a22f09f988022",
  "proof.non-bmp-payload",
  "\"😀\""
), VALUE_ERROR);
appendDense(compatibilityVectors, environmentCompatibilityVector(
  68,
  "2f566f6c756d65732f5374617273686970",
  "2f566f6c756d65732f5374617273686970",
  "b6e7766728242985a07685c5415680da8a2b8a5bc6a88c13417ef80502ce42e2",
  "4d4149535f454e565f56323a303030303030303030303030303030343a484f4d453a303030303030303030303030303031313a2f566f6c756d65732f5374617273686970",
  "environment.home-ascii",
  "HOME"
), VALUE_ERROR);
appendDense(compatibilityVectors, environmentCompatibilityVector(
  55,
  "610062",
  "610062",
  "dee10c05e0e17dd43cd3e6519866248e700f589a0fa1efad7d161b408b28f77b",
  "4d4149535f454e565f56323a303030303030303030303030303030353a544f4b454e3a303030303030303030303030303030333a610062",
  "environment.nul-byte",
  "TOKEN"
), VALUE_ERROR);
appendDense(compatibilityVectors, environmentCompatibilityVector(
  56,
  "f09f9880",
  "f09f9880",
  "e2c6ca908956bf08c69d9acbe62bb31096b2fbdb7e2f4251dad8fe801d904a9f",
  "4d4149535f454e565f56323a303030303030303030303030303030353a4c4142454c3a303030303030303030303030303030343af09f9880",
  "environment.non-bmp-bytes",
  "LABEL"
), VALUE_ERROR);
appendDense(compatibilityVectors, environmentCompatibilityVector(
  50,
  "",
  "",
  "3f6b91bbec28e3c632871c500ccaf394d5bb0f39418fb88a0ec6ef41b3ef61eb",
  "4d4149535f454e565f56323a303030303030303030303030303030333a4b45593a303030303030303030303030303030303a",
  "environment.empty-bytes",
  "KEY"
), VALUE_ERROR);
appendDense(compatibilityVectors, environmentCompatibilityVector(
  53,
  "616263",
  "616263",
  "f12cef765de0a4c959637c6146f8dd132a0909d3026f581faeda735ca6544bdd",
  "4d4149535f454e565f56323a303030303030303030303030303030333a4b45593a303030303030303030303030303030333a616263",
  "environment.ascii-abc",
  "KEY"
), VALUE_ERROR);
appendDense(
  compatibilityVectors,
  environmentTextCompatibilityVector(
    55,
    "65cc81",
    "e\u0301",
    "1e0c7429b193fae96a8132d00d363603f4341fc23ef8604e84b49f09a724bd4d",
    "4d4149535f454e565f56323a303030303030303030303030303030353a4c4142454c3a303030303030303030303030303030333a65cc81",
    "environment-text.decomposed",
    "LABEL",
  ),
  VALUE_ERROR,
);
appendDense(
  compatibilityVectors,
  environmentTextCompatibilityVector(
    55,
    "610062",
    "a\u0000b",
    "dee10c05e0e17dd43cd3e6519866248e700f589a0fa1efad7d161b408b28f77b",
    "4d4149535f454e565f56323a303030303030303030303030303030353a544f4b454e3a303030303030303030303030303030333a610062",
    "environment-text.nul",
    "TOKEN",
  ),
  VALUE_ERROR,
);
appendDense(
  compatibilityVectors,
  environmentTextCompatibilityVector(
    56,
    "f09f9880",
    "\ud83d\ude00",
    "e2c6ca908956bf08c69d9acbe62bb31096b2fbdb7e2f4251dad8fe801d904a9f",
    "4d4149535f454e565f56323a303030303030303030303030303030353a4c4142454c3a303030303030303030303030303030343af09f9880",
    "environment-text.non-bmp",
    "LABEL",
  ),
  VALUE_ERROR,
);

export const REQUIRED_BROWSER_PROOF_COMPATIBILITY_VECTORS = freezeDense(
  compatibilityVectors,
  VALUE_ERROR
);
const acceptedByteInputs = safeList();
const acceptedByteInputNames = [
  "base-uint8array",
  "cross-realm-uint8array",
  "node-buffer",
  "uint8array-subclass-with-ignored-overrides"
];
for (let index = 0; index < acceptedByteInputNames.length; index += 1) {
  appendDense(
    acceptedByteInputs,
    denseValueAt(acceptedByteInputNames, index, VALUE_ERROR),
    VALUE_ERROR
  );
}
const rejectedByteInputs = safeList();
const rejectedByteInputNames = [
  "proxy",
  "shared-array-buffer-backing",
  "resizable-array-buffer-backing",
  "detached-array-buffer-backing",
  "out-of-bounds-view",
  "data-view",
  "non-uint8-typed-array",
  "non-view"
];
for (let index = 0; index < rejectedByteInputNames.length; index += 1) {
  appendDense(
    rejectedByteInputs,
    denseValueAt(rejectedByteInputNames, index, VALUE_ERROR),
    VALUE_ERROR
  );
}
const byteInputPolicy = nullRecord();
defineOwnData(
  byteInputPolicy,
  "accepted",
  freezeDense(acceptedByteInputs, VALUE_ERROR)
);
defineOwnData(
  byteInputPolicy,
  "rejected",
  freezeDense(rejectedByteInputs, VALUE_ERROR)
);
defineOwnData(byteInputPolicy, "schemaVersion", 1);
export const REQUIRED_BROWSER_PROOF_BYTE_INPUT_POLICY = invoke(
  OBJECT_FREEZE,
  undefined,
  [byteInputPolicy]
);

function rejectVector(primitive, caseId, errorCode) {
  const tuple = safeList();
  appendDense(tuple, primitive, VALUE_ERROR);
  appendDense(tuple, caseId, VALUE_ERROR);
  appendDense(tuple, errorCode, VALUE_ERROR);
  return freezeDense(tuple, VALUE_ERROR);
}

const rejectVectors = safeList();
function appendReject(primitive, caseId, errorCode) {
  appendDense(
    rejectVectors,
    rejectVector(primitive, caseId, errorCode),
    VALUE_ERROR
  );
}

const canonicalRejectCaseIds = [
  "root-undefined",
  "object-property-undefined",
  "array-element-undefined",
  "bigint",
  "nan",
  "positive-infinity",
  "negative-infinity",
  "negative-zero",
  "sparse-array",
  "array-extra-own-property",
  "array-nonenumerable-index",
  "array-accessor-index",
  "array-custom-prototype",
  "object-proxy",
  "array-proxy",
  "function",
  "symbol-value",
  "symbol-key",
  "date",
  "map",
  "set",
  "regexp",
  "boxed-primitive",
  "class-instance",
  "custom-object-prototype",
  "own-tojson",
  "own-tojson-accessor",
  "own-tojson-nonenumerable-data",
  "custom-prototype-inherited-tojson",
  "own-getter",
  "own-setter",
  "nonenumerable-object-property",
  "self-cycle",
  "mutual-cycle",
  "shared-object-reference",
  "shared-array-reference",
  "non-nfc-string",
  "non-nfc-key",
  "lone-high-surrogate-string",
  "lone-low-surrogate-string",
  "lone-high-surrogate-key",
  "lone-low-surrogate-key",
  "normalization-equivalent-key-ambiguity"
];
for (let index = 0; index < canonicalRejectCaseIds.length; index += 1) {
  appendReject(
    "canonicalizeClosedJson",
    denseValueAt(canonicalRejectCaseIds, index, VALUE_ERROR),
    VALUE_ERROR
  );
}
const proofDomainRejectCaseIds = [
  "domain-non-string",
  "domain-empty",
  "domain-non-nfc",
  "domain-lone-high-surrogate",
  "domain-lone-low-surrogate"
];
for (let index = 0; index < proofDomainRejectCaseIds.length; index += 1) {
  appendReject(
    "hashCanonicalProof",
    denseValueAt(proofDomainRejectCaseIds, index, VALUE_ERROR),
    DOMAIN_ERROR
  );
}

const environmentKeyRejectCaseIds = [
  "key-empty",
  "key-nul",
  "key-equals",
  "key-lowercase",
  "key-mixed-case",
  "key-leading-digit",
  "key-nonascii",
  "key-leading-underscore",
  "key-hyphen",
  "key-whitespace"
];
for (let index = 0; index < environmentKeyRejectCaseIds.length; index += 1) {
  appendReject(
    "hashEnvironmentValue",
    denseValueAt(environmentKeyRejectCaseIds, index, VALUE_ERROR),
    ENVIRONMENT_KEY_ERROR
  );
}
const environmentBytesRejectCaseIds = [
  "bytes-not-uint8array",
  "bytes-proxy",
  "bytes-data-view",
  "bytes-non-uint8-typed-array",
  "bytes-shared-array-buffer",
  "bytes-resizable-array-buffer",
  "bytes-detached-array-buffer",
  "bytes-out-of-bounds-view"
];
for (let index = 0; index < environmentBytesRejectCaseIds.length; index += 1) {
  appendReject(
    "hashEnvironmentValue",
    denseValueAt(environmentBytesRejectCaseIds, index, VALUE_ERROR),
    ENVIRONMENT_BYTES_ERROR
  );
}
const environmentTextKeyRejectCaseIds = [
  "key-empty",
  "key-nul",
  "key-equals",
  "key-lowercase",
  "key-mixed-case",
  "key-leading-digit",
  "key-nonascii",
  "key-leading-underscore",
  "key-hyphen",
  "key-whitespace",
  "key-non-string",
];
for (
  let index = 0;
  index < environmentTextKeyRejectCaseIds.length;
  index += 1
) {
  appendReject(
    "hashEnvironmentText",
    denseValueAt(environmentTextKeyRejectCaseIds, index, VALUE_ERROR),
    ENVIRONMENT_KEY_ERROR,
  );
}

const environmentTextRejectCaseIds = [
  "text-non-string",
  "text-lone-high-surrogate",
  "text-lone-low-surrogate",
  "text-reversed-surrogate-pair",
];
for (
  let index = 0;
  index < environmentTextRejectCaseIds.length;
  index += 1
) {
  appendReject(
    "hashEnvironmentText",
    denseValueAt(environmentTextRejectCaseIds, index, VALUE_ERROR),
    ENVIRONMENT_TEXT_ERROR,
  );
}

const verifierBytesRejectCaseIds = [
  "bytes-proxy",
  "bytes-data-view",
  "bytes-non-uint8-typed-array",
  "bytes-shared-array-buffer",
  "bytes-resizable-array-buffer",
  "bytes-detached-array-buffer",
  "bytes-out-of-bounds-view"
];
for (let index = 0; index < verifierBytesRejectCaseIds.length; index += 1) {
  appendReject(
    "verifyCanonicalJsonArtifactBytes",
    denseValueAt(verifierBytesRejectCaseIds, index, VALUE_ERROR),
    ARTIFACT_BYTES_ERROR
  );
}
const verifierShaRejectCaseIds = ["sha256-format", "sha256-mismatch"];
for (let index = 0; index < verifierShaRejectCaseIds.length; index += 1) {
  appendReject(
    "verifyCanonicalJsonArtifactBytes",
    denseValueAt(verifierShaRejectCaseIds, index, VALUE_ERROR),
    ARTIFACT_SHA256_ERROR
  );
}
appendReject(
  "verifyCanonicalJsonArtifactBytes",
  "invalid-utf8",
  ARTIFACT_UTF8_ERROR
);
const verifierJsonRejectCaseIds = ["invalid-json", "utf8-bom"];
for (let index = 0; index < verifierJsonRejectCaseIds.length; index += 1) {
  appendReject(
    "verifyCanonicalJsonArtifactBytes",
    denseValueAt(verifierJsonRejectCaseIds, index, VALUE_ERROR),
    ARTIFACT_JSON_ERROR
  );
}
const verifierCanonicalityRejectCaseIds = [
  "leading-whitespace",
  "trailing-whitespace",
  "unsorted-object-keys",
  "duplicate-object-key",
  "noncanonical-number",
  "noncanonical-string-escape"
];
for (let index = 0; index < verifierCanonicalityRejectCaseIds.length; index += 1) {
  appendReject(
    "verifyCanonicalJsonArtifactBytes",
    denseValueAt(verifierCanonicalityRejectCaseIds, index, VALUE_ERROR),
    ARTIFACT_CANONICALITY_ERROR
  );
}
const verifierExpectedRejectCaseIds = [
  "expected-value-mismatch",
  "invalid-expected-value"
];
for (let index = 0; index < verifierExpectedRejectCaseIds.length; index += 1) {
  appendReject(
    "verifyCanonicalJsonArtifactBytes",
    denseValueAt(verifierExpectedRejectCaseIds, index, VALUE_ERROR),
    ARTIFACT_EXPECTED_VALUE_ERROR
  );
}

export const REQUIRED_BROWSER_PROOF_REJECT_VECTORS = freezeDense(
  rejectVectors,
  VALUE_ERROR
);
