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
  parseStaticXml,
  xmlAttribute,
  xmlChildren,
  xmlFirstChild,
  xmlLocalName,
  xmlText,
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
    | "RESOURCE_FILE_NOT_IN_PACKAGE";
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
}

type ResourceBuilder = Omit<CanonicalResource, "referencedByIds" | "dependencyResourceIds"> & {
  referencedByIds: Set<string>;
  dependencySourceIds: string[];
};

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
  maxBytes: number
) {
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
      const chunk = new Uint8Array(rawChunk);
      total += chunk.byteLength;
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

function detectScormVersion(manifest: StaticXmlElement): ScormVersion {
  const detected = new Set<ScormVersion>();
  const metadata = xmlFirstChild(manifest, "metadata");
  const schemaVersion = xmlText(metadata ? xmlFirstChild(metadata, "schemaversion") : null)?.toLowerCase();
  if (schemaVersion?.startsWith("1.2")) detected.add("1.2");
  if (schemaVersion?.includes("2004")) detected.add("2004");
  for (const value of Object.values(manifest.attributes)) {
    const normalized = value.toLowerCase();
    if (normalized.includes("adlcp_rootv1p2")) detected.add("1.2");
    if (normalized.includes("adlcp_v1p3")) detected.add("2004");
  }
  if (detected.size !== 1) {
    throw new CourseImportError(
      "SCORM_VERSION_UNSUPPORTED",
      "The SCORM version could not be identified safely as 1.2 or 2004.",
      422
    );
  }
  return [...detected][0]!;
}

function safeManifestPath(value: string | null) {
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
  try {
    return canonicalizeArchivePath(decoded).canonicalPath;
  } catch {
    return null;
  }
}

function warningSort(left: StaticImportWarning, right: StaticImportWarning) {
  return compareText(left.code, right.code) ||
    compareText(left.sourceId ?? "", right.sourceId ?? "") ||
    compareText(left.message, right.message);
}

function directTitle(element: StaticXmlElement) {
  return xmlText(xmlFirstChild(element, "title"));
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
        .filter((resource) => resource.href === entry.canonicalPath || resource.filePaths.includes(entry.canonicalPath))
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
  const manifestBytes = await readEntryWithLimit(zipManifest, manifestEntry, limits.maxManifestBytes);
  const manifest = parseStaticXml(decodeManifest(manifestBytes));
  if (xmlLocalName(manifest.name) !== "manifest") {
    throw new CourseImportError(
      "SCORM_MANIFEST_INVALID",
      "The root XML element is not a SCORM manifest.",
      422
    );
  }
  const scormVersion = detectScormVersion(manifest);
  const manifestSourceId = xmlAttribute(manifest, "identifier")?.trim();
  if (!manifestSourceId) {
    throw new CourseImportError(
      "SCORM_MANIFEST_INVALID",
      "The SCORM manifest does not provide a stable package identifier.",
      422
    );
  }

  const importedAt = resolveImportedAt(options.importedAt);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const courseId = `scorm:manifest:${manifestSourceId}`;
  const warnings: StaticImportWarning[] = [];
  const archivePaths = new Set(archive.entries.filter((entry) => !entry.isDirectory).map((entry) => entry.pathKey));

  const resourcesElement = xmlFirstChild(manifest, "resources");
  const resourceBuilders: ResourceBuilder[] = [];
  const resourceBySourceId = new Map<string, ResourceBuilder>();
  for (const resourceElement of resourcesElement ? xmlChildren(resourcesElement, "resource") : []) {
    const sourceId = xmlAttribute(resourceElement, "identifier")?.trim();
    if (!sourceId || resourceBySourceId.has(sourceId)) {
      warnings.push({
        code: "RESOURCE_SKIPPED",
        message: "A resource without a unique stable identifier was not mapped.",
        ...(sourceId ? { sourceId } : {})
      });
      continue;
    }
    const rawHref = xmlAttribute(resourceElement, "href");
    const href = safeManifestPath(rawHref);
    if (rawHref && !href) {
      warnings.push({
        code: "RESOURCE_PATH_OMITTED",
        message: "An external or unsafe resource path was omitted from the static model.",
        sourceId
      });
    }
    const filePaths: string[] = [];
    for (const fileElement of xmlChildren(resourceElement, "file")) {
      const rawFilePath = xmlAttribute(fileElement, "href");
      const filePath = safeManifestPath(rawFilePath);
      if (!filePath) {
        if (rawFilePath) warnings.push({
          code: "RESOURCE_PATH_OMITTED",
          message: "An external or unsafe resource file path was omitted from the static model.",
          sourceId
        });
        continue;
      }
      if (!filePaths.includes(filePath)) filePaths.push(filePath);
    }
    if (href && !filePaths.includes(href)) filePaths.unshift(href);
    for (const filePath of filePaths) {
      const pathKey = canonicalizeArchivePath(filePath).pathKey;
      if (!archivePaths.has(pathKey)) warnings.push({
        code: "RESOURCE_FILE_NOT_IN_PACKAGE",
        message: "A manifest resource path does not name a file in the ZIP.",
        sourceId
      });
    }
    const scormType = xmlAttribute(resourceElement, "scormtype")?.trim().toLowerCase() || null;
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
      dependencySourceIds: xmlChildren(resourceElement, "dependency")
        .map((dependency) => xmlAttribute(dependency, "identifierref")?.trim())
        .filter((value): value is string => Boolean(value)),
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

  const mapItems = (
    parentElement: StaticXmlElement,
    parentId: string,
    depth: number
  ) => {
    let mappedSiblingOrder = 0;
    for (const itemElement of xmlChildren(parentElement, "item")) {
      const sourceId = xmlAttribute(itemElement, "identifier")?.trim();
      if (!sourceId || seenItemSourceIds.has(sourceId)) {
        warnings.push({
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
      if (resourceSourceId) {
        const resource = resourceBySourceId.get(resourceSourceId);
        if (resource) {
          resourceIds.push(resource.id);
          resource.referencedByIds.add(id);
        } else {
          warnings.push({
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
        title: directTitle(itemElement),
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
    if (!sourceId || seenOrganizationSourceIds.has(sourceId)) {
      warnings.push({
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
      title: directTitle(organizationElement)
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
    warnings.push({
      code: "DEFAULT_ORGANIZATION_UNRESOLVED",
      message: "The default organization identifier could not be resolved.",
      sourceId: defaultOrganizationSourceId
    });
  }

  const resources: CanonicalResource[] = resourceBuilders.map((builder) => {
    const dependencyResourceIds: string[] = [];
    for (const dependencySourceId of builder.dependencySourceIds) {
      const dependency = resourceBySourceId.get(dependencySourceId);
      if (dependency) {
        if (!dependencyResourceIds.includes(dependency.id)) dependencyResourceIds.push(dependency.id);
      } else {
        warnings.push({
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
      dependencyResourceIds,
      referencedByIds: [...builder.referencedByIds],
      ...(builder.extensions === undefined ? {} : { extensions: builder.extensions })
    };
  });

  const defaultModule = defaultOrganizationSourceId
    ? modules.find((module) => module.sourceId === defaultOrganizationSourceId)
    : null;
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
      title: defaultModule?.title ?? modules[0]?.title ?? null
    },
    modules,
    units,
    activities,
    resources,
    assessments: []
  });

  warnings.sort(warningSort);
  return deepFreeze({
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
  });
}
