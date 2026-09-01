import { createHash } from "node:crypto";
import JSZip, { type JSZipObject } from "jszip";

import { CourseImportError } from "./errors";
import {
  COURSE_INTEGRATION_SCHEMA_VERSION,
  createCanonicalCourseVersion,
  type CanonicalActivity,
  type CanonicalModule,
  type CanonicalResource,
  type CanonicalUnit,
  type CanonicalCourseVersion
} from "./model";
import { EXTERNAL_COURSE_INTEGRATION_READINESS } from "./readiness";
import {
  calculateCrc32,
  canonicalizeArchivePath,
  preflightZip,
  resolveScormImportLimits,
  type ScormImportLimits,
  type ZipEntryMetadata
} from "./zip";
import {
  SCORM_ADLCP_NAMESPACES,
  XML_NAMESPACE_DECLARATION_URI,
  XML_NAMESPACE_URI,
  isSupportedScormStructuralElement,
  parseStaticXml,
  xmlBaseAttribute,
  xmlAttribute,
  xmlChildren,
  xmlFirstChild,
  xmlNamespaceVersions,
  xmlScormTypeAttribute,
  xmlText,
  type StaticXmlAttribute,
  type StaticXmlElement
} from "./xml";

export type ScormVersion = "1.2" | "2004";

export interface StaticImportWarning {
  readonly code:
    | "DEFAULT_ORGANIZATION_UNRESOLVED"
    | "ORGANIZATION_SKIPPED"
    | "ITEM_SKIPPED"
    | "RESOURCE_SKIPPED"
    | "RESOURCE_REFERENCE_UNRESOLVED"
    | "RESOURCE_DEPENDENCY_UNRESOLVED"
    | "RESOURCE_PATH_OMITTED"
    | "RESOURCE_FILE_NOT_IN_PACKAGE"
    | "UNSUPPORTED_SEMANTIC_OMITTED"
    | "WARNING_LIMIT_REACHED";
  readonly message: string;
  readonly sourceId?: string;
}

export interface BlockedExecutableMetadata {
  readonly path: string;
  readonly mediaType: string;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly referencedByResourceIds: readonly string[];
  readonly reason: "execution-disabled";
}

export interface ScormStaticImportReport {
  readonly reportVersion: "mais.scorm-static-import-report.v1";
  readonly source: {
    readonly format: "SCORM";
    readonly version: ScormVersion;
  };
  readonly sourcePackage: {
    readonly sha256: string;
  };
  readonly importEvent: {
    readonly importedAt: string;
  };
  readonly courseVersion: CanonicalCourseVersion;
  readonly archive: {
    readonly entryCount: number;
    readonly fileCount: number;
    readonly totalUncompressedBytes: number;
  };
  readonly warnings: readonly StaticImportWarning[];
  readonly blockedExecutables: readonly BlockedExecutableMetadata[];
  readonly externalIntegrationReadiness: typeof EXTERNAL_COURSE_INTEGRATION_READINESS;
}

export interface ImportScormPackageOptions {
  readonly importedAt?: string;
  readonly predecessorVersionId?: string | null;
  readonly limits?: Partial<ScormImportLimits>;
  readonly signal?: AbortSignal;
}

type ResourceBuilder = Omit<CanonicalResource, "referencedByIds" | "dependencyResourceIds"> & {
  referencedByIds: Set<string>;
  dependencySourceIds: Set<string>;
};

const scormStructuralElementNames = new Set([
  "manifest",
  "metadata",
  "schema",
  "schemaversion",
  "organizations",
  "organization",
  "title",
  "item",
  "resources",
  "resource",
  "file",
  "dependency"
]);

const scormCoreAttributeNames = new Set([
  "identifier",
  "href",
  "default",
  "identifierref",
  "type",
  "version"
]);

const expectedCoreChildren = new Map<string, ReadonlySet<string>>([
  ["manifest", new Set(["metadata", "organizations", "resources"])],
  ["metadata", new Set(["schema", "schemaversion"])],
  ["organizations", new Set(["organization"])],
  ["organization", new Set(["title", "item", "metadata"])],
  ["item", new Set(["title", "item", "metadata"])],
  ["resources", new Set(["resource"])],
  ["resource", new Set(["file", "dependency", "metadata"])],
  ["file", new Set(["metadata"])],
  ["dependency", new Set()]
]);

const representedUnqualifiedAttributes = new Map<string, ReadonlySet<string>>([
  ["manifest", new Set(["identifier"])],
  ["organizations", new Set(["default"])],
  ["organization", new Set(["identifier"])],
  ["item", new Set(["identifier", "identifierref"])],
  ["resource", new Set(["identifier", "href"])],
  ["file", new Set(["href"])],
  ["dependency", new Set(["identifierref"])]
]);

const xmlBaseMappedElements = new Set(["manifest", "resources", "resource", "file"]);

const blockedMediaTypes: Readonly<Record<string, string>> = Object.freeze({
  ".html": "text/html",
  ".htm": "text/html",
  ".xhtml": "application/xhtml+xml",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".cjs": "text/javascript",
  ".wasm": "application/wasm",
  ".swf": "application/x-shockwave-flash",
  ".svg": "image/svg+xml"
});

function isCoreScormElement(element: StaticXmlElement) {
  return scormStructuralElementNames.has(element.local) &&
    isSupportedScormStructuralElement(element, element.local);
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function extension(path: string) {
  const filename = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const dot = filename.lastIndexOf(".");
  return dot < 0 ? "" : filename.slice(dot);
}

function decodeManifest(bytes: Uint8Array) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    throw new CourseImportError(
      "MANIFEST_ENCODING_UNSUPPORTED",
      "The SCORM manifest must use valid UTF-8 encoding.",
      422
    );
  }
}

async function readEntryWithLimit(
  entry: JSZipObject,
  metadata: ZipEntryMetadata,
  maxBytes: number,
  signal?: AbortSignal
) {
  if (signal?.aborted) {
    throw new CourseImportError("SCORM_MANIFEST_INVALID", "The SCORM import was cancelled before completion.", 422);
  }
  let stream: NodeJS.ReadableStream;
  try {
    stream = entry.nodeStream("nodebuffer");
  } catch {
    throw new CourseImportError("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
  }

  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    let settled = false;
    stream.on("data", (rawChunk: Uint8Array) => {
      if (settled) return;
      if (signal?.aborted) {
        settled = true;
        stream.pause();
        reject(new CourseImportError("SCORM_MANIFEST_INVALID", "The SCORM import was cancelled before completion.", 422));
        return;
      }
      const chunk = new Uint8Array(rawChunk);
      total += chunk.byteLength;
      if (total > metadata.uncompressedSize) {
        settled = true;
        stream.pause();
        reject(new CourseImportError(
          "ZIP_INVALID",
          "The uploaded package is not a valid ZIP archive.",
          400
        ));
        return;
      }
      if (total > maxBytes) {
        settled = true;
        stream.pause();
        reject(new CourseImportError(
          "MANIFEST_TOO_LARGE",
          "The SCORM manifest exceeds the size limit.",
          413
        ));
        return;
      }
      chunks.push(chunk);
    });
    stream.once("error", () => {
      if (settled) return;
      settled = true;
      reject(new CourseImportError("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400));
    });
    stream.once("end", () => {
      if (settled) return;
      settled = true;
      if (total !== metadata.uncompressedSize) {
        reject(new CourseImportError("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400));
        return;
      }
      const result = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      if (calculateCrc32(result) !== metadata.crc32) {
        reject(new CourseImportError("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400));
        return;
      }
      resolve(result);
    });
  });
}

function unsupportedScormVersion(): never {
  throw new CourseImportError(
    "SCORM_VERSION_UNSUPPORTED",
    "The SCORM version could not be identified safely as 1.2 or 2004.",
    422
  );
}

function normalizeDeclaredScormVersion(value: string) {
  return value.replace(/\s+/gu, " ").trim().toLowerCase();
}

function declaredScormVersion(normalizedVersion: string): ScormVersion | null {
  return normalizedVersion === "1.2"
    ? "1.2"
    : /^2004(?: (?:2nd|3rd|4th) edition)?$/u.test(normalizedVersion)
      ? "2004"
      : null;
}

function detectScormVersion(manifest: StaticXmlElement): ScormVersion {
  const metadataElements = xmlChildren(manifest, "metadata");
  const schemaElements = metadataElements.flatMap((metadata) => xmlChildren(metadata, "schema"));
  const schemaVersionElements = metadataElements.flatMap(
    (metadata) => xmlChildren(metadata, "schemaversion")
  );
  if (schemaElements.length === 0 || schemaVersionElements.length === 0) {
    unsupportedScormVersion();
  }
  const schemas = schemaElements.map((element) => xmlText(element));
  if (schemas.some((schema) => schema === null)) unsupportedScormVersion();
  const normalizedSchemas = new Set(schemas.map((schema) => schema!.toUpperCase()));
  if (normalizedSchemas.size !== 1 || !normalizedSchemas.has("ADL SCORM")) {
    unsupportedScormVersion();
  }
  const declaredVersions = new Set<ScormVersion>();
  const normalizedVersionDeclarations = new Set<string>();
  for (const element of schemaVersionElements) {
    const value = xmlText(element);
    const normalizedValue = value === null ? null : normalizeDeclaredScormVersion(value);
    const version = normalizedValue === null ? null : declaredScormVersion(normalizedValue);
    if (version === null) unsupportedScormVersion();
    normalizedVersionDeclarations.add(normalizedValue!);
    declaredVersions.add(version);
  }
  if (normalizedVersionDeclarations.size !== 1 || declaredVersions.size !== 1) {
    unsupportedScormVersion();
  }

  const detected = new Set<ScormVersion>(declaredVersions);
  for (const version of xmlNamespaceVersions(manifest)) detected.add(version);
  const visit = (element: StaticXmlElement) => {
    for (const attribute of Object.values(element.attributeMetadata)) {
      if (attribute.local !== "scormType" && attribute.local !== "scormtype") continue;
      const version = SCORM_ADLCP_NAMESPACES[
        attribute.uri as keyof typeof SCORM_ADLCP_NAMESPACES
      ];
      if (version) detected.add(version);
    }
    for (const child of element.children) {
      if (isCoreScormElement(child)) visit(child);
    }
  };
  visit(manifest);
  if (detected.size !== 1) unsupportedScormVersion();
  return [...detected][0]!;
}

function assertScormNamespacePolicy(manifest: StaticXmlElement) {
  const visit = (element: StaticXmlElement) => {
    for (const attribute of Object.values(element.attributeMetadata)) {
      if (attribute.uri === XML_NAMESPACE_DECLARATION_URI) continue;
      if (scormCoreAttributeNames.has(attribute.local)) {
        if (attribute.prefix === "" && attribute.uri === "" && attribute.name === attribute.local) {
          continue;
        }
        throw new CourseImportError(
          "SCORM_MANIFEST_INVALID",
          "The SCORM manifest uses an unsupported attribute namespace.",
          422
        );
      }
      if (attribute.local !== "scormType" && attribute.local !== "scormtype") continue;
      if (
        (attribute.prefix === "" && attribute.uri === "") ||
        Object.prototype.hasOwnProperty.call(SCORM_ADLCP_NAMESPACES, attribute.uri)
      ) continue;
      throw new CourseImportError(
        "SCORM_MANIFEST_INVALID",
        "The SCORM manifest uses an unsupported attribute namespace.",
        422
      );
    }
    const expected = expectedCoreChildren.get(element.local) ?? new Set<string>();
    for (const child of element.children) {
      if (isCoreScormElement(child)) {
        visit(child);
        continue;
      }
      if (expected.has(child.local)) {
        throw new CourseImportError(
          "SCORM_MANIFEST_INVALID",
          "The SCORM manifest uses an unsupported structural namespace.",
          422
        );
      }
      // Vendor, LOM, sequencing, and other extension subtrees are preserved
      // as bounded semantic-loss digests later; their local names do not
      // impersonate core elements merely because they overlap.
    }
  };
  visit(manifest);
}

function assertScormManifestRoot(manifest: StaticXmlElement) {
  if (!isSupportedScormStructuralElement(manifest, "manifest")) {
    throw new CourseImportError(
      "SCORM_MANIFEST_INVALID",
      "The root XML element is not a SCORM manifest.",
      422
    );
  }
}

const packageRootUrl = new URL("https://scorm-package.invalid/");

function safeManifestReference(value: string | null, basePath: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (
    trimmed.length === 0 ||
    trimmed.includes("\u0000") ||
    trimmed.includes("\\") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed)
  ) return null;
  const withoutQuery = trimmed.split(/[?#]/, 1)[0]!;
  let decoded: string;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return null;
  }
  if (decoded.includes("/") && /%2f/i.test(withoutQuery)) return null;
  if (
    decoded.includes("\\") ||
    decoded.includes("\u0000") ||
    decoded.includes("?") ||
    decoded.includes("#") ||
    decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(decoded)
  ) return null;
  if (decoded.split("/").some((segment) => segment === "..")) return null;
  try {
    const baseUrl = new URL(basePath, packageRootUrl);
    const resolved = new URL(decoded, baseUrl);
    if (resolved.origin !== packageRootUrl.origin) return null;
    const resolvedPath = decodeURIComponent(resolved.pathname.slice(1)).normalize("NFC");
    if (resolvedPath === "") return "";
    const canonicalPath = canonicalizeArchivePath(resolvedPath).canonicalPath;
    return resolved.pathname.endsWith("/") ? `${canonicalPath}/` : canonicalPath;
  } catch {
    return null;
  }
}

function safeManifestPath(value: string | null, basePath = "") {
  const resolved = safeManifestReference(value, basePath);
  if (!resolved) return null;
  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
}

function resolveElementBase(parentBase: string, element: StaticXmlElement) {
  const rawBase = xmlBaseAttribute(element);
  if (rawBase === null) return parentBase;
  if (/[?#]/u.test(rawBase)) {
    throw new CourseImportError(
      "SCORM_XML_BASE_UNSAFE",
      "The SCORM manifest contains an unsafe xml:base path.",
      422
    );
  }
  const resolved = safeManifestReference(rawBase, parentBase);
  if (resolved === null) {
    throw new CourseImportError(
      "SCORM_XML_BASE_UNSAFE",
      "The SCORM manifest contains an unsafe xml:base path.",
      422
    );
  }
  return resolved;
}

function assertBoundedField(value: string | null | undefined, max: number, label: string) {
  if (value !== null && value !== undefined && value.length > max) {
    throw new CourseImportError(
      "SCORM_FIELD_TOO_LARGE",
      `The SCORM manifest ${label} exceeds the configured size limit.`,
      413
    );
  }
  return value;
}

function semanticElementProjection(element: StaticXmlElement): unknown {
  return {
    local: element.local,
    uri: element.uri,
    attributes: Object.values(element.attributeMetadata)
      .filter((attribute) => attribute.uri !== XML_NAMESPACE_DECLARATION_URI)
      .map((attribute) => ({ local: attribute.local, uri: attribute.uri, value: attribute.value }))
      .sort((left, right) => compareText(`${left.uri}\u0000${left.local}\u0000${left.value}`, `${right.uri}\u0000${right.local}\u0000${right.value}`)),
    text: element.text,
    children: element.children.map(semanticElementProjection)
  };
}

function attributeIsRepresented(element: StaticXmlElement, attribute: StaticXmlAttribute) {
  if (attribute.uri === XML_NAMESPACE_DECLARATION_URI) return true;
  if (
    attribute.uri === XML_NAMESPACE_URI &&
    attribute.local === "base" &&
    xmlBaseMappedElements.has(element.local)
  ) return true;
  if (
    element.local === "resource" &&
    (attribute.local === "scormType" || attribute.local === "scormtype") &&
    (
      (attribute.prefix === "" && attribute.uri === "") ||
      Object.prototype.hasOwnProperty.call(SCORM_ADLCP_NAMESPACES, attribute.uri)
    )
  ) return true;
  return attribute.prefix === "" &&
    attribute.uri === "" &&
    (representedUnqualifiedAttributes.get(element.local)?.has(attribute.local) ?? false);
}

function unsupportedSemanticEvidence(manifest: StaticXmlElement) {
  const roots: Array<{ path: readonly number[]; element: StaticXmlElement }> = [];
  const attributes: Array<{
    path: readonly number[];
    elementLocal: string;
    elementUri: string;
    attributeLocal: string;
    attributeUri: string;
    value: string;
  }> = [];
  const visit = (element: StaticXmlElement, path: readonly number[]) => {
    for (const attribute of Object.values(element.attributeMetadata)) {
      if (attributeIsRepresented(element, attribute)) continue;
      attributes.push({
        path,
        elementLocal: element.local,
        elementUri: element.uri,
        attributeLocal: attribute.local,
        attributeUri: attribute.uri,
        value: attribute.value
      });
    }
    element.children.forEach((child, index) => {
      const childPath = [...path, index];
      if (isCoreScormElement(child)) visit(child, childPath);
      else roots.push({ path: childPath, element: child });
    });
  };
  visit(manifest, []);
  if (roots.length === 0 && attributes.length === 0) return null;
  attributes.sort((left, right) => compareText(
    `${left.path.join(".")}\u0000${left.elementUri}\u0000${left.elementLocal}\u0000${left.attributeUri}\u0000${left.attributeLocal}\u0000${left.value}`,
    `${right.path.join(".")}\u0000${right.elementUri}\u0000${right.elementLocal}\u0000${right.attributeUri}\u0000${right.attributeLocal}\u0000${right.value}`
  ));
  const projection = {
    attributes,
    roots: roots.map(({ path, element }) => ({
      path,
      element: semanticElementProjection(element)
    }))
  };
  return {
    rootCount: roots.length,
    attributeCount: attributes.length,
    sha256: createHash("sha256")
      .update(JSON.stringify(projection), "utf8")
      .digest("hex")
  };
}

function warningSort(left: StaticImportWarning, right: StaticImportWarning) {
  return compareText(left.code, right.code) ||
    compareText(left.sourceId ?? "", right.sourceId ?? "") ||
    compareText(left.message, right.message);
}

function directTitle(element: StaticXmlElement, limits: ScormImportLimits) {
  return assertBoundedField(
    xmlText(xmlFirstChild(element, "title")),
    limits.maxTitleChars,
    "title"
  ) ?? null;
}

function resourceStableId(sourceId: string) {
  return `scorm:resource:${sourceId}`;
}

function itemStableId(sourceId: string) {
  return `scorm:item:${sourceId}`;
}

function buildBlockedExecutables(
  entries: readonly ZipEntryMetadata[],
  resources: readonly CanonicalResource[]
) {
  return entries
    .filter((entry) => !entry.isDirectory && blockedMediaTypes[extension(entry.canonicalPath)])
    .map((entry): BlockedExecutableMetadata => Object.freeze({
      path: entry.canonicalPath,
      mediaType: blockedMediaTypes[extension(entry.canonicalPath)]!,
      compressedSize: entry.compressedSize,
      uncompressedSize: entry.uncompressedSize,
      referencedByResourceIds: Object.freeze(resources
        .filter((resource) => {
          const entryKey = entry.pathKey;
          return (resource.href !== null && canonicalizeArchivePath(resource.href).pathKey === entryKey) ||
            resource.filePaths.some((filePath) => canonicalizeArchivePath(filePath).pathKey === entryKey);
        })
        .map((resource) => resource.id)
        .sort(compareText)),
      reason: "execution-disabled"
    }))
    .sort((left, right) => compareText(left.path, right.path));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function resolveImportedAt(value: string | undefined) {
  const importedAt = value ?? new Date().toISOString();
  const parsed = new Date(importedAt);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== importedAt) {
    throw new TypeError("importedAt must be a canonical ISO-8601 timestamp.");
  }
  return importedAt;
}

export async function importScormPackage(
  input: Buffer | Uint8Array,
  options: ImportScormPackageOptions = {}
): Promise<ScormStaticImportReport> {
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  const limits = resolveScormImportLimits(options.limits);
  const throwIfAborted = () => {
    if (options.signal?.aborted) {
      throw new CourseImportError(
        "SCORM_MANIFEST_INVALID",
        "The SCORM import was cancelled before completion.",
        422
      );
    }
  };
  throwIfAborted();
  const archive = preflightZip(bytes, limits);
  const manifestEntry = archive.entries.find((entry) => !entry.isDirectory && entry.pathKey === "imsmanifest.xml");
  if (!manifestEntry) {
    throw new CourseImportError(
      "MANIFEST_MISSING",
      "The ZIP does not contain a root imsmanifest.xml file.",
      422
    );
  }
  if (manifestEntry.uncompressedSize > limits.maxManifestBytes) {
    throw new CourseImportError("MANIFEST_TOO_LARGE", "The SCORM manifest exceeds the size limit.", 413);
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes, { createFolders: false });
  } catch {
    throw new CourseImportError("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
  }
  const zipManifest = zip.file(manifestEntry.rawName);
  if (!zipManifest) {
    throw new CourseImportError("ZIP_INVALID", "The uploaded package is not a valid ZIP archive.", 400);
  }
  const manifest = parseStaticXml(decodeManifest(
    await readEntryWithLimit(zipManifest, manifestEntry, limits.maxManifestBytes, options.signal)
  ));
  assertScormManifestRoot(manifest);
  assertScormNamespacePolicy(manifest);
  const scormVersion = detectScormVersion(manifest);
  const manifestSourceId = xmlAttribute(manifest, "identifier")?.trim();
  if (!manifestSourceId) {
    throw new CourseImportError(
      "SCORM_MANIFEST_INVALID",
      "The SCORM manifest does not provide a stable package identifier.",
      422
    );
  }
  assertBoundedField(manifestSourceId, limits.maxIdentifierChars, "identifier");
  const assetDigests: Array<{ path: string; sha256: string }> = [];
  for (const entryMetadata of archive.entries) {
    if (entryMetadata.isDirectory || entryMetadata === manifestEntry) continue;
    const zipEntry = zip.file(entryMetadata.rawName);
    if (!zipEntry) {
      throw new CourseImportError(
        "ZIP_INVALID",
        "The uploaded package is not a valid ZIP archive.",
        400
      );
    }
    throwIfAborted();
    const payload = await readEntryWithLimit(
      zipEntry,
      entryMetadata,
      limits.maxSingleFileBytes,
      options.signal
    );
    assetDigests.push({
      path: entryMetadata.canonicalPath,
      sha256: createHash("sha256").update(payload).digest("hex")
    });
  }

  const importedAt = resolveImportedAt(options.importedAt);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const courseId = `scorm:manifest:${manifestSourceId}`;
  const warnings: StaticImportWarning[] = [];
  const warningKeys = new Set<string>();
  let droppedWarnings = 0;
  const addWarning = (warning: StaticImportWarning) => {
    const key = `${warning.code}\u0000${warning.sourceId ?? ""}\u0000${warning.message}`;
    if (warningKeys.has(key)) return;
    warningKeys.add(key);
    const ordinaryLimit = Math.max(0, limits.maxWarnings - 1);
    if (warnings.length < ordinaryLimit) warnings.push(warning);
    else droppedWarnings += 1;
  };
  const semanticEvidence = unsupportedSemanticEvidence(manifest);
  if (semanticEvidence) {
    addWarning({
      code: "UNSUPPORTED_SEMANTIC_OMITTED",
      message: "Unsupported attributes, extension elements, or sequencing semantics were preserved only as a deterministic loss digest."
    });
  }
  const archivePaths = new Set(archive.entries.filter((entry) => !entry.isDirectory).map((entry) => entry.pathKey));
  const manifestBase = resolveElementBase("", manifest);

  const resourcesElement = xmlFirstChild(manifest, "resources");
  const resourcesBase = resourcesElement ? resolveElementBase(manifestBase, resourcesElement) : manifestBase;
  const resourceBuilders: ResourceBuilder[] = [];
  const resourceBySourceId = new Map<string, ResourceBuilder>();
  for (const resourceElement of resourcesElement ? xmlChildren(resourcesElement, "resource") : []) {
    const sourceId = xmlAttribute(resourceElement, "identifier")?.trim();
    assertBoundedField(sourceId, limits.maxIdentifierChars, "resource identifier");
    if (!sourceId || resourceBySourceId.has(sourceId)) {
      addWarning({
        code: "RESOURCE_SKIPPED",
        message: "A resource without a unique stable identifier was not mapped.",
        ...(sourceId ? { sourceId } : {})
      });
      continue;
    }
    const resourceBase = resolveElementBase(resourcesBase, resourceElement);
    const rawHref = xmlAttribute(resourceElement, "href");
    const href = safeManifestPath(rawHref, resourceBase);
    if (rawHref && !href) {
      addWarning({
        code: "RESOURCE_PATH_OMITTED",
        message: "An external or unsafe resource path was omitted from the static model.",
        sourceId
      });
    }
    const orderedFilePaths = new Set<string>();
    for (const fileElement of xmlChildren(resourceElement, "file")) {
      const rawFilePath = xmlAttribute(fileElement, "href");
      const fileBase = resolveElementBase(resourceBase, fileElement);
      const filePath = safeManifestPath(rawFilePath, fileBase);
      if (!filePath) {
        if (rawFilePath) addWarning({
          code: "RESOURCE_PATH_OMITTED",
          message: "An external or unsafe resource file path was omitted from the static model.",
          sourceId
        });
        continue;
      }
      orderedFilePaths.add(filePath);
    }
    const filePaths = [...orderedFilePaths];
    if (href && !orderedFilePaths.has(href)) filePaths.unshift(href);
    for (const filePath of filePaths) {
      const pathKey = canonicalizeArchivePath(filePath).pathKey;
      if (!archivePaths.has(pathKey)) addWarning({
        code: "RESOURCE_FILE_NOT_IN_PACKAGE",
        message: "A manifest resource path does not name a file in the ZIP.",
        sourceId
      });
    }
    const scormType = xmlScormTypeAttribute(resourceElement)?.trim().toLowerCase() || null;
    const builder: ResourceBuilder = {
      kind: "resource",
      id: resourceStableId(sourceId),
      sourceId,
      parentId: courseId,
      order: resourceBuilders.length,
      title: null,
      href,
      filePaths,
      ...(scormType === null ? {} : {
        extensions: {
          "org.adlnet.scorm": { resourceType: scormType }
        }
      }),
      dependencySourceIds: new Set(xmlChildren(resourceElement, "dependency")
        .map((dependency) => xmlAttribute(dependency, "identifierref")?.trim())
        .filter((value): value is string => {
          assertBoundedField(value, limits.maxIdentifierChars, "dependency identifier reference");
          return Boolean(value);
        })),
      referencedByIds: new Set<string>()
    };
    resourceBuilders.push(builder);
    resourceBySourceId.set(sourceId, builder);
  }

  const modules: CanonicalModule[] = [];
  const units: CanonicalUnit[] = [];
  const activities: CanonicalActivity[] = [];
  const seenItemSourceIds = new Set<string>();
  const organizationsElement = xmlFirstChild(manifest, "organizations");
  const defaultOrganizationSourceId = organizationsElement
    ? xmlAttribute(organizationsElement, "default")?.trim() || null
    : null;
  assertBoundedField(defaultOrganizationSourceId, limits.maxIdentifierChars, "default organization identifier");

  const mapItems = (
    parentElement: StaticXmlElement,
    parentId: string,
    depth: number
  ) => {
    let mappedSiblingOrder = 0;
    for (const itemElement of xmlChildren(parentElement, "item")) {
      const sourceId = xmlAttribute(itemElement, "identifier")?.trim();
      assertBoundedField(sourceId, limits.maxIdentifierChars, "item identifier");
      if (!sourceId || seenItemSourceIds.has(sourceId)) {
        addWarning({
          code: "ITEM_SKIPPED",
          message: "An item subtree without a unique stable identifier was not mapped.",
          ...(sourceId ? { sourceId } : {})
        });
        continue;
      }
      seenItemSourceIds.add(sourceId);
      const id = itemStableId(sourceId);
      const resourceIds: string[] = [];
      const resourceSourceId = xmlAttribute(itemElement, "identifierref")?.trim();
      assertBoundedField(resourceSourceId, limits.maxIdentifierChars, "resource identifier reference");
      if (resourceSourceId) {
        const resource = resourceBySourceId.get(resourceSourceId);
        if (resource) {
          resourceIds.push(resource.id);
          resource.referencedByIds.add(id);
        } else {
          addWarning({
            code: "RESOURCE_REFERENCE_UNRESOLVED",
            message: "An item resource reference could not be mapped safely.",
            sourceId
          });
        }
      }
      const base = {
        id,
        sourceId,
        parentId,
        order: mappedSiblingOrder,
        title: directTitle(itemElement, limits),
        resourceIds,
        assessmentIds: []
      };
      if (depth === 0) units.push({ kind: "unit", ...base });
      else activities.push({ kind: "activity", ...base });
      mappedSiblingOrder += 1;
      mapItems(itemElement, id, depth + 1);
    }
  };

  const seenOrganizationSourceIds = new Set<string>();
  for (const organizationElement of organizationsElement ? xmlChildren(organizationsElement, "organization") : []) {
    const sourceId = xmlAttribute(organizationElement, "identifier")?.trim();
    assertBoundedField(sourceId, limits.maxIdentifierChars, "organization identifier");
    if (!sourceId || seenOrganizationSourceIds.has(sourceId)) {
      addWarning({
        code: "ORGANIZATION_SKIPPED",
        message: "An organization without a unique stable identifier was not mapped.",
        ...(sourceId ? { sourceId } : {})
      });
      continue;
    }
    seenOrganizationSourceIds.add(sourceId);
    const module: CanonicalModule = {
      kind: "module",
      id: `scorm:organization:${sourceId}`,
      sourceId,
      parentId: courseId,
      order: modules.length,
      title: directTitle(organizationElement, limits)
    };
    modules.push(module);
    mapItems(organizationElement, module.id, 0);
  }
  if (modules.length === 0) {
    throw new CourseImportError(
      "SCORM_MANIFEST_INVALID",
      "The SCORM manifest does not contain a mappable organization.",
      422
    );
  }
  if (defaultOrganizationSourceId && !seenOrganizationSourceIds.has(defaultOrganizationSourceId)) {
    addWarning({
      code: "DEFAULT_ORGANIZATION_UNRESOLVED",
      message: "The default organization identifier could not be resolved.",
      sourceId: defaultOrganizationSourceId
    });
  }

  const resources: CanonicalResource[] = resourceBuilders.map((builder) => {
    const dependencyResourceIds = new Set<string>();
    for (const dependencySourceId of builder.dependencySourceIds) {
      const dependency = resourceBySourceId.get(dependencySourceId);
      if (dependency) {
        dependencyResourceIds.add(dependency.id);
      } else {
        addWarning({
          code: "RESOURCE_DEPENDENCY_UNRESOLVED",
          message: "A resource dependency could not be mapped safely.",
          sourceId: builder.sourceId
        });
      }
    }
    return {
      kind: builder.kind,
      id: builder.id,
      sourceId: builder.sourceId,
      parentId: builder.parentId,
      order: builder.order,
      title: builder.title,
      href: builder.href,
      filePaths: builder.filePaths,
      dependencyResourceIds: [...dependencyResourceIds],
      referencedByIds: [...builder.referencedByIds],
      ...(builder.extensions === undefined ? {} : { extensions: builder.extensions })
    };
  });

  const defaultModule = defaultOrganizationSourceId
    ? modules.find((module) => module.sourceId === defaultOrganizationSourceId)
    : null;
  const assetSetSha256 = createHash("sha256")
    .update(JSON.stringify(assetDigests.sort((left, right) => compareText(left.path, right.path))), "utf8")
    .digest("hex");
  const courseVersion = createCanonicalCourseVersion({
    sourceProvenance: {
      packageSha256: sha256,
      schemaVersion: COURSE_INTEGRATION_SCHEMA_VERSION,
      source: {
        format: "scorm",
        version: scormVersion
      },
      adapter: {
        id: "org.mais.scorm-static",
        version: "1.0.0"
      },
      extensions: {
        "org.adlnet.scorm": {
          manifestIdentifier: manifestSourceId,
          version: scormVersion
        }
      }
    },
    predecessorVersionId: options.predecessorVersionId ?? null,
    course: {
      kind: "course",
      id: courseId,
      sourceId: manifestSourceId,
      parentId: null,
      order: 0,
      title: defaultModule?.title ?? modules[0]?.title ?? null,
      extensions: {
        "org.mais.static-import": {
          assetSetSha256,
          ...(semanticEvidence === null ? {} : { unsupportedSemantics: semanticEvidence })
        }
      }
    },
    modules,
    units,
    activities,
    resources,
    assessments: []
  });

  if (droppedWarnings > 0 && limits.maxWarnings > 0) {
    warnings.push({
      code: "WARNING_LIMIT_REACHED",
      message: `${droppedWarnings} additional unique warnings were omitted by the configured warning limit.`
    });
  }
  warnings.sort(warningSort);
  const report = {
    reportVersion: "mais.scorm-static-import-report.v1" as const,
    source: { format: "SCORM" as const, version: scormVersion },
    sourcePackage: { sha256 },
    importEvent: { importedAt },
    courseVersion,
    archive: {
      entryCount: archive.entryCount,
      fileCount: archive.fileCount,
      totalUncompressedBytes: archive.totalUncompressedBytes
    },
    warnings,
    blockedExecutables: buildBlockedExecutables(archive.entries, resources),
    externalIntegrationReadiness: EXTERNAL_COURSE_INTEGRATION_READINESS
  };
  if (Buffer.byteLength(JSON.stringify(report), "utf8") > limits.maxReportBytes) {
    throw new CourseImportError(
      "REPORT_TOO_LARGE",
      "The static SCORM import report exceeds the configured size limit.",
      413
    );
  }
  return deepFreeze(report);
}
