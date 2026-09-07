// Standalone bounded parser; keep the machine and natural copies in parity.
const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_JSON_DEPTH = 128;
const MAX_JSON_WORK = MAX_FILE_BYTES * 2;
function fail(code, message) { throw Object.assign(new Error(message), { code }); }

export function strictJsonParse(input, label = "authoritative JSON") {
  if (Buffer.isBuffer(input) && input.length > MAX_FILE_BYTES) fail("STRICT_JSON_INVALID", `${label} is not bounded strict JSON`);
  let source = input;
  if (Buffer.isBuffer(input)) {
    try { source = new TextDecoder("utf-8", { fatal: true }).decode(input); } catch { fail("STRICT_JSON_INVALID", `${label} is not bounded strict JSON`); }
  }
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > MAX_FILE_BYTES) fail("STRICT_JSON_INVALID", `${label} is not bounded strict JSON`);
  let offset = 0;
  let work = 0;
  const countWork = (amount = 1) => {
    work += amount;
    if (work > MAX_JSON_WORK) fail("STRICT_JSON_INVALID", `${label} exceeds strict JSON work limits`);
  };
  const skipWhitespace = () => {
    while (/[\t\n\r ]/u.test(source[offset] ?? "")) { offset += 1; countWork(); }
  };
  const parseString = () => {
    if (source[offset] !== '"') fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    offset += 1;
    let value = "";
    while (offset < source.length) {
      countWork();
      const character = source[offset++];
      if (character === '"') return value;
      if (character < " ") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      if (character !== "\\") { value += character; continue; }
      const escaped = source[offset++];
      countWork();
      const simple = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" }[escaped];
      if (simple !== undefined) { value += simple; continue; }
      if (escaped !== "u") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      const digits = source.slice(offset, offset + 4);
      if (!/^[a-fA-F0-9]{4}$/u.test(digits)) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      value += String.fromCharCode(Number.parseInt(digits, 16));
      offset += 4;
      countWork(4);
    }
    fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
  };
  const parseValue = (depth) => {
    countWork();
    if (depth > MAX_JSON_DEPTH) fail("STRICT_JSON_INVALID", `${label} exceeds strict JSON depth limits`);
    skipWhitespace();
    if (source[offset] === '"') return parseString();
    if (source[offset] === "{") {
      offset += 1;
      const result = {};
      const keys = new Set();
      skipWhitespace();
      if (source[offset] === "}") { offset += 1; return result; }
      while (offset < source.length) {
        skipWhitespace();
        const key = parseString();
        if (keys.has(key)) fail("JSON_DUPLICATE_KEY", "authoritative JSON contains a duplicate object key");
        keys.add(key);
        skipWhitespace();
        if (source[offset++] !== ":") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
        Object.defineProperty(result, key, { value: parseValue(depth + 1), enumerable: true, writable: true, configurable: true });
        skipWhitespace();
        const delimiter = source[offset++];
        if (delimiter === "}") return result;
        if (delimiter !== ",") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      }
      fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    }
    if (source[offset] === "[") {
      offset += 1;
      const result = [];
      skipWhitespace();
      if (source[offset] === "]") { offset += 1; return result; }
      while (offset < source.length) {
        result.push(parseValue(depth + 1));
        skipWhitespace();
        const delimiter = source[offset++];
        if (delimiter === "]") return result;
        if (delimiter !== ",") fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
      }
      fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    }
    for (const [literal, value] of [["true", true], ["false", false], ["null", null]]) {
      if (source.startsWith(literal, offset)) { offset += literal.length; countWork(literal.length); return value; }
    }
    const number = source.slice(offset).match(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/u)?.[0];
    if (!number) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    offset += number.length;
    countWork(number.length);
    const numericValue = Number(number);
    if (!Number.isFinite(numericValue)) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
    return numericValue;
  };
  const value = parseValue(0);
  skipWhitespace();
  if (offset !== source.length) fail("STRICT_JSON_INVALID", `${label} is malformed strict JSON`);
  return value;
}

