export const PROMOTION_WORKFLOW_JSON_LIMITS = Object.freeze({
  maxBytes: 32 * 1024 * 1024,
  maxDepth: 128,
  maxWork: 64 * 1024 * 1024,
  maxNodes: 250_000
});

export class PromotionWorkflowJsonError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PromotionWorkflowJsonError";
    this.code = code;
  }
}

const fatalUtf8Decoder = new TextDecoder("utf-8", { fatal: true });

function failInvalid() {
  throw new PromotionWorkflowJsonError(
    "PROMOTION_WORKFLOW_JSON_INVALID",
    "Promotion workflow JSON is invalid."
  );
}

function failDuplicateKey() {
  throw new PromotionWorkflowJsonError(
    "PROMOTION_WORKFLOW_JSON_DUPLICATE_KEY",
    "Promotion workflow JSON contains a duplicate object key."
  );
}

function failLimit() {
  throw new PromotionWorkflowJsonError(
    "PROMOTION_WORKFLOW_JSON_LIMIT_EXCEEDED",
    "Promotion workflow JSON exceeds frozen safety limits."
  );
}

function isDigit(character) {
  return character >= "0" && character <= "9";
}

function isNonZeroDigit(character) {
  return character >= "1" && character <= "9";
}

function isJsonWhitespace(character) {
  return character === " " || character === "\t" || character === "\n" || character === "\r";
}

export function parsePromotionWorkflowJsonBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) failInvalid();
  if (bytes.byteLength > PROMOTION_WORKFLOW_JSON_LIMITS.maxBytes) failLimit();

  let source;
  try {
    source = fatalUtf8Decoder.decode(bytes);
  } catch {
    failInvalid();
  }

  let offset = 0;
  let work = 0;
  let nodes = 0;

  const spendWork = (amount = 1) => {
    work += amount;
    if (work > PROMOTION_WORKFLOW_JSON_LIMITS.maxWork) failLimit();
  };

  const consume = () => {
    if (offset >= source.length) failInvalid();
    spendWork();
    const character = source[offset];
    offset += 1;
    return character;
  };

  const skipWhitespace = () => {
    while (isJsonWhitespace(source[offset])) consume();
  };

  const scanString = (decode) => {
    if (consume() !== '"') failInvalid();
    let decoded = decode ? "" : null;
    while (offset < source.length) {
      const character = consume();
      if (character === '"') return decoded;
      if (character.charCodeAt(0) < 0x20) failInvalid();
      if (character !== "\\") {
        if (decode) decoded += character;
        continue;
      }

      const escaped = consume();
      const simpleEscapes = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t"
      };
      if (Object.hasOwn(simpleEscapes, escaped)) {
        if (decode) decoded += simpleEscapes[escaped];
        continue;
      }
      if (escaped !== "u") failInvalid();

      let codeUnit = 0;
      for (let digitIndex = 0; digitIndex < 4; digitIndex += 1) {
        const digit = consume();
        if (!/^[0-9a-fA-F]$/u.test(digit)) failInvalid();
        codeUnit = (codeUnit * 16) + Number.parseInt(digit, 16);
      }
      if (decode) decoded += String.fromCharCode(codeUnit);
    }
    failInvalid();
  };

  const scanLiteral = (literal) => {
    for (const expected of literal) {
      if (consume() !== expected) failInvalid();
    }
  };

  const scanNumber = () => {
    const start = offset;
    if (source[offset] === "-") consume();

    if (source[offset] === "0") {
      consume();
    } else if (isNonZeroDigit(source[offset])) {
      consume();
      while (isDigit(source[offset])) consume();
    } else {
      failInvalid();
    }

    if (source[offset] === ".") {
      consume();
      if (!isDigit(source[offset])) failInvalid();
      while (isDigit(source[offset])) consume();
    }

    if (source[offset] === "e" || source[offset] === "E") {
      consume();
      if (source[offset] === "+" || source[offset] === "-") consume();
      if (!isDigit(source[offset])) failInvalid();
      while (isDigit(source[offset])) consume();
    }

    if (!Number.isFinite(Number(source.slice(start, offset)))) failInvalid();
  };

  const scanValue = (depth) => {
    spendWork();
    if (depth > PROMOTION_WORKFLOW_JSON_LIMITS.maxDepth) failLimit();
    nodes += 1;
    if (nodes > PROMOTION_WORKFLOW_JSON_LIMITS.maxNodes) failLimit();
    skipWhitespace();

    const character = source[offset];
    if (character === '"') {
      scanString(false);
      return;
    }
    if (character === "{") {
      consume();
      skipWhitespace();
      if (source[offset] === "}") {
        consume();
        return;
      }
      const keys = new Set();
      while (offset < source.length) {
        skipWhitespace();
        if (source[offset] !== '"') failInvalid();
        const key = scanString(true);
        if (keys.has(key)) failDuplicateKey();
        keys.add(key);
        skipWhitespace();
        if (consume() !== ":") failInvalid();
        scanValue(depth + 1);
        skipWhitespace();
        const delimiter = consume();
        if (delimiter === "}") return;
        if (delimiter !== ",") failInvalid();
      }
      failInvalid();
    }
    if (character === "[") {
      consume();
      skipWhitespace();
      if (source[offset] === "]") {
        consume();
        return;
      }
      while (offset < source.length) {
        scanValue(depth + 1);
        skipWhitespace();
        const delimiter = consume();
        if (delimiter === "]") return;
        if (delimiter !== ",") failInvalid();
      }
      failInvalid();
    }
    if (character === "t") {
      scanLiteral("true");
      return;
    }
    if (character === "f") {
      scanLiteral("false");
      return;
    }
    if (character === "n") {
      scanLiteral("null");
      return;
    }
    scanNumber();
  };

  scanValue(0);
  skipWhitespace();
  if (offset !== source.length) failInvalid();

  try {
    return JSON.parse(source);
  } catch {
    failInvalid();
  }
}
