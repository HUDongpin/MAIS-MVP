export const maxLearningEventsRequestBodyBytes = 512 * 1024;
export const maxLearningEventsRequestEvents = 200;
export const maxLearningEventsRequestIdentifierLength = 256;
const maxLearningEventsContextIdentifierLength = 160;

export type ExactLearningEventsRequestBody = {
  events: unknown;
  generation: unknown;
};

export type ExactLearningEventsRequestBodyResult =
  | { ok: true; value: ExactLearningEventsRequestBody }
  | { ok: false; status: 400 | 413; error: string };

const exactLearningEventsRequestKeys = new Set(["events", "generation"]);
const exactLearningEventKeys = new Set([
  "assignmentId",
  "classId",
  "competencyId",
  "durationSeconds",
  "grade",
  "id",
  "questionId",
  "source",
  "timestamp",
  "topicId",
  "type"
]);
const canonicalLearningEventIdentifierKeys = new Set([
  "assignmentId",
  "classId",
  "competencyId",
  "id",
  "questionId",
  "topicId"
]);
const learningEventStringLimits: Record<string, number> = {
  assignmentId: maxLearningEventsContextIdentifierLength,
  classId: maxLearningEventsContextIdentifierLength,
  competencyId: maxLearningEventsContextIdentifierLength,
  grade: 32,
  id: maxLearningEventsRequestIdentifierLength,
  questionId: maxLearningEventsRequestIdentifierLength,
  source: 64,
  timestamp: 32,
  topicId: maxLearningEventsRequestIdentifierLength,
  type: 64
};

function parseBoundedContentLength(value: string | null) {
  if (value === null) return { ok: true as const, value: null };
  if (value.length === 0) return { ok: false as const };

  let parsed = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x30 || code > 0x39) return { ok: false as const };
    parsed = Math.min(
      maxLearningEventsRequestBodyBytes + 1,
      parsed * 10 + code - 0x30
    );
  }
  return { ok: true as const, value: parsed };
}

async function readBoundedLearningEventsRequestBody(request: Request): Promise<
  | { ok: true; value: Uint8Array }
  | { ok: false; status: 400 | 413; error: string }
> {
  const contentLength = parseBoundedContentLength(request.headers.get("content-length"));
  if (!contentLength.ok) {
    return { ok: false, status: 400, error: "Invalid Content-Length." };
  }
  if (
    contentLength.value !== null &&
    contentLength.value > maxLearningEventsRequestBodyBytes
  ) {
    return { ok: false, status: 413, error: "Learning events body is too large." };
  }
  if (!request.body) {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxLearningEventsRequestBodyBytes) {
        try {
          await reader.cancel("Learning events body is too large.");
        } catch {
          // The observed bytes remain authoritative if the producer refuses
          // cancellation.
        }
        return { ok: false, status: 413, error: "Learning events body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  } finally {
    reader.releaseLock();
  }

  if (contentLength.value !== null && contentLength.value !== totalBytes) {
    return {
      ok: false,
      status: 400,
      error: "Content-Length does not match the request body."
    };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, value: bytes };
}

function isJsonWhitespace(code: number) {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

function isWellFormedUnicode(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

class LearningEventsBatchTooLargeError extends SyntaxError {}

class ExactLearningEventsJsonParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse(): ExactLearningEventsRequestBody {
    this.skipWhitespace();
    this.expect("{");
    this.skipWhitespace();

    const seenKeys = new Set<string>();
    let events: unknown[] | undefined;
    let generation: number | undefined;

    while (this.peek() !== "}") {
      const key = this.parseString(16);
      if (!exactLearningEventsRequestKeys.has(key) || seenKeys.has(key)) this.fail();
      seenKeys.add(key);

      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      if (key === "events") events = this.parseEvents();
      else generation = this.parseNumber(32);

      this.skipWhitespace();
      if (this.peek() === "}") break;
      this.expect(",");
      this.skipWhitespace();
      if (this.peek() === "}") this.fail();
    }

    this.expect("}");
    this.skipWhitespace();
    if (
      this.index !== this.input.length ||
      seenKeys.size !== exactLearningEventsRequestKeys.size ||
      events === undefined ||
      generation === undefined
    ) {
      this.fail();
    }
    return { events, generation };
  }

  private parseEvents() {
    this.expect("[");
    this.skipWhitespace();
    const events: unknown[] = [];

    while (this.peek() !== "]") {
      if (events.length >= maxLearningEventsRequestEvents) {
        throw new LearningEventsBatchTooLargeError();
      }
      events.push(this.parseEvent());
      this.skipWhitespace();
      if (this.peek() === "]") break;
      this.expect(",");
      this.skipWhitespace();
      if (this.peek() === "]") this.fail();
    }

    this.expect("]");
    return events;
  }

  private parseEvent() {
    this.expect("{");
    this.skipWhitespace();
    const event: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    const seenKeys = new Set<string>();

    while (this.peek() !== "}") {
      const key = this.parseString(32);
      if (!exactLearningEventKeys.has(key) || seenKeys.has(key)) this.fail();
      seenKeys.add(key);

      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      if (key === "durationSeconds") {
        event[key] = this.parseNumber(32);
      } else {
        const value = this.parseString(learningEventStringLimits[key]);
        if (
          canonicalLearningEventIdentifierKeys.has(key) &&
          (value.length === 0 || value !== value.trim())
        ) {
          this.fail();
        }
        event[key] = value;
      }

      this.skipWhitespace();
      if (this.peek() === "}") break;
      this.expect(",");
      this.skipWhitespace();
      if (this.peek() === "}") this.fail();
    }

    this.expect("}");
    return event;
  }

  private parseNumber(maxCharacters: number) {
    const start = this.index;
    if (this.peek() === "-") this.index += 1;

    if (this.peek() === "0") {
      this.index += 1;
    } else {
      if (!this.isDigitOneToNine(this.peek())) this.fail();
      this.index += 1;
      while (this.isDigit(this.peek())) {
        this.index += 1;
        if (this.index - start > maxCharacters) this.fail();
      }
    }

    if (this.peek() === ".") {
      this.index += 1;
      if (!this.isDigit(this.peek())) this.fail();
      while (this.isDigit(this.peek())) {
        this.index += 1;
        if (this.index - start > maxCharacters) this.fail();
      }
    }

    if (this.peek() === "e" || this.peek() === "E") {
      this.index += 1;
      if (this.peek() === "+" || this.peek() === "-") this.index += 1;
      if (!this.isDigit(this.peek())) this.fail();
      while (this.isDigit(this.peek())) {
        this.index += 1;
        if (this.index - start > maxCharacters) this.fail();
      }
    }

    if (this.index - start > maxCharacters) this.fail();
    return Number(this.input.slice(start, this.index));
  }

  private parseString(maxLength: number) {
    this.expect("\"");
    let value = "";
    while (this.index < this.input.length) {
      const character = this.input[this.index];
      this.index += 1;
      if (character === "\"") {
        if (!isWellFormedUnicode(value)) this.fail();
        return value;
      }
      if (character === "\\") {
        value += this.parseEscape();
        if (value.length > maxLength) this.fail();
        if (!isWellFormedUnicode(value)) this.fail();
        continue;
      }
      if (character.charCodeAt(0) <= 0x1f) this.fail();
      value += character;
      if (value.length > maxLength) this.fail();
      if (!isWellFormedUnicode(value)) {
        const lastCode = value.charCodeAt(value.length - 1);
        if (lastCode < 0xd800 || lastCode > 0xdbff) this.fail();
      }
    }
    return this.fail();
  }

  private parseEscape() {
    const escape = this.input[this.index];
    this.index += 1;
    if (escape === "\"" || escape === "\\" || escape === "/") return escape;
    if (escape === "b") return "\b";
    if (escape === "f") return "\f";
    if (escape === "n") return "\n";
    if (escape === "r") return "\r";
    if (escape === "t") return "\t";
    if (escape !== "u") return this.fail();

    let code = 0;
    for (let offset = 0; offset < 4; offset += 1) {
      const digit = this.input.charCodeAt(this.index + offset);
      let value: number;
      if (digit >= 0x30 && digit <= 0x39) value = digit - 0x30;
      else if (digit >= 0x41 && digit <= 0x46) value = digit - 0x41 + 10;
      else if (digit >= 0x61 && digit <= 0x66) value = digit - 0x61 + 10;
      else return this.fail();
      code = code * 16 + value;
    }
    this.index += 4;
    if (code >= 0xd800 && code <= 0xdbff) {
      if (this.input.slice(this.index, this.index + 2) !== "\\u") this.fail();
      this.index += 2;
      let lowCode = 0;
      for (let offset = 0; offset < 4; offset += 1) {
        const digit = this.input.charCodeAt(this.index + offset);
        let value: number;
        if (digit >= 0x30 && digit <= 0x39) value = digit - 0x30;
        else if (digit >= 0x41 && digit <= 0x46) value = digit - 0x41 + 10;
        else if (digit >= 0x61 && digit <= 0x66) value = digit - 0x61 + 10;
        else return this.fail();
        lowCode = lowCode * 16 + value;
      }
      if (lowCode < 0xdc00 || lowCode > 0xdfff) this.fail();
      this.index += 4;
      return String.fromCharCode(code, lowCode);
    }
    if (code >= 0xdc00 && code <= 0xdfff) this.fail();
    return String.fromCharCode(code);
  }

  private isDigit(character: string | undefined) {
    return character !== undefined && character >= "0" && character <= "9";
  }

  private isDigitOneToNine(character: string | undefined) {
    return character !== undefined && character >= "1" && character <= "9";
  }

  private skipWhitespace() {
    while (
      this.index < this.input.length &&
      isJsonWhitespace(this.input.charCodeAt(this.index))
    ) {
      this.index += 1;
    }
  }

  private peek() {
    return this.input[this.index];
  }

  private expect(character: string) {
    if (this.input[this.index] !== character) this.fail();
    this.index += 1;
  }

  private fail(): never {
    throw new SyntaxError("Invalid learning events JSON body.");
  }
}

export async function parseExactLearningEventsRequestBody(
  request: Request
): Promise<ExactLearningEventsRequestBodyResult> {
  const body = await readBoundedLearningEventsRequestBody(request);
  if (!body.ok) return body;

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(body.value);
  } catch {
    return { ok: false, status: 400, error: "Invalid UTF-8 JSON body." };
  }

  try {
    return {
      ok: true,
      value: new ExactLearningEventsJsonParser(text).parse()
    };
  } catch (error) {
    if (error instanceof LearningEventsBatchTooLargeError) {
      return { ok: false, status: 413, error: "Learning events batch is too large." };
    }
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }
}
