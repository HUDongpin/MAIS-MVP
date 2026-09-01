export type CourseImportMultipartErrorCode =
  | "INVALID_CONTENT_LENGTH"
  | "MULTIPART_INVALID"
  | "MULTIPART_FIELD_LIMIT_EXCEEDED"
  | "MULTIPART_FIELD_UNSUPPORTED"
  | "PACKAGE_FIELD_REQUIRED"
  | "PACKAGE_EMPTY"
  | "PACKAGE_TOO_LARGE"
  | "COURSE_IMPORT_ABORTED";

export class CourseImportMultipartError extends Error {
  readonly code: CourseImportMultipartErrorCode;
  readonly status: 400 | 408 | 413;

  constructor(
    code: CourseImportMultipartErrorCode,
    message: string,
    status: 400 | 408 | 413
  ) {
    super(message);
    this.name = "CourseImportMultipartError";
    this.code = code;
    this.status = status;
  }
}

export function isCourseImportMultipartError(
  error: unknown
): error is CourseImportMultipartError {
  return error instanceof CourseImportMultipartError;
}

export interface CourseImportMultipartLimits {
  readonly maxBodyBytes: number;
  readonly maxPackageBytes: number;
  readonly maxParts?: number;
  readonly maxPartHeaderBytes?: number;
  readonly maxExpectedUserIdBytes?: number;
  readonly signal?: AbortSignal;
}

export interface ParsedCourseImportMultipart {
  readonly packageBytes: Uint8Array;
  readonly expectedUserIds: readonly string[];
}

interface ResolvedMultipartLimits {
  readonly maxBodyBytes: number;
  readonly maxPackageBytes: number;
  readonly maxParts: number;
  readonly maxPartHeaderBytes: number;
  readonly maxExpectedUserIdBytes: number;
}

interface ParsedDisposition {
  readonly name: string;
  readonly filename: string | null;
}

const CRLF = new Uint8Array([13, 10]);
const HEADER_END = new Uint8Array([13, 10, 13, 10]);
const DEFAULT_MAX_PARTS = 32;
const DEFAULT_MAX_PART_HEADER_BYTES = 16 * 1024;
const DEFAULT_MAX_EXPECTED_USER_ID_BYTES = 1024;
const BOUNDARY_PATTERN = /^[0-9A-Za-z'()+_,.\/:=?-]{1,70}$/;
const HEADER_NAME_PATTERN = /^[A-Za-z0-9-]+$/;
const DISPOSITION_PARAMETER_PATTERN = /^([A-Za-z0-9_-]+)\s*=\s*"((?:\\.|[^"\\])*)"$/;

function fail(
  code: CourseImportMultipartErrorCode,
  message: string,
  status: 400 | 408 | 413
): never {
  throw new CourseImportMultipartError(code, message, status);
}

function multipartInvalid(): never {
  fail("MULTIPART_INVALID", "The multipart request could not be parsed.", 400);
}

function resolveLimits(limits: CourseImportMultipartLimits): ResolvedMultipartLimits {
  const resolved = {
    maxBodyBytes: limits.maxBodyBytes,
    maxPackageBytes: limits.maxPackageBytes,
    maxParts: limits.maxParts ?? DEFAULT_MAX_PARTS,
    maxPartHeaderBytes: limits.maxPartHeaderBytes ?? DEFAULT_MAX_PART_HEADER_BYTES,
    maxExpectedUserIdBytes: limits.maxExpectedUserIdBytes ?? DEFAULT_MAX_EXPECTED_USER_ID_BYTES
  };
  for (const [name, value] of Object.entries(resolved)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`${name} must be a positive safe integer.`);
    }
  }
  if (resolved.maxPackageBytes > resolved.maxBodyBytes) {
    throw new TypeError("maxPackageBytes must not exceed maxBodyBytes.");
  }
  return Object.freeze(resolved);
}

function parseBoundary(contentType: string | null) {
  if (contentType === null) multipartInvalid();
  const match = /^\s*multipart\/form-data\s*;\s*boundary=(?:"([^"\r\n]+)"|([^;\s"\r\n]+))\s*$/i.exec(contentType);
  const boundary = match?.[1] ?? match?.[2] ?? null;
  if (boundary === null || !BOUNDARY_PATTERN.test(boundary)) multipartInvalid();
  return boundary;
}

function startsWithAt(bytes: Uint8Array, expected: Uint8Array, offset: number) {
  if (offset < 0 || offset + expected.byteLength > bytes.byteLength) return false;
  for (let index = 0; index < expected.byteLength; index += 1) {
    if (bytes[offset + index] !== expected[index]) return false;
  }
  return true;
}

function indexOfSequence(bytes: Uint8Array, sequence: Uint8Array, from: number) {
  if (sequence.byteLength === 0) return from;
  const finalStart = bytes.byteLength - sequence.byteLength;
  outer: for (let offset = Math.max(0, from); offset <= finalStart; offset += 1) {
    for (let index = 0; index < sequence.byteLength; index += 1) {
      if (bytes[offset + index] !== sequence[index]) continue outer;
    }
    return offset;
  }
  return -1;
}

function concatBytes(left: Uint8Array, right: Uint8Array) {
  const joined = new Uint8Array(left.byteLength + right.byteLength);
  joined.set(left, 0);
  joined.set(right, left.byteLength);
  return joined;
}

async function readChunkWithAbort(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signals: readonly (AbortSignal | undefined)[]
) {
  const activeSignals = signals.filter((signal): signal is AbortSignal => signal !== undefined);
  if (activeSignals.some((signal) => signal.aborted)) {
    await reader.cancel().catch(() => undefined);
    throw new CourseImportMultipartError(
      "COURSE_IMPORT_ABORTED",
      "The course import request was cancelled or exceeded its time limit.",
      408
    );
  }
  return new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      for (const signal of activeSignals) signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      void reader.cancel().catch(() => undefined);
      reject(new CourseImportMultipartError(
        "COURSE_IMPORT_ABORTED",
        "The course import request was cancelled or exceeded its time limit.",
        408
      ));
    };
    for (const signal of activeSignals) signal.addEventListener("abort", onAbort, { once: true });
    if (activeSignals.some((signal) => signal.aborted)) {
      onAbort();
      return;
    }
    reader.read().then(
      (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    );
  });
}

async function readBoundedBody(request: Request, maxBodyBytes: number, signal?: AbortSignal) {
  const throwIfAborted = () => {
    if (signal?.aborted || request.signal.aborted) {
      fail(
        "COURSE_IMPORT_ABORTED",
        "The course import request was cancelled or exceeded its time limit.",
        408
      );
    }
  };
  throwIfAborted();
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^[0-9]+$/.test(contentLength)) {
      fail("INVALID_CONTENT_LENGTH", "The request content length is invalid.", 400);
    }
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength)) {
      fail("INVALID_CONTENT_LENGTH", "The request content length is invalid.", 400);
    }
    if (declaredLength > maxBodyBytes) {
      fail("PACKAGE_TOO_LARGE", "The uploaded package exceeds the size limit.", 413);
    }
  }

  const reader = request.body?.getReader();
  if (!reader) multipartInvalid();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      throwIfAborted();
      const result = await readChunkWithAbort(reader, [signal, request.signal]);
      throwIfAborted();
      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) multipartInvalid();
      total += result.value.byteLength;
      if (total > maxBodyBytes) {
        await reader.cancel().catch(() => undefined);
        fail("PACKAGE_TOO_LARGE", "The uploaded package exceeds the size limit.", 413);
      }
      chunks.push(new Uint8Array(result.value));
    }
  } catch (error) {
    if (error instanceof CourseImportMultipartError) throw error;
    multipartInvalid();
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function decodeHeaders(bytes: Uint8Array) {
  for (const byte of bytes) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 0x20 && byte <= 0x7e)) continue;
    multipartInvalid();
  }
  return new TextDecoder("ascii", { fatal: true }).decode(bytes);
}

function parseHeaders(bytes: Uint8Array) {
  const headers = new Map<string, string>();
  const lines = decodeHeaders(bytes).split("\r\n");
  if (lines.length === 0 || lines.length > 20) multipartInvalid();
  for (const line of lines) {
    if (line.length === 0 || /^[ \t]/.test(line)) multipartInvalid();
    const colon = line.indexOf(":");
    if (colon <= 0) multipartInvalid();
    const name = line.slice(0, colon);
    const value = line.slice(colon + 1).trim();
    if (!HEADER_NAME_PATTERN.test(name) || value.length === 0) multipartInvalid();
    const normalizedName = name.toLowerCase();
    if (headers.has(normalizedName)) multipartInvalid();
    if (normalizedName !== "content-disposition" && normalizedName !== "content-type") {
      multipartInvalid();
    }
    headers.set(normalizedName, value);
  }
  return headers;
}

function splitDisposition(value: string) {
  const parts: string[] = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "\"") {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === ";") {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quoted || escaped) multipartInvalid();
  parts.push(value.slice(start).trim());
  return parts;
}

function decodeQuotedValue(value: string) {
  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (character === "\\") {
      index += 1;
      if (index >= value.length) multipartInvalid();
      decoded += value[index]!;
    } else {
      decoded += character;
    }
  }
  if (/\p{Cc}/u.test(decoded)) multipartInvalid();
  return decoded;
}

function parseDisposition(value: string | undefined): ParsedDisposition {
  if (value === undefined) multipartInvalid();
  const parts = splitDisposition(value);
  if (parts.shift()?.toLowerCase() !== "form-data") multipartInvalid();
  const parameters = new Map<string, string>();
  for (const part of parts) {
    const match = DISPOSITION_PARAMETER_PATTERN.exec(part);
    if (!match) multipartInvalid();
    const name = match[1]!.toLowerCase();
    if (name !== "name" && name !== "filename") multipartInvalid();
    if (parameters.has(name)) multipartInvalid();
    parameters.set(name, decodeQuotedValue(match[2]!));
  }
  const name = parameters.get("name");
  if (!name || name.length > 128) multipartInvalid();
  const filename = parameters.get("filename") ?? null;
  if (filename !== null && (filename.length === 0 || filename.length > 512)) multipartInvalid();
  return { name, filename };
}

function findPartBoundary(bytes: Uint8Array, marker: Uint8Array, from: number) {
  let candidate = indexOfSequence(bytes, marker, from);
  while (candidate >= 0) {
    const suffix = candidate + marker.byteLength;
    const isClosing = bytes[suffix] === 45 && bytes[suffix + 1] === 45;
    if (isClosing || startsWithAt(bytes, CRLF, suffix)) return candidate;
    candidate = indexOfSequence(bytes, marker, candidate + 1);
  }
  return -1;
}

function parseMultipartBody(
  body: Uint8Array,
  boundary: string,
  limits: ResolvedMultipartLimits
): ParsedCourseImportMultipart {
  const delimiter = new TextEncoder().encode(`--${boundary}`);
  const boundaryMarker = concatBytes(CRLF, delimiter);
  if (!startsWithAt(body, delimiter, 0)) multipartInvalid();

  const expectedUserIds: string[] = [];
  let packageBytes: Uint8Array | null = null;
  let cursor = delimiter.byteLength;
  let partCount = 0;

  while (true) {
    if (body[cursor] === 45 && body[cursor + 1] === 45) {
      cursor += 2;
      if (startsWithAt(body, CRLF, cursor)) cursor += CRLF.byteLength;
      if (cursor !== body.byteLength) multipartInvalid();
      break;
    }
    if (!startsWithAt(body, CRLF, cursor)) multipartInvalid();
    cursor += CRLF.byteLength;
    partCount += 1;
    if (partCount > limits.maxParts) {
      fail("MULTIPART_FIELD_LIMIT_EXCEEDED", "The multipart request contains too many fields.", 413);
    }

    const headerEnd = indexOfSequence(body, HEADER_END, cursor);
    if (headerEnd < 0 || headerEnd - cursor > limits.maxPartHeaderBytes) multipartInvalid();
    const headers = parseHeaders(body.subarray(cursor, headerEnd));
    const disposition = parseDisposition(headers.get("content-disposition"));
    const contentStart = headerEnd + HEADER_END.byteLength;
    const contentEnd = findPartBoundary(body, boundaryMarker, contentStart);
    if (contentEnd < 0) multipartInvalid();
    const content = body.subarray(contentStart, contentEnd);

    if (disposition.name === "package") {
      if (disposition.filename === null || packageBytes !== null) {
        fail(
          "PACKAGE_FIELD_REQUIRED",
          "Exactly one file must be supplied in the package field.",
          400
        );
      }
      if (content.byteLength === 0) {
        fail("PACKAGE_EMPTY", "The uploaded package is empty.", 400);
      }
      if (content.byteLength > limits.maxPackageBytes) {
        fail("PACKAGE_TOO_LARGE", "The uploaded package exceeds the size limit.", 413);
      }
      packageBytes = new Uint8Array(content);
    } else if (disposition.name === "expectedUserId") {
      if (disposition.filename !== null || content.byteLength > limits.maxExpectedUserIdBytes) {
        multipartInvalid();
      }
      try {
        expectedUserIds.push(new TextDecoder("utf-8", { fatal: true }).decode(content));
      } catch {
        multipartInvalid();
      }
    } else {
      fail("MULTIPART_FIELD_UNSUPPORTED", "The multipart request contains an unsupported field.", 400);
    }

    cursor = contentEnd + CRLF.byteLength + delimiter.byteLength;
  }

  if (packageBytes === null) {
    fail(
      "PACKAGE_FIELD_REQUIRED",
      "Exactly one file must be supplied in the package field.",
      400
    );
  }
  return Object.freeze({
    packageBytes,
    expectedUserIds: Object.freeze(expectedUserIds)
  });
}

export async function parseBoundedCourseImportMultipart(
  request: Request,
  limits: CourseImportMultipartLimits
): Promise<ParsedCourseImportMultipart> {
  const resolvedLimits = resolveLimits(limits);
  const boundary = parseBoundary(request.headers.get("content-type"));
  const body = await readBoundedBody(request, resolvedLimits.maxBodyBytes, limits.signal);
  return parseMultipartBody(body, boundary, resolvedLimits);
}
