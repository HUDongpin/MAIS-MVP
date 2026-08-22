export const maxVisualizationSessionRequestBodyBytes = 4_096;

export type ExactVisualizationSessionRequestBody = {
  moduleId: string;
  topicId: string;
  source: string;
};

type ExactVisualizationSessionRequestBodyResult =
  | { ok: true; value: ExactVisualizationSessionRequestBody }
  | { ok: false; status: 400 | 413; error: string };

const exactVisualizationSessionRequestKeys = new Set([
  "moduleId",
  "topicId",
  "source"
]);

function parseBoundedContentLength(value: string | null) {
  if (value === null) return { ok: true as const, value: null };
  if (value.length === 0) return { ok: false as const };

  let parsed = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x30 || code > 0x39) return { ok: false as const };
    parsed = Math.min(
      maxVisualizationSessionRequestBodyBytes + 1,
      parsed * 10 + code - 0x30
    );
  }
  return { ok: true as const, value: parsed };
}

async function readBoundedRequestBody(request: Request): Promise<
  | { ok: true; value: Uint8Array }
  | { ok: false; status: 400 | 413; error: string }
> {
  const contentLength = parseBoundedContentLength(request.headers.get("content-length"));
  if (!contentLength.ok) {
    return { ok: false, status: 400, error: "Invalid Content-Length." };
  }
  if (
    contentLength.value !== null &&
    contentLength.value > maxVisualizationSessionRequestBodyBytes
  ) {
    return { ok: false, status: 413, error: "Visualization session body is too large." };
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
      if (totalBytes > maxVisualizationSessionRequestBodyBytes) {
        try {
          await reader.cancel("Visualization session body is too large.");
        } catch {
          // The observed byte count remains authoritative even when the
          // producer rejects cancellation.
        }
        return { ok: false, status: 413, error: "Visualization session body is too large." };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  } finally {
    reader.releaseLock();
  }

  if (contentLength.value !== null && contentLength.value !== totalBytes) {
    return { ok: false, status: 400, error: "Content-Length does not match the request body." };
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

class ExactVisualizationSessionJsonParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse(): ExactVisualizationSessionRequestBody {
    this.skipWhitespace();
    this.expect("{");
    this.skipWhitespace();

    const seenKeys = new Set<string>();
    let moduleId: string | undefined;
    let topicId: string | undefined;
    let source: string | undefined;

    while (this.peek() !== "}") {
      const key = this.parseString();
      if (!exactVisualizationSessionRequestKeys.has(key) || seenKeys.has(key)) {
        this.fail();
      }
      seenKeys.add(key);

      this.skipWhitespace();
      this.expect(":");
      this.skipWhitespace();
      const value = this.parseString();

      if (key === "moduleId") moduleId = value;
      else if (key === "topicId") topicId = value;
      else source = value;

      this.skipWhitespace();
      if (this.peek() === "}") break;
      this.expect(",");
      this.skipWhitespace();
      if (this.peek() === "}") this.fail();
    }

    this.expect("}");
    this.skipWhitespace();
    if (this.index !== this.input.length) this.fail();
    if (
      seenKeys.size !== exactVisualizationSessionRequestKeys.size ||
      moduleId === undefined ||
      topicId === undefined ||
      source === undefined
    ) {
      this.fail();
    }
    return { moduleId, topicId, source };
  }

  private parseString() {
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
        continue;
      }
      if (character.charCodeAt(0) <= 0x1f) this.fail();
      value += character;
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
    return String.fromCharCode(code);
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
    throw new SyntaxError("Invalid visualization session JSON body.");
  }
}

export async function parseExactVisualizationSessionRequestBody(
  request: Request
): Promise<ExactVisualizationSessionRequestBodyResult> {
  const body = await readBoundedRequestBody(request);
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
      value: new ExactVisualizationSessionJsonParser(text).parse()
    };
  } catch {
    return { ok: false, status: 400, error: "Invalid JSON body." };
  }
}
