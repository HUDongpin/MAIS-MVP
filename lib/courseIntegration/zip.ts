import { CourseImportError } from "./errors";

export interface ScormImportLimits {
  readonly maxPackageBytes: number;
  readonly maxFiles: number;
  readonly maxSingleFileBytes: number;
  readonly maxTotalUncompressedBytes: number;
  readonly maxManifestBytes: number;
  readonly maxIdentifierChars: number;
  readonly maxTitleChars: number;
  readonly maxWarnings: number;
  readonly maxReportBytes: number;
}

export const DEFAULT_SCORM_IMPORT_LIMITS: ScormImportLimits = Object.freeze({
  maxPackageBytes: 20 * 1024 * 1024,
  maxFiles: 2_000,
  maxSingleFileBytes: 16 * 1024 * 1024,
  maxTotalUncompressedBytes: 64 * 1024 * 1024,
  maxManifestBytes: 1024 * 1024,
  maxIdentifierChars: 256,
  maxTitleChars: 2_048,
  maxWarnings: 256,
  maxReportBytes: 8 * 1024 * 1024
});

export interface CanonicalArchivePath {
  readonly canonicalPath: string;
  readonly pathKey: string;
}

export interface ZipEntryMetadata extends CanonicalArchivePath {
  readonly rawName: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly crc32: number;
  readonly compressionMethod: 0 | 8;
  readonly isDirectory: boolean;
}

export interface ZipPreflightResult {
  readonly entries: readonly ZipEntryMetadata[];
  readonly entryCount: number;
  readonly fileCount: number;
  readonly totalUncompressedBytes: number;
}

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const MAX_ZIP_COMMENT_BYTES = 0xffff;
const UTF8_FILENAME_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;
const STRONG_ENCRYPTION_FLAG = 0x0040;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const INFO_ZIP_UNICODE_PATH_EXTRA_FIELD = 0x7075;

function fail(
  code: ConstructorParameters<typeof CourseImportError>[0],
  message: string,
  status: ConstructorParameters<typeof CourseImportError>[2]
): never {
  throw new CourseImportError(code, message, status);
}

function assertRange(start: number, length: number, total: number) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(length) || start < 0 || length < 0 || start + length > total) {
    fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
  }
}

function u16(view: DataView, offset: number) {
  assertRange(offset, 2, view.byteLength);
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  assertRange(offset, 4, view.byteLength);
  return view.getUint32(offset, true);
}

function assertSafeExtraFields(view: DataView, start: number, length: number) {
  assertRange(start, length, view.byteLength);
  const end = start + length;
  let cursor = start;
  while (cursor < end) {
    if (end - cursor < 4) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    const fieldId = u16(view, cursor);
    const fieldLength = u16(view, cursor + 2);
    cursor += 4;
    if (fieldLength > end - cursor) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    if (fieldId === INFO_ZIP_UNICODE_PATH_EXTRA_FIELD) {
      fail(
        "ZIP_FILENAME_ENCODING_UNSUPPORTED",
        "The ZIP contains a filename encoding that is not supported safely.",
        422
      );
    }
    cursor += fieldLength;
  }
}

function findEndOfCentralDirectory(view: DataView) {
  const earliest = Math.max(0, view.byteLength - MAX_ZIP_COMMENT_BYTES - 22);
  for (let offset = view.byteLength - 22; offset >= earliest; offset -= 1) {
    if (u32(view, offset) !== END_OF_CENTRAL_DIRECTORY) continue;
    const commentLength = u16(view, offset + 20);
    if (offset + 22 + commentLength === view.byteLength) return offset;
  }
  fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
}

function decodeFilename(bytes: Uint8Array, utf8: boolean) {
  if (!utf8 && bytes.some((value) => value > 0x7f)) {
    fail(
      "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      "The ZIP contains a filename encoding that is not supported safely.",
      422
    );
  }
  try {
    return new TextDecoder(utf8 ? "utf-8" : "ascii", { fatal: true }).decode(bytes);
  } catch {
    fail(
      "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      "The ZIP contains a filename encoding that is not supported safely.",
      422
    );
  }
}

export function canonicalizeArchivePath(path: string): CanonicalArchivePath {
  if (path.includes("\u0000")) {
    fail("ZIP_PATH_UNSAFE", "The ZIP contains an unsafe entry path.", 422);
  }
  const slashPath = path.replaceAll("\\", "/").normalize("NFC");
  if (
    slashPath.startsWith("/") ||
    slashPath.startsWith("//") ||
    /^[A-Za-z]:/.test(slashPath)
  ) {
    fail("ZIP_PATH_UNSAFE", "The ZIP contains an unsafe entry path.", 422);
  }

  const segments: string[] = [];
  for (const segment of slashPath.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") fail("ZIP_PATH_UNSAFE", "The ZIP contains an unsafe entry path.", 422);
    segments.push(segment);
  }
  if (segments.length === 0) fail("ZIP_PATH_UNSAFE", "The ZIP contains an unsafe entry path.", 422);

  const canonicalPath = segments.join("/");
  return {
    canonicalPath,
    pathKey: canonicalPath.toLowerCase()
  };
}

function validatedLimits(overrides: Partial<ScormImportLimits> | undefined): ScormImportLimits {
  const limits = { ...DEFAULT_SCORM_IMPORT_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`${name} must be a positive safe integer.`);
    }
  }
  if (limits.maxManifestBytes > limits.maxSingleFileBytes) {
    throw new TypeError("maxManifestBytes must not exceed maxSingleFileBytes.");
  }
  return Object.freeze(limits);
}

export function resolveScormImportLimits(overrides?: Partial<ScormImportLimits>) {
  return validatedLimits(overrides);
}

export function preflightZip(
  bytes: Uint8Array,
  limits: ScormImportLimits
): ZipPreflightResult {
  if (bytes.byteLength === 0) fail("PACKAGE_EMPTY", "The uploaded package is empty.", 400);
  if (bytes.byteLength > limits.maxPackageBytes) {
    fail("PACKAGE_TOO_LARGE", "The uploaded package exceeds the size limit.", 413);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  const diskNumber = u16(view, eocdOffset + 4);
  const centralDirectoryDisk = u16(view, eocdOffset + 6);
  const entriesOnDisk = u16(view, eocdOffset + 8);
  const totalEntries = u16(view, eocdOffset + 10);
  const centralDirectorySize = u32(view, eocdOffset + 12);
  const centralDirectoryOffset = u32(view, eocdOffset + 16);

  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== totalEntries) {
    fail("ZIP_MULTIDISK_UNSUPPORTED", "Multi-disk ZIP packages are not supported.", 422);
  }
  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    fail("ZIP64_UNSUPPORTED", "ZIP64 packages are not supported by this static importer.", 422);
  }
  if (totalEntries > limits.maxFiles) {
    fail("ZIP_ENTRY_LIMIT_EXCEEDED", "The ZIP contains too many entries.", 413);
  }
  assertRange(centralDirectoryOffset, centralDirectorySize, bytes.byteLength);
  if (centralDirectoryOffset + centralDirectorySize > eocdOffset) {
    fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
  }

  const entries: ZipEntryMetadata[] = [];
  const pathKeys = new Set<string>();
  const localOffsets = new Set<number>();
  const occupiedRanges: Array<{ start: number; end: number }> = [];
  let cursor = centralDirectoryOffset;
  let totalUncompressedBytes = 0;
  let fileCount = 0;

  for (let index = 0; index < totalEntries; index += 1) {
    assertRange(cursor, 46, bytes.byteLength);
    if (u32(view, cursor) !== CENTRAL_DIRECTORY_HEADER) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }

    const versionMadeBy = u16(view, cursor + 4);
    const flags = u16(view, cursor + 8);
    const compressionMethod = u16(view, cursor + 10);
    const crc = u32(view, cursor + 16);
    const compressedSize = u32(view, cursor + 20);
    const uncompressedSize = u32(view, cursor + 24);
    const filenameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const startingDisk = u16(view, cursor + 34);
    const externalAttributes = u32(view, cursor + 38);
    const localHeaderOffset = u32(view, cursor + 42);
    const fullHeaderLength = 46 + filenameLength + extraLength + commentLength;
    assertRange(cursor, fullHeaderLength, bytes.byteLength);
    assertSafeExtraFields(view, cursor + 46 + filenameLength, extraLength);

    if (startingDisk !== 0) {
      fail("ZIP_MULTIDISK_UNSUPPORTED", "Multi-disk ZIP packages are not supported.", 422);
    }
    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      localHeaderOffset === 0xffffffff
    ) {
      fail("ZIP64_UNSUPPORTED", "ZIP64 packages are not supported by this static importer.", 422);
    }
    if ((flags & (ENCRYPTED_FLAG | STRONG_ENCRYPTION_FLAG)) !== 0) {
      fail("ZIP_ENCRYPTED_ENTRY", "Encrypted ZIP entries are not supported.", 422);
    }
    if ((flags & DATA_DESCRIPTOR_FLAG) !== 0) {
      fail(
        "ZIP_DATA_DESCRIPTOR_UNSUPPORTED",
        "ZIP data descriptors are not supported by this static importer.",
        422
      );
    }
    if (compressionMethod !== 0 && compressionMethod !== 8) {
      fail(
        "ZIP_COMPRESSION_UNSUPPORTED",
        "The ZIP uses an unsupported compression method.",
        422
      );
    }

    const filenameBytes = bytes.subarray(cursor + 46, cursor + 46 + filenameLength);
    const rawName = decodeFilename(filenameBytes, (flags & UTF8_FILENAME_FLAG) !== 0);
    const canonical = canonicalizeArchivePath(rawName);
    if (pathKeys.has(canonical.pathKey)) {
      fail("ZIP_DUPLICATE_PATH", "The ZIP contains duplicate canonical entry paths.", 422);
    }
    pathKeys.add(canonical.pathKey);

    const hasDirectorySuffix = rawName.replaceAll("\\", "/").endsWith("/");
    const sourcePlatform = versionMadeBy >>> 8;
    const unixLikePlatform = sourcePlatform === 3 || sourcePlatform === 19;
    const unixFileType = (externalAttributes >>> 16) & 0xf000;
    if (unixLikePlatform && unixFileType === 0xa000) {
      fail(
        "ZIP_LINK_UNSUPPORTED",
        "ZIP symbolic links are not supported by this static importer.",
        422
      );
    }
    if (
      unixLikePlatform &&
      unixFileType !== 0 &&
      unixFileType !== 0x4000 &&
      unixFileType !== 0x8000
    ) {
      fail(
        "ZIP_SPECIAL_FILE_UNSUPPORTED",
        "ZIP special filesystem nodes are not supported by this static importer.",
        422
      );
    }
    const attributesDeclareDirectory = (externalAttributes & 0x10) !== 0 ||
      (unixLikePlatform && unixFileType === 0x4000);
    const attributesDeclareRegularFile = unixLikePlatform && unixFileType === 0x8000;
    if (
      (!hasDirectorySuffix && attributesDeclareDirectory) ||
      (hasDirectorySuffix && attributesDeclareRegularFile) ||
      (hasDirectorySuffix && (compressedSize !== 0 || uncompressedSize !== 0 || crc !== 0))
    ) {
      fail(
        "ZIP_DIRECTORY_INVALID",
        "The ZIP contains contradictory directory metadata.",
        422
      );
    }
    const isDirectory = hasDirectorySuffix;
    if (!isDirectory) {
      fileCount += 1;
      if (uncompressedSize > limits.maxSingleFileBytes) {
        fail("ZIP_ENTRY_TOO_LARGE", "A ZIP entry exceeds the single-file size limit.", 413);
      }
      totalUncompressedBytes += uncompressedSize;
      if (totalUncompressedBytes > limits.maxTotalUncompressedBytes) {
        fail("ZIP_TOTAL_SIZE_EXCEEDED", "The ZIP exceeds the total uncompressed size limit.", 413);
      }
    }

    if (localOffsets.has(localHeaderOffset)) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    localOffsets.add(localHeaderOffset);
    assertRange(localHeaderOffset, 30, bytes.byteLength);
    if (u32(view, localHeaderOffset) !== LOCAL_FILE_HEADER) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    const localFlags = u16(view, localHeaderOffset + 6);
    const localCompressionMethod = u16(view, localHeaderOffset + 8);
    const localFilenameLength = u16(view, localHeaderOffset + 26);
    const localExtraLength = u16(view, localHeaderOffset + 28);
    const localHeaderLength = 30 + localFilenameLength + localExtraLength;
    assertRange(localHeaderOffset, localHeaderLength, bytes.byteLength);
    assertSafeExtraFields(
      view,
      localHeaderOffset + 30 + localFilenameLength,
      localExtraLength
    );
    if (
      localFlags !== flags ||
      localCompressionMethod !== compressionMethod ||
      (localFlags & (ENCRYPTED_FLAG | STRONG_ENCRYPTION_FLAG)) !== 0
    ) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    const localFilenameBytes = bytes.subarray(
      localHeaderOffset + 30,
      localHeaderOffset + 30 + localFilenameLength
    );
    const localRawName = decodeFilename(localFilenameBytes, (localFlags & UTF8_FILENAME_FLAG) !== 0);
    if (
      canonicalizeArchivePath(localRawName).pathKey !== canonical.pathKey ||
      localRawName.replaceAll("\\", "/").endsWith("/") !== hasDirectorySuffix
    ) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    if (
      u32(view, localHeaderOffset + 14) !== crc ||
      u32(view, localHeaderOffset + 18) !== compressedSize ||
      u32(view, localHeaderOffset + 22) !== uncompressedSize
    ) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    const dataStart = localHeaderOffset + localHeaderLength;
    assertRange(dataStart, compressedSize, centralDirectoryOffset);
    const dataEnd = dataStart + compressedSize;
    if (occupiedRanges.some((range) => localHeaderOffset < range.end && range.start < dataEnd)) {
      fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
    }
    occupiedRanges.push({ start: localHeaderOffset, end: dataEnd });

    entries.push(Object.freeze({
      ...canonical,
      rawName,
      compressedSize,
      uncompressedSize,
      crc32: crc,
      compressionMethod: compressionMethod as 0 | 8,
      isDirectory
    }));
    cursor += fullHeaderLength;
  }

  if (cursor !== centralDirectoryOffset + centralDirectorySize) {
    fail("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
  }

  return Object.freeze({
    entries: Object.freeze(entries),
    entryCount: entries.length,
    fileCount,
    totalUncompressedBytes
  });
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

export function calculateCrc32(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 0xff]!;
  return (value ^ 0xffffffff) >>> 0;
}
