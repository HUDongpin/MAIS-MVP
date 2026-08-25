export type VisualizationSessionRequestBody = {
  moduleId: string;
  topicId: string;
  source: string;
};

export const MAX_VISUALIZATION_SESSION_REQUEST_BYTES = 4096;
export const MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS = 32;

const requestKeys = new Set<keyof VisualizationSessionRequestBody>([
  "moduleId",
  "topicId",
  "source",
]);

function isJsonWhitespace(value: string) {
  return value === " " || value === "\t" || value === "\n" || value === "\r";
}

function parseExactStringObject(text: string): VisualizationSessionRequestBody {
  let offset = 0;
  let closed = false;
  const result: Partial<VisualizationSessionRequestBody> = {};
  const seen = new Set<string>();

  function skipWhitespace() {
    while (isJsonWhitespace(text[offset] ?? "")) offset += 1;
  }

  function parseString() {
    if (text[offset] !== '"') throw new SyntaxError("Expected a JSON string.");
    const start = offset;
    offset += 1;
    while (offset < text.length) {
      const character = text[offset];
      if (character === '"') {
        offset += 1;
        const value: unknown = JSON.parse(text.slice(start, offset));
        if (typeof value !== "string") throw new SyntaxError("Expected a JSON string.");
        return value;
      }
      if (character === "\\") {
        offset += 2;
        continue;
      }
      if (character !== undefined && character.charCodeAt(0) <= 0x1f) {
        throw new SyntaxError("Unescaped control character in JSON string.");
      }
      offset += 1;
    }
    throw new SyntaxError("Unterminated JSON string.");
  }

  skipWhitespace();
  if (text[offset] !== "{") throw new SyntaxError("Expected a top-level JSON object.");
  offset += 1;
  skipWhitespace();
  if (text[offset] === "}") throw new SyntaxError("Request members are required.");

  while (offset < text.length) {
    const key = parseString();
    if (seen.has(key)) throw new SyntaxError("Duplicate request member.");
    seen.add(key);
    skipWhitespace();
    if (text[offset] !== ":") throw new SyntaxError("Expected a member separator.");
    offset += 1;
    skipWhitespace();
    const value = parseString();
    if (requestKeys.has(key as keyof VisualizationSessionRequestBody)) {
      result[key as keyof VisualizationSessionRequestBody] = value;
    }
    skipWhitespace();
    if (text[offset] === "}") {
      offset += 1;
      closed = true;
      break;
    }
    if (text[offset] !== ",") throw new SyntaxError("Expected an object separator.");
    offset += 1;
    skipWhitespace();
  }

  skipWhitespace();
  if (!closed) throw new SyntaxError("Expected a closing object token.");
  if (offset !== text.length) throw new SyntaxError("Trailing request data is not allowed.");
  if (
    seen.size !== requestKeys.size ||
    [...requestKeys].some((key) => !seen.has(key))
  ) {
    throw new SyntaxError("Exactly moduleId, topicId, and source are required.");
  }
  return result as VisualizationSessionRequestBody;
}

async function readBoundedUtf8Body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("A request body is required.");

  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
  let byteLength = 0;
  let emptyChunkCount = 0;
  let text = "";
  let cancelled = false;
  let hasPrimaryError = false;
  const cancelBestEffort = (error: unknown) => {
    if (cancelled) return;
    cancelled = true;
    try {
      void Promise.resolve(reader.cancel(error)).catch(() => {});
    } catch {
      // The validation error remains authoritative if cancellation fails.
    }
  };
  const throwWithPrimaryError = (error: SyntaxError): never => {
    cancelBestEffort(error);
    throw error;
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength === 0) {
        emptyChunkCount += 1;
        if (emptyChunkCount > MAX_VISUALIZATION_SESSION_EMPTY_CHUNKS) {
          throwWithPrimaryError(new SyntaxError(
            "Visualization session request body has too many empty chunks.",
          ));
        }
        continue;
      }
      byteLength += value.byteLength;
      if (byteLength > MAX_VISUALIZATION_SESSION_REQUEST_BYTES) {
        throwWithPrimaryError(new SyntaxError(
          "Visualization session request body is too large.",
        ));
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } catch (error) {
    hasPrimaryError = true;
    cancelBestEffort(error);
    throw error;
  } finally {
    try {
      reader.releaseLock();
    } catch (releaseError) {
      if (!hasPrimaryError) throw releaseError;
    }
  }
}

export async function parseVisualizationSessionRequestBody(
  request: Request,
): Promise<VisualizationSessionRequestBody> {
  return parseExactStringObject(await readBoundedUtf8Body(request));
}
