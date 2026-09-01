import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { diffCanonicalCourseVersions } from "./diff";
import { importScormPackage } from "./importer";
import { calculateCrc32 } from "./zip";

const fixedZipDate = new Date("2020-01-01T00:00:00.000Z");
const unsupportedSemanticWarning = {
  code: "UNSUPPORTED_SEMANTIC_OMITTED",
  message: "Unsupported attributes, extension elements, or sequencing semantics were preserved only as a deterministic loss digest."
} as const;

async function createScormPackage(
  manifest: string,
  files: Record<string, string | Uint8Array> = {},
  options: {
    readonly streamFiles?: boolean;
    readonly compression?: "DEFLATE" | "STORE";
  } = {}
) {
  const zip = new JSZip();
  zip.file("imsmanifest.xml", manifest, { date: fixedZipDate, createFolders: false });
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content, { date: fixedZipDate, createFolders: false });
  }
  const compression = options.compression ?? "DEFLATE";
  return zip.generateAsync({
    type: "uint8array",
    compression,
    ...(compression === "DEFLATE" ? { compressionOptions: { level: 6 } } : {}),
    platform: "UNIX",
    streamFiles: options.streamFiles ?? false
  });
}

function findCentralEntryOffset(bytes: Uint8Array, expectedName: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset <= bytes.byteLength - 46; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    if (name === expectedName) return offset;
  }
  throw new Error(`Missing central ZIP entry in test fixture: ${expectedName}`);
}

function findEndOfCentralDirectoryOffset(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = bytes.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("Missing end-of-central-directory record in test fixture.");
}

function markEntryAsHostSpecialFile(
  bytes: Uint8Array,
  expectedName: string,
  host: number,
  fileType: number
) {
  const centralOffset = findCentralEntryOffset(bytes, expectedName);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint16(centralOffset + 4, ((host & 0xff) << 8) | 20, true);
  const attributes = view.getUint32(centralOffset + 38, true);
  view.setUint32(centralOffset + 38, ((attributes & 0x0fffffff) | fileType) >>> 0, true);
}

function insertBytes(bytes: Uint8Array, offset: number, insertion: Uint8Array) {
  assert.ok(offset >= 0 && offset <= bytes.byteLength, "test insertion offset must be in range");
  const result = new Uint8Array(bytes.byteLength + insertion.byteLength);
  result.set(bytes.subarray(0, offset), 0);
  result.set(insertion, offset);
  result.set(bytes.subarray(offset), offset + insertion.byteLength);
  return result;
}

function concatTestBytes(...parts: readonly Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function infoZipUnicodePathExtra(rawName: string, unicodeName: string) {
  const encoder = new TextEncoder();
  const rawNameBytes = encoder.encode(rawName);
  const unicodeNameBytes = encoder.encode(unicodeName);
  const payloadLength = 1 + 4 + unicodeNameBytes.byteLength;
  const extra = new Uint8Array(4 + payloadLength);
  const view = new DataView(extra.buffer);
  view.setUint16(0, 0x7075, true);
  view.setUint16(2, payloadLength, true);
  extra[4] = 1;
  view.setUint32(5, calculateCrc32(rawNameBytes), true);
  extra.set(unicodeNameBytes, 9);
  return extra;
}

function zipExtraField(fieldId: number, payload: Uint8Array) {
  const extra = new Uint8Array(4 + payload.byteLength);
  const view = new DataView(extra.buffer);
  view.setUint16(0, fieldId, true);
  view.setUint16(2, payload.byteLength, true);
  extra.set(payload, 4);
  return extra;
}

function addSingleEntryExtraFields(
  bytes: Uint8Array,
  expectedName: string,
  {
    localExtra = new Uint8Array(),
    centralExtra = new Uint8Array()
  }: {
    readonly localExtra?: Uint8Array;
    readonly centralExtra?: Uint8Array;
  }
) {
  const originalCentralOffset = findCentralEntryOffset(bytes, expectedName);
  const originalEocdOffset = findEndOfCentralDirectoryOffset(bytes);
  const originalView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(originalView.getUint16(originalEocdOffset + 10, true), 1);
  assert.equal(originalView.getUint32(originalEocdOffset + 16, true), originalCentralOffset);
  const originalCentralSize = originalView.getUint32(originalEocdOffset + 12, true);
  const localHeaderOffset = originalView.getUint32(originalCentralOffset + 42, true);
  const localNameLength = originalView.getUint16(localHeaderOffset + 26, true);
  const localExtraLength = originalView.getUint16(localHeaderOffset + 28, true);
  const localInsertOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;

  let result = insertBytes(bytes, localInsertOffset, localExtra);
  let view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint16(localHeaderOffset + 28, localExtraLength + localExtra.byteLength, true);

  const centralOffset = originalCentralOffset + localExtra.byteLength;
  const centralNameLength = view.getUint16(centralOffset + 28, true);
  const centralExtraLength = view.getUint16(centralOffset + 30, true);
  const centralInsertOffset = centralOffset + 46 + centralNameLength + centralExtraLength;
  result = insertBytes(result, centralInsertOffset, centralExtra);
  view = new DataView(result.buffer, result.byteOffset, result.byteLength);
  view.setUint16(centralOffset + 30, centralExtraLength + centralExtra.byteLength, true);

  const finalEocdOffset = originalEocdOffset + localExtra.byteLength + centralExtra.byteLength;
  view.setUint32(finalEocdOffset + 12, originalCentralSize + centralExtra.byteLength, true);
  view.setUint32(finalEocdOffset + 16, centralOffset, true);
  return result;
}

function scormManifest({
  schemaVersion = "1.2",
  adlcpNamespace = "http://www.adlnet.org/xsd/adlcp_rootv1p2",
  resourceHref = "content.txt"
}: {
  schemaVersion?: string;
  adlcpNamespace?: string;
  resourceHref?: string;
} = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="course-minimal" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="${adlcpNamespace}">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>${schemaVersion}</schemaversion>
  </metadata>
  <organizations default="org-1">
    <organization identifier="org-1">
      <title>Minimal course</title>
      <item identifier="item-1" identifierref="resource-1">
        <title>Lesson one</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource-1" type="webcontent" adlcp:scormtype="asset" href="${resourceHref}">
      <file href="${resourceHref}" />
    </resource>
  </resources>
</manifest>`;
}

const contentPackageNamespaces = [
  "http://www.imsproject.org/xsd/imscp_rootv1p1p2",
  "http://www.imsglobal.org/xsd/imscp_v1p1"
] as const;

const scormStructuralNames = [
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
] as const;

function withPrefixedContentPackageNamespace(manifest: string, uri: string) {
  const structuralPattern = new RegExp(
    `<(/?)(${scormStructuralNames.join("|")})(?=[\\s/>])`,
    "g"
  );
  return manifest
    .replace(
      'xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"',
      `xmlns:cp="${uri}"`
    )
    .replace(structuralPattern, "<$1cp:$2");
}

function withFakeStructuralNamespace(manifest: string, elementName: string) {
  return manifest
    .replace("<manifest identifier=", '<manifest xmlns:fake="urn:not-scorm" identifier=')
    .replace(new RegExp(`<${elementName}(?=[\\s>])`), `<fake:${elementName}`)
    .replace(new RegExp(`</${elementName}>`), `</fake:${elementName}>`);
}

async function assertStableImportError(
  manifest: string,
  expected: { readonly code: string; readonly message: string }
) {
  const bytes = await createScormPackage(manifest, {
    "content.txt": "Static lesson"
  });
  await assert.rejects(importScormPackage(bytes), (error: unknown) => {
    assert.deepEqual(
      error && typeof error === "object"
        ? {
            code: Reflect.get(error, "code"),
            status: Reflect.get(error, "status"),
            message: Reflect.get(error, "message")
          }
        : null,
      { ...expected, status: 422 }
    );
    assert.doesNotMatch(String(Reflect.get(Object(error), "message")), /urn:not-scorm|fake:/);
    return true;
  });
}

test("imports a minimal SCORM 1.2 package into the canonical course model", async () => {
  const importedAt = "2026-08-27T06:00:00.000Z";
  const bytes = await createScormPackage(scormManifest(), { "content.txt": "Static lesson" });

  const report = await importScormPackage(bytes, { importedAt });

  assert.equal(report.source.format, "SCORM");
  assert.equal(report.source.version, "1.2");
  assert.match(report.sourcePackage.sha256, /^[a-f0-9]{64}$/);
  assert.equal(report.importEvent.importedAt, importedAt);
  assert.equal(report.courseVersion.sourceProvenance.source.format, "scorm");
  assert.equal(report.courseVersion.sourceProvenance.source.version, "1.2");
  assert.equal(report.courseVersion.sourceProvenance.adapter.id, "org.mais.scorm-static");
  assert.deepEqual(report.courseVersion.sourceProvenance.extensions, {
    "org.adlnet.scorm": {
      manifestIdentifier: "course-minimal",
      version: "1.2"
    }
  });
  assert.equal(report.courseVersion.course.id, "scorm:manifest:course-minimal");
  assert.equal(report.courseVersion.course.title, "Minimal course");
  assert.deepEqual(report.courseVersion.modules.map(({ id, parentId, order }) => ({ id, parentId, order })), [{
    id: "scorm:organization:org-1",
    parentId: "scorm:manifest:course-minimal",
    order: 0
  }]);
  assert.deepEqual(report.courseVersion.units.map(({ id, parentId, resourceIds }) => ({ id, parentId, resourceIds })), [{
    id: "scorm:item:item-1",
    parentId: "scorm:organization:org-1",
    resourceIds: ["scorm:resource:resource-1"]
  }]);
  assert.deepEqual(report.courseVersion.resources[0]?.referencedByIds, ["scorm:item:item-1"]);
  assert.deepEqual(report.courseVersion.resources[0]?.extensions, {
    "org.adlnet.scorm": { resourceType: "asset" }
  });
  assert.deepEqual(report.courseVersion.assessments, []);
  assert.equal(report.archive.fileCount, 2);
  assert.deepEqual(report.warnings, [unsupportedSemanticWarning]);
  assert.ok(Object.isFrozen(report.courseVersion));
});

test("identifies SCORM 2004 packages without treating them as SCORM 1.2", async () => {
  const bytes = await createScormPackage(scormManifest({
    schemaVersion: "2004 4th Edition",
    adlcpNamespace: "http://www.adlnet.org/xsd/adlcp_v1p3"
  }), { "content.txt": "Static lesson" });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:10:00.000Z" });

  assert.equal(report.source.version, "2004");
  assert.equal(report.courseVersion.sourceProvenance.source.format, "scorm");
  assert.equal(report.courseVersion.sourceProvenance.source.version, "2004");
});

test("accepts both supported IMS content-package namespaces in default and prefixed form", async () => {
  for (const uri of contentPackageNamespaces) {
    const defaultManifest = scormManifest().replace(
      "http://www.imsproject.org/xsd/imscp_rootv1p1p2",
      uri
    );
    const prefixedManifest = withPrefixedContentPackageNamespace(scormManifest(), uri);

    for (const manifest of [defaultManifest, prefixedManifest]) {
      const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });
      const report = await importScormPackage(bytes, {
        importedAt: "2026-08-29T01:00:00.000Z"
      });
      assert.equal(report.courseVersion.course.id, "scorm:manifest:course-minimal");
      assert.equal(report.courseVersion.resources[0]?.href, "content.txt");
    }
  }
});

test("accepts a legacy unnamespaced manifest and no-namespace SCORM type attributes", async () => {
  const manifest = scormManifest()
    .replace(/\n  xmlns="[^"]+"/u, "")
    .replace(/\n  xmlns:adlcp="[^"]+"/u, "")
    .replace("adlcp:scormtype", "scormtype");
  const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-29T01:05:00.000Z" });

  assert.equal(report.source.version, "1.2");
  assert.deepEqual(report.courseVersion.resources[0]?.extensions, {
    "org.adlnet.scorm": { resourceType: "asset" }
  });
});

test("accepts namespace declaration prefixes that resemble reserved SCORM attributes", async () => {
  const manifest = scormManifest().replace(
    "<manifest identifier=",
    '<manifest xmlns:type="urn:innocent-type" xmlns:identifier="urn:innocent-identifier" ' +
      'xmlns:scormtype="urn:innocent-scormtype" identifier='
  );
  const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-29T01:07:00.000Z" });

  assert.equal(report.courseVersion.course.id, "scorm:manifest:course-minimal");
  assert.deepEqual(report.warnings, [unsupportedSemanticWarning]);
});

test("accepts inert ENTITY spelling inside legal manifest comments and CDATA", async () => {
  const manifest = scormManifest()
    .replace("  <metadata>", "  <!-- inert <!ENTITY comment text -->\n  <metadata>")
    .replace("Minimal course", "<![CDATA[Minimal <!ENTITY cdata text course]]>");
  const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-29T01:08:00.000Z" });

  assert.equal(report.courseVersion.course.title, "Minimal <!ENTITY cdata text course");
});

test("accepts only the supported ADLCP 1.2 and 2004 attribute namespaces and spellings", async () => {
  const fixtures = [
    {
      manifest: scormManifest(),
      version: "1.2"
    },
    {
      manifest: scormManifest({
        schemaVersion: "2004 4th Edition",
        adlcpNamespace: "http://www.adlnet.org/xsd/adlcp_v1p3"
      }).replace("adlcp:scormtype", "adlcp:scormType"),
      version: "2004"
    },
    {
      manifest: scormManifest()
        .replace(/\n  xmlns:adlcp="[^"]+"/u, "")
        .replace("adlcp:scormtype", "scormtype"),
      version: "1.2"
    },
    {
      manifest: scormManifest({
        schemaVersion: "2004 4th Edition",
        adlcpNamespace: "http://www.adlnet.org/xsd/adlcp_v1p3"
      })
        .replace(/\n  xmlns:adlcp="[^"]+"/u, "")
        .replace("adlcp:scormtype", "scormType"),
      version: "2004"
    }
  ] as const;

  for (const fixture of fixtures) {
    const bytes = await createScormPackage(fixture.manifest, { "content.txt": "Static lesson" });
    const report = await importScormPackage(bytes, {
      importedAt: "2026-08-29T01:10:00.000Z"
    });
    assert.equal(report.source.version, fixture.version);
    assert.deepEqual(report.courseVersion.resources[0]?.extensions, {
      "org.adlnet.scorm": { resourceType: "asset" }
    });
  }
});

test("rejects a bound arbitrary namespace impersonating the SCORM structure", async () => {
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<fake:manifest xmlns:fake="urn:not-an-ims-content-package"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  identifier="course-impersonation" version="1.0">
  <fake:metadata>
    <fake:schema>ADL SCORM</fake:schema>
    <fake:schemaversion>1.2</fake:schemaversion>
  </fake:metadata>
  <fake:organizations default="org-1">
    <fake:organization identifier="org-1">
      <fake:title>Impersonated course</fake:title>
      <fake:item identifier="item-1" identifierref="resource-1"/>
    </fake:organization>
  </fake:organizations>
  <fake:resources>
    <fake:resource identifier="resource-1" type="webcontent" href="content.txt">
      <fake:file href="content.txt"/>
    </fake:resource>
  </fake:resources>
</fake:manifest>`;
  const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });

  await assert.rejects(importScormPackage(bytes), (error: unknown) => {
    assert.deepEqual(
      error && typeof error === "object"
        ? {
            code: Reflect.get(error, "code"),
            status: Reflect.get(error, "status"),
            message: Reflect.get(error, "message")
          }
        : null,
      {
        code: "SCORM_MANIFEST_INVALID",
        status: 422,
        message: "The root XML element is not a SCORM manifest."
      }
    );
    return true;
  });
});

for (const elementName of [
  "metadata",
  "organizations",
  "organization",
  "resources",
  "resource"
] as const) {
  test(`rejects an arbitrary bound namespace impersonating ${elementName}`, async () => {
    await assertStableImportError(withFakeStructuralNamespace(scormManifest(), elementName), {
      code: "SCORM_MANIFEST_INVALID",
      message: "The SCORM manifest uses an unsupported structural namespace."
    });
  });
}

test("rejects namespace-wrapped core and SCORM type attributes", async () => {
  const namespacedCoreAttribute = scormManifest()
    .replace("<manifest identifier=", '<manifest xmlns:fake="urn:not-scorm" fake:identifier=');
  const namespacedScormType = scormManifest()
    .replace("<manifest identifier=", '<manifest xmlns:fake="urn:not-scorm" identifier=')
    .replace("adlcp:scormtype", "fake:scormtype");

  for (const manifest of [namespacedCoreAttribute, namespacedScormType]) {
    await assertStableImportError(manifest, {
      code: "SCORM_MANIFEST_INVALID",
      message: "The SCORM manifest uses an unsupported attribute namespace."
    });
  }
});

test("rejects malformed parser surfaces from a full ZIP with one stable redacted error", async () => {
  const base = scormManifest();
  const manifests = [
    base.replace("Minimal course", "Minimal &#X41; course"),
    base.replace("  <metadata>", "  <!--ends-with-hyphen--->\n  <metadata>"),
    base.replace("<metadata>", "<unbound:metadata>"),
    base.replace("identifier=\"course-minimal\"", 'unbound:identifier="course-minimal"'),
    base.replace("<metadata>", "<:metadata>"),
    base.replace("<metadata>", '<bound::metadata xmlns:bound="urn:test">'),
    base.replace("<metadata>", '<bound: xmlns:bound="urn:test">'),
    base.replace(
      "<manifest identifier=",
      '<manifest xmlns:a="urn:duplicate" xmlns:b="urn:duplicate" a:id="one" b:id="two" identifier='
    ),
    base.replace('version="1.0" encoding="UTF-8"', 'version="1.1" encoding="UTF-8"'),
    base.replace('encoding="UTF-8"', 'encoding="ISO-8859-1"')
  ];

  for (const manifest of manifests) {
    await assertStableImportError(manifest, {
      code: "MANIFEST_XML_INVALID",
      message: "The SCORM manifest is not valid safe XML."
    });
  }
});

test("keeps ordered file and dependency dedupe deterministic near the 20,000-element ceiling", async () => {
  const repeatedChildCount = 9_994;
  const files = Array.from(
    { length: repeatedChildCount },
    (_, index) => `<file href="${index % 2 === 0 ? "second.txt" : "first.txt"}"/>`
  ).join("");
  const dependencies = Array.from(
    { length: repeatedChildCount },
    (_, index) => `<dependency identifierref="${index % 2 === 0 ? "target-b" : "target-a"}"/>`
  ).join("");
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="course-dedupe">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations><organization identifier="org-1"><title>Dedupe</title></organization></organizations>
  <resources>
    <resource identifier="main" type="webcontent">${files}${dependencies}</resource>
    <resource identifier="target-a" type="webcontent"/>
    <resource identifier="target-b" type="webcontent"/>
  </resources>
</manifest>`;
  const bytes = await createScormPackage(manifest, {
    "first.txt": "first",
    "second.txt": "second"
  });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-29T01:15:00.000Z" });

  assert.deepEqual(report.courseVersion.resources[0]?.filePaths, ["second.txt", "first.txt"]);
  assert.deepEqual(report.courseVersion.resources[0]?.dependencyResourceIds, [
    "scorm:resource:target-b",
    "scorm:resource:target-a"
  ]);
  assert.deepEqual(report.warnings, [unsupportedSemanticWarning]);
});

test("repeat imports keep canonical version identity independent of import-event time and bind predecessors", async () => {
  const bytes = await createScormPackage(scormManifest(), { "content.txt": "Static lesson" });

  const first = await importScormPackage(bytes, { importedAt: "2026-08-27T06:00:00.000Z" });
  const later = await importScormPackage(bytes, { importedAt: "2026-08-28T06:00:00.000Z" });
  const successor = await importScormPackage(bytes, {
    importedAt: "2026-08-29T06:00:00.000Z",
    predecessorVersionId: first.courseVersion.versionMetadata.versionId
  });

  assert.deepEqual(later.courseVersion, first.courseVersion);
  assert.notEqual(later.importEvent.importedAt, first.importEvent.importedAt);
  assert.equal(successor.courseVersion.versionMetadata.contentSha256,
    first.courseVersion.versionMetadata.contentSha256);
  assert.notEqual(successor.courseVersion.versionMetadata.versionId,
    first.courseVersion.versionMetadata.versionId);
  assert.equal(successor.courseVersion.versionMetadata.predecessorVersionId,
    first.courseVersion.versionMetadata.versionId);
  assert.equal("importedAt" in successor.courseVersion.sourceProvenance, false);
  assert.equal("createdAt" in successor.courseVersion.versionMetadata, false);
});

test("rejects ZIP packages that do not contain a root imsmanifest.xml", async () => {
  const zip = new JSZip();
  zip.file("content.txt", "No manifest", { date: fixedZipDate, createFolders: false });
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  await assert.rejects(
    importScormPackage(bytes),
    (error: unknown) => {
      assert.deepEqual(
        error && typeof error === "object"
          ? { code: Reflect.get(error, "code"), status: Reflect.get(error, "status"), message: Reflect.get(error, "message") }
          : null,
        {
          code: "MANIFEST_MISSING",
          status: 422,
          message: "The ZIP does not contain a root imsmanifest.xml file."
        }
      );
      return true;
    }
  );
});

test("rejects compressed and expanded package sizes before parsing the manifest", async () => {
  const bytes = await createScormPackage(scormManifest(), {
    "content.txt": "A".repeat(10_000)
  });

  await assert.rejects(
    importScormPackage(bytes, {
      limits: { maxPackageBytes: bytes.byteLength - 1 }
    }),
    (error: unknown) => Reflect.get(Object(error), "code") === "PACKAGE_TOO_LARGE" &&
      Reflect.get(Object(error), "status") === 413
  );

  await assert.rejects(
    importScormPackage(bytes, {
      limits: { maxTotalUncompressedBytes: 5_000 }
    }),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_TOTAL_SIZE_EXCEEDED" &&
      Reflect.get(Object(error), "status") === 413
  );
});

test("rejects path traversal and duplicate canonical ZIP paths without echoing entry names", async () => {
  const traversalBytes = await createScormPackage(scormManifest(), {
    "content.txt": "Static lesson",
    "../outside.txt": "must remain unreachable"
  });
  const duplicateBytes = await createScormPackage(scormManifest(), {
    "content.txt": "Static lesson",
    "assets/lesson.js": "first",
    "assets/./lesson.js": "second"
  });

  for (const [bytes, code] of [
    [traversalBytes, "ZIP_PATH_UNSAFE"],
    [duplicateBytes, "ZIP_DUPLICATE_PATH"]
  ] as const) {
    await assert.rejects(importScormPackage(bytes), (error: unknown) => {
      assert.equal(Reflect.get(Object(error), "code"), code);
      assert.equal(Reflect.get(Object(error), "status"), 422);
      assert.doesNotMatch(String(Reflect.get(Object(error), "message")), /outside|lesson\.js/);
      return true;
    });
  }
});

test("rejects absolute ZIP entry paths", async () => {
  const bytes = await createScormPackage(scormManifest(), {
    "content.txt": "Static lesson",
    "/absolute.txt": "must never become package-relative"
  });

  await assert.rejects(importScormPackage(bytes), (error: unknown) => {
    assert.equal(Reflect.get(Object(error), "code"), "ZIP_PATH_UNSAFE");
    assert.equal(Reflect.get(Object(error), "status"), 422);
    assert.doesNotMatch(String(Reflect.get(Object(error), "message")), /absolute/);
    return true;
  });
});

test("accepts a clean STORE package after validating referenced and unreferenced payloads", async () => {
  const bytes = await createScormPackage(
    scormManifest({ resourceHref: "asset.txt" }),
    {
      "asset.txt": "ASSET-CONTENT-12345",
      "unreferenced.txt": "UNREFERENCED-CONTENT"
    },
    { compression: "STORE" }
  );

  const report = await importScormPackage(bytes, { importedAt: "2026-08-29T02:00:00.000Z" });

  assert.equal(report.archive.fileCount, 3);
  assert.equal(report.courseVersion.resources[0]?.href, "asset.txt");
  assert.deepEqual(report.warnings, [unsupportedSemanticWarning]);
});

test("rejects corrupted referenced or unreferenced payloads before returning a report", async () => {
  const assetPayload = Uint8Array.from(
    { length: 1024 },
    (_, index) => (index * 73 + 19) & 0xff
  );
  const unreferencedPayload = Uint8Array.from(
    { length: 1024 },
    (_, index) => (index * 91 + 47) & 0xff
  );
  for (const compression of ["STORE", "DEFLATE"] as const) {
    for (const corruptedName of ["asset.txt", "unreferenced.txt"] as const) {
      const generated = await createScormPackage(
        scormManifest({ resourceHref: "asset.txt" }),
        {
          "asset.txt": assetPayload,
          "unreferenced.txt": unreferencedPayload
        },
        { compression }
      );
      const bytes = new Uint8Array(generated);
      const centralOffset = findCentralEntryOffset(bytes, corruptedName);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      assert.equal(
        view.getUint16(centralOffset + 10, true),
        compression === "STORE" ? 0 : 8,
        "fixture compression method must match"
      );
      const localOffset = view.getUint32(centralOffset + 42, true);
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressedSize = view.getUint32(centralOffset + 20, true);
      assert.ok(compressedSize > 2, "fixture compressed payload must be non-trivial");
      const corruptionOffset = dataStart + Math.floor(compressedSize / 2);
      bytes[corruptionOffset] = bytes[corruptionOffset]! ^ 1;

      await assert.rejects(importScormPackage(bytes), (error: unknown) => {
        assert.equal(
          Reflect.get(Object(error), "code"),
          "ZIP_INVALID",
          `${compression}:${corruptedName}`
        );
        assert.equal(
          Reflect.get(Object(error), "status"),
          400,
          `${compression}:${corruptedName}`
        );
        assert.equal(
          Reflect.get(Object(error), "message"),
          "The uploaded package is not a valid ZIP archive."
        );
        assert.doesNotMatch(
          String(Reflect.get(Object(error), "message")),
          /asset|unreferenced|CONTENT/u
        );
        return true;
      });
    }
  }
});

test("accepts valid unknown local and central extra fields without scanning payload bytes", async () => {
  const rawName = "imsmanifest.xml";
  const generated = await createScormPackage(scormManifest(), {}, { compression: "STORE" });
  const unknownExtra = zipExtraField(
    0xcafe,
    new Uint8Array([0x01, 0x75, 0x70, 0x02, 0x03])
  );
  const bytes = addSingleEntryExtraFields(generated, rawName, {
    localExtra: unknownExtra,
    centralExtra: unknownExtra
  });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-29T02:05:00.000Z" });

  assert.equal(report.archive.fileCount, 1);
  assert.equal(report.courseVersion.course.id, "scorm:manifest:course-minimal");
});

test("rejects Unicode Path fields and malformed local or central ZIP extras", async () => {
  const rawName = "imsmanifest.xml";
  const generated = await createScormPackage(scormManifest(), {}, { compression: "STORE" });
  const safeUnicodePath = infoZipUnicodePathExtra(rawName, rawName);
  const unsafeUnicodePath = infoZipUnicodePathExtra(rawName, `../${rawName}`);
  const emptyUnicodePath = new Uint8Array([0x75, 0x70, 0x00, 0x00]);
  const malformedExtra = new Uint8Array([0x01, 0x00, 0x04, 0x00, 0xff]);
  const cases = [
    {
      name: "matching local and central traversal Unicode paths",
      bytes: addSingleEntryExtraFields(generated, rawName, {
        localExtra: unsafeUnicodePath,
        centralExtra: unsafeUnicodePath
      }),
      code: "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      status: 422
    },
    {
      name: "a benign local-only Unicode path",
      bytes: addSingleEntryExtraFields(generated, rawName, { localExtra: safeUnicodePath }),
      code: "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      status: 422
    },
    {
      name: "a central-only traversal Unicode path",
      bytes: addSingleEntryExtraFields(generated, rawName, { centralExtra: unsafeUnicodePath }),
      code: "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      status: 422
    },
    {
      name: "duplicate Unicode path fields",
      bytes: addSingleEntryExtraFields(generated, rawName, {
        centralExtra: concatTestBytes(safeUnicodePath, unsafeUnicodePath)
      }),
      code: "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      status: 422
    },
    {
      name: "a TLV-valid but empty Unicode path field",
      bytes: addSingleEntryExtraFields(generated, rawName, { localExtra: emptyUnicodePath }),
      code: "ZIP_FILENAME_ENCODING_UNSUPPORTED",
      status: 422
    },
    {
      name: "a truncated local extra field",
      bytes: addSingleEntryExtraFields(generated, rawName, { localExtra: malformedExtra }),
      code: "ZIP_INVALID",
      status: 400
    },
    {
      name: "a truncated central extra field",
      bytes: addSingleEntryExtraFields(generated, rawName, { centralExtra: malformedExtra }),
      code: "ZIP_INVALID",
      status: 400
    }
  ] as const;

  for (const fixture of cases) {
    await assert.rejects(importScormPackage(fixture.bytes), (error: unknown) => {
      assert.equal(Reflect.get(Object(error), "code"), fixture.code, fixture.name);
      assert.equal(Reflect.get(Object(error), "status"), fixture.status, fixture.name);
      assert.doesNotMatch(
        String(Reflect.get(Object(error), "message")),
        /imsmanifest|\.\./u,
        fixture.name
      );
      return true;
    });
  }
});

test("rejects DOCTYPE and ENTITY declaration surfaces before XML entity expansion", async () => {
  const base = scormManifest();
  const declarations = [
    "<!DOCTYPE manifest [<!ENTITY xxe SYSTEM \"file:///private/sensitive\">]>",
    "<!ENTITY injected \"unsafe\">"
  ];

  for (const declaration of declarations) {
    const manifest = base.replace("?>", `?>\n${declaration}`);
    const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });
    await assert.rejects(importScormPackage(bytes), (error: unknown) => {
      assert.equal(Reflect.get(Object(error), "code"), "MANIFEST_XML_DTD_FORBIDDEN");
      assert.equal(Reflect.get(Object(error), "status"), 422);
      assert.doesNotMatch(String(Reflect.get(Object(error), "message")), /private|sensitive/);
      return true;
    });
  }
});

test("rejects illegal literal XML 1.0 controls in attributes and text", async () => {
  const manifests = [
    scormManifest().replace("course-minimal", "course\u0001minimal"),
    scormManifest().replace("Minimal course", "Minimal\u0001course")
  ];

  for (const manifest of manifests) {
    const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });
    await assert.rejects(importScormPackage(bytes), (error: unknown) => {
      assert.equal(Reflect.get(Object(error), "code"), "MANIFEST_XML_INVALID");
      assert.equal(Reflect.get(Object(error), "status"), 422);
      return true;
    });
  }
});

test("rejects malformed raw XML entity, attribute, text, and comment surfaces", async () => {
  const manifests = [
    scormManifest().replace("Minimal course", "Minimal & course"),
    scormManifest().replace("course-minimal", "course&minimal"),
    scormManifest().replace("resource-1\" type", "resource<1\" type"),
    scormManifest().replace("<metadata>", "<!-- invalid -- comment -->\n  <metadata>"),
    scormManifest().replace("Minimal course", "Minimal ]]> course")
  ];

  for (const manifest of manifests) {
    const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });
    await assert.rejects(importScormPackage(bytes), (error: unknown) => {
      assert.equal(Reflect.get(Object(error), "code"), "MANIFEST_XML_INVALID");
      assert.equal(Reflect.get(Object(error), "status"), 422);
      return true;
    });
  }
});

const malformedXmlDeclarationAndTagCases = [
  {
    name: "a garbage XML declaration",
    manifest: scormManifest().replace(
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<?xml garbage?>"
    )
  },
  {
    name: "an empty XML declaration",
    manifest: scormManifest().replace(
      '<?xml version="1.0" encoding="UTF-8"?>',
      "<?xml?>"
    )
  },
  {
    name: "a second XML declaration in the document body",
    manifest: scormManifest().replace(
      "  <metadata>",
      '  <?xml version="1.0"?>\n  <metadata>'
    )
  },
  {
    name: "whitespace immediately after an opening angle bracket",
    manifest: scormManifest().replace("<manifest identifier=", "< manifest identifier=")
  },
  {
    name: "whitespace immediately after a closing-tag slash",
    manifest: scormManifest().replace("</manifest>", "</ manifest>")
  },
  {
    name: "adjacent attributes without XML S",
    manifest: scormManifest().replace(
      'identifier="course-minimal" version="1.0"',
      'identifier="course-minimal"version="1.0"'
    )
  },
  {
    name: "attributes separated by a non-breaking space",
    manifest: scormManifest().replace(
      'identifier="course-minimal" version="1.0"',
      'identifier="course-minimal"\u00a0version="1.0"'
    )
  },
  {
    name: "a space after an empty-element slash",
    manifest: scormManifest().replace("  <metadata>", "  <ignored/ >\n  <metadata>")
  },
  {
    name: "a tab after an empty-element slash",
    manifest: scormManifest().replace("  <metadata>", "  <ignored/\t>\n  <metadata>")
  },
  {
    name: "a newline after an empty-element slash",
    manifest: scormManifest().replace("  <metadata>", "  <ignored/\n>\n  <metadata>")
  },
  {
    name: "a leading non-breaking space outside the root",
    manifest: scormManifest().replace("?>\n<manifest", "?>\n\u00a0<manifest")
  },
  {
    name: "a trailing non-breaking space outside the root",
    manifest: `${scormManifest()}\u00a0`
  },
  {
    name: "an encoded space outside the root",
    manifest: scormManifest().replace("?>\n<manifest", "?>\n&#32;<manifest")
  }
] as const;

for (const malformedCase of malformedXmlDeclarationAndTagCases) {
  test(`rejects ${malformedCase.name}`, async () => {
    const bytes = await createScormPackage(malformedCase.manifest, {
      "content.txt": "Static lesson"
    });

    await assert.rejects(importScormPackage(bytes), (error: unknown) => {
      assert.equal(Reflect.get(Object(error), "code"), "MANIFEST_XML_INVALID");
      assert.equal(Reflect.get(Object(error), "status"), 422);
      return true;
    });
  });
}

test("decodes predefined XML entities without enabling declaration expansion", async () => {
  const bytes = await createScormPackage(
    scormManifest().replace("Minimal course", "Minimal &amp; safe course"),
    { "content.txt": "Static lesson" }
  );

  const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:15:00.000Z" });
  assert.equal(report.courseVersion.modules[0]?.title, "Minimal & safe course");
});

test("reports HTML and JavaScript as blocked static metadata without executing either file", async () => {
  const marker = "__maisScormPackageExecuted";
  const runtime = globalThis as Record<string, unknown>;
  delete runtime[marker];
  const bytes = await createScormPackage(scormManifest({ resourceHref: "launch.html" }), {
    "launch.html": `<script>globalThis.${marker} = "html"</script>`,
    "scripts/run.js": `globalThis.${marker} = "javascript"`
  });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:20:00.000Z" });

  assert.equal(runtime[marker], undefined);
  assert.deepEqual(report.blockedExecutables.map((entry) => ({
    path: entry.path,
    mediaType: entry.mediaType,
    referencedByResourceIds: entry.referencedByResourceIds,
    reason: entry.reason
  })), [
    {
      path: "launch.html",
      mediaType: "text/html",
      referencedByResourceIds: ["scorm:resource:resource-1"],
      reason: "execution-disabled"
    },
    {
      path: "scripts/run.js",
      mediaType: "text/javascript",
      referencedByResourceIds: [],
      reason: "execution-disabled"
    }
  ]);
  delete runtime[marker];
});

test("omits external manifest references as warnings without making a network request", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("network access is forbidden");
  };
  try {
    const bytes = await createScormPackage(scormManifest({
      resourceHref: "https://lms.example.invalid/launch.html"
    }));

    const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:30:00.000Z" });

    assert.equal(fetchCalls, 0);
    assert.equal(report.courseVersion.resources[0]?.href, null);
    assert.deepEqual(report.courseVersion.resources[0]?.filePaths, []);
    assert.ok(report.warnings.length >= 1);
    assert.deepEqual(new Set(report.warnings.map(({ code }) => code)), new Set([
      "RESOURCE_PATH_OMITTED",
      "UNSUPPORTED_SEMANTIC_OMITTED"
    ]));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rechecks percent-decoded manifest paths and blocks encoded dangerous schemes", async () => {
  const bytes = await createScormPackage(scormManifest({
    resourceHref: "%68%74%74%70%73%3Aevil"
  }));

  const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:35:00.000Z" });

  assert.equal(report.courseVersion.resources[0]?.href, null);
  assert.deepEqual(report.courseVersion.resources[0]?.filePaths, []);
  assert.ok(report.warnings.length >= 1);
  assert.deepEqual(new Set(report.warnings.map(({ code }) => code)), new Set([
    "RESOURCE_PATH_OMITTED",
    "UNSUPPORTED_SEMANTIC_OMITTED"
  ]));
});

test("fails closed on signed ZIP data descriptors, including corrupted descriptor relationships", async () => {
  const generated = await createScormPackage(
    scormManifest(),
    { "content.txt": "Static lesson" },
    { streamFiles: true }
  );
  const bytes = new Uint8Array(generated);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let descriptorOffset = -1;
  for (let offset = 0; offset <= bytes.byteLength - 16; offset += 1) {
    if (view.getUint32(offset, true) === 0x08074b50) {
      descriptorOffset = offset;
      break;
    }
  }
  assert.notEqual(descriptorOffset, -1, "fixture must contain a signed ZIP data descriptor");
  view.setUint32(descriptorOffset + 4, view.getUint32(descriptorOffset + 4, true) ^ 1, true);

  await assert.rejects(
    importScormPackage(bytes),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_DATA_DESCRIPTOR_UNSUPPORTED" &&
      Reflect.get(Object(error), "status") === 422
  );
});

test("fails closed on unsigned ZIP data descriptors", async () => {
  const zip = new JSZip();
  zip.file("imsmanifest.xml", scormManifest(), { date: fixedZipDate, createFolders: false });
  const signed = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    streamFiles: true,
    platform: "UNIX"
  });
  const signedView = new DataView(signed.buffer, signed.byteOffset, signed.byteLength);
  let descriptorOffset = -1;
  for (let offset = 0; offset <= signed.byteLength - 16; offset += 1) {
    if (signedView.getUint32(offset, true) === 0x08074b50) {
      descriptorOffset = offset;
      break;
    }
  }
  assert.notEqual(descriptorOffset, -1, "fixture must contain a signed ZIP data descriptor");

  const unsigned = new Uint8Array(signed.byteLength - 4);
  unsigned.set(signed.subarray(0, descriptorOffset), 0);
  unsigned.set(signed.subarray(descriptorOffset + 4), descriptorOffset);
  const unsignedView = new DataView(unsigned.buffer, unsigned.byteOffset, unsigned.byteLength);
  let eocdOffset = -1;
  for (let offset = unsigned.byteLength - 22; offset >= 0; offset -= 1) {
    if (unsignedView.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  assert.notEqual(eocdOffset, -1, "fixture must contain an end-of-central-directory record");
  unsignedView.setUint32(
    eocdOffset + 16,
    unsignedView.getUint32(eocdOffset + 16, true) - 4,
    true
  );

  await assert.rejects(
    importScormPackage(unsigned),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_DATA_DESCRIPTOR_UNSUPPORTED" &&
      Reflect.get(Object(error), "status") === 422
  );
});

test("rejects forged directory attributes instead of skipping file size accounting", async () => {
  const generated = await createScormPackage(scormManifest(), {
    "content.txt": "B".repeat(3_000)
  });
  const bytes = new Uint8Array(generated);
  const centralOffset = findCentralEntryOffset(bytes, "content.txt");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const attributes = view.getUint32(centralOffset + 38, true);
  view.setUint32(
    centralOffset + 38,
    ((attributes & 0x0fffffff) | 0x40000000 | 0x10) >>> 0,
    true
  );

  await assert.rejects(
    importScormPackage(bytes, {
      limits: { maxSingleFileBytes: 2_000, maxManifestBytes: 1_000 }
    }),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_DIRECTORY_INVALID" &&
      Reflect.get(Object(error), "status") === 422
  );
});

test("rejects Unix symlink entries before loading package content", async () => {
  const generated = await createScormPackage(scormManifest(), {
    "content.txt": "imsmanifest.xml"
  });
  const bytes = new Uint8Array(generated);
  const centralOffset = findCentralEntryOffset(bytes, "content.txt");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const attributes = view.getUint32(centralOffset + 38, true);
  view.setUint32(
    centralOffset + 38,
    ((attributes & 0x0fffffff) | 0xa0000000) >>> 0,
    true
  );

  await assert.rejects(
    importScormPackage(bytes),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_LINK_UNSUPPORTED" &&
      Reflect.get(Object(error), "status") === 422
  );
});

test("accepts canonical trailing-slash directories with zero declared data", async () => {
  const zip = new JSZip();
  zip.file(
    "imsmanifest.xml",
    scormManifest({ resourceHref: "assets/content.txt" }),
    { date: fixedZipDate, createFolders: false }
  );
  zip.file("assets/", null, { date: fixedZipDate, dir: true, createFolders: false });
  zip.file("assets/content.txt", "Static lesson", { date: fixedZipDate, createFolders: false });
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    platform: "UNIX"
  });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:37:00.000Z" });

  assert.equal(report.archive.entryCount, 3);
  assert.equal(report.archive.fileCount, 2);
  assert.equal(report.courseVersion.resources[0]?.href, "assets/content.txt");
});

test("rejects contradictory local and central ZIP size declarations", async () => {
  const generated = await createScormPackage(scormManifest(), { "content.txt": "Static lesson" });
  const bytes = new Uint8Array(generated);
  const centralOffset = findCentralEntryOffset(bytes, "imsmanifest.xml");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const localOffset = view.getUint32(centralOffset + 42, true);
  view.setUint32(localOffset + 22, view.getUint32(localOffset + 22, true) ^ 1, true);

  await assert.rejects(
    importScormPackage(bytes),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_INVALID" &&
      Reflect.get(Object(error), "status") === 400
  );
});

test("rejects ZIP entries marked as encrypted before loading the manifest", async () => {
  const generated = await createScormPackage(scormManifest(), { "content.txt": "Static lesson" });
  const bytes = new Uint8Array(generated);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let marked = false;
  for (let offset = 0; offset <= bytes.byteLength - 46; offset += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) continue;
    view.setUint16(offset + 8, view.getUint16(offset + 8, true) | 0x0001, true);
    marked = true;
    break;
  }
  assert.equal(marked, true);

  await assert.rejects(
    importScormPackage(bytes),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_ENCRYPTED_ENTRY" &&
      Reflect.get(Object(error), "status") === 422
  );
});

test("enforces entry-count and single-file resource limits", async () => {
  const bytes = await createScormPackage(scormManifest(), {
    "content.txt": "B".repeat(3_000)
  });

  await assert.rejects(
    importScormPackage(bytes, { limits: { maxFiles: 1 } }),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_ENTRY_LIMIT_EXCEEDED"
  );
  await assert.rejects(
    importScormPackage(bytes, {
      limits: { maxSingleFileBytes: 2_000, maxManifestBytes: 1_000 }
    }),
    (error: unknown) => Reflect.get(Object(error), "code") === "ZIP_ENTRY_TOO_LARGE"
  );
});

test("warns and omits an unidentifiable resource instead of fabricating a canonical ID", async () => {
  const manifest = scormManifest().replace(
    "<resource identifier=\"resource-1\" type=\"webcontent\"",
    "<resource type=\"webcontent\""
  );
  const bytes = await createScormPackage(manifest, { "content.txt": "Static lesson" });

  const report = await importScormPackage(bytes, { importedAt: "2026-08-27T06:40:00.000Z" });

  assert.deepEqual(report.courseVersion.resources, []);
  assert.deepEqual(report.courseVersion.units[0]?.resourceIds, []);
  assert.deepEqual(report.warnings.map((warning) => warning.code), [
    "RESOURCE_REFERENCE_UNRESOLVED",
    "RESOURCE_SKIPPED",
    "UNSUPPORTED_SEMANTIC_OMITTED"
  ]);
  assert.doesNotMatch(JSON.stringify(report.courseVersion), /generated|synthetic|resource-1/);
});

test("canonical diff detects changed asset bytes and unsupported sequencing semantics", async () => {
  const manifest = scormManifest();
  const beforeBytes = await createScormPackage(manifest, { "content.txt": "asset-before" });
  const afterBytes = await createScormPackage(manifest, { "content.txt": "asset-after" });
  const before = await importScormPackage(beforeBytes);
  const after = await importScormPackage(afterBytes);
  assert.ok(
    diffCanonicalCourseVersions(before.courseVersion, after.courseVersion).changed.some(
      ({ kind }) => kind === "course" || kind === "resource"
    ),
    "asset byte changes must be visible in the semantic diff"
  );

  const sequencing = (objectiveId: string) => scormManifest({
    schemaVersion: "2004 4th Edition",
    adlcpNamespace: "http://www.adlnet.org/xsd/adlcp_v1p3"
  })
    .replace("<manifest identifier=", '<manifest xmlns:imsss="http://www.imsglobal.org/xsd/imsss" identifier=')
    .replace(
      "</item>",
      `<imsss:sequencing><imsss:objectives><imsss:objective objectiveID="${objectiveId}"/></imsss:objectives></imsss:sequencing></item>`
    );
  const sequencingBefore = await importScormPackage(await createScormPackage(
    sequencing("objective-before"),
    { "content.txt": "same asset" }
  ));
  const sequencingAfter = await importScormPackage(await createScormPackage(
    sequencing("objective-after"),
    { "content.txt": "same asset" }
  ));
  assert.ok(sequencingAfter.warnings.some(({ code }) => code === "UNSUPPORTED_SEMANTIC_OMITTED"));
  assert.ok(
    diffCanonicalCourseVersions(
      sequencingBefore.courseVersion,
      sequencingAfter.courseVersion
    ).changed.some(({ kind }) => kind === "course"),
    "unsupported sequencing changes must remain visible in the semantic diff"
  );
});

test("canonical diff retains unsupported core and vendor attribute changes as bounded loss evidence", async () => {
  const coreBefore = await importScormPackage(await createScormPackage(
    scormManifest().replace(
      '<manifest identifier="course-minimal" version="1.0"',
      '<manifest identifier="course-minimal" version="core-before"'
    ),
    { "content.txt": "same asset" }
  ));
  const coreAfter = await importScormPackage(await createScormPackage(
    scormManifest().replace(
      '<manifest identifier="course-minimal" version="1.0"',
      '<manifest identifier="course-minimal" version="core-after"'
    ),
    { "content.txt": "same asset" }
  ));
  assert.ok(
    diffCanonicalCourseVersions(coreBefore.courseVersion, coreAfter.courseVersion).changed.length > 0,
    "ignored core attribute changes must remain visible in the semantic diff"
  );

  const withVendorAttribute = (value: string) => scormManifest()
    .replace(
      '<resource identifier="resource-1"',
      `<resource xmlns:vendor="urn:vendor" vendor:tracking="${value}" identifier="resource-1"`
    );
  const vendorBefore = await importScormPackage(await createScormPackage(
    withVendorAttribute("vendor-before"),
    { "content.txt": "same asset" }
  ));
  const vendorAfter = await importScormPackage(await createScormPackage(
    withVendorAttribute("vendor-after"),
    { "content.txt": "same asset" }
  ));
  assert.ok(
    diffCanonicalCourseVersions(vendorBefore.courseVersion, vendorAfter.courseVersion).changed.length > 0,
    "vendor attribute changes must remain visible in the semantic diff"
  );
  assert.doesNotMatch(JSON.stringify(vendorAfter.courseVersion), /vendor-after/u);
  assert.ok(vendorAfter.warnings.some(({ code }) => code === "UNSUPPORTED_SEMANTIC_OMITTED"));
});

test("resolves hierarchical xml:base paths without allowing traversal", async () => {
  const manifest = scormManifest({ resourceHref: "index.html" })
    .replace("<manifest identifier=", '<manifest xml:base="package/" identifier=')
    .replace("<resources>", '<resources xml:base="content/">')
    .replace(
      '<resource identifier="resource-1"',
      '<resource xml:base="lesson/" identifier="resource-1"'
    )
    .replace('<file href="index.html" />', '<file xml:base="assets/" href="script.js" />');
  const report = await importScormPackage(await createScormPackage(manifest, {
    "package/content/lesson/index.html": "static",
    "package/content/lesson/assets/script.js": "blocked"
  }));
  assert.equal(report.courseVersion.resources[0]?.href, "package/content/lesson/index.html");
  assert.deepEqual(report.courseVersion.resources[0]?.filePaths, [
    "package/content/lesson/index.html",
    "package/content/lesson/assets/script.js"
  ]);

  const traversal = manifest.replace('xml:base="lesson/"', 'xml:base="../escape/"');
  await assert.rejects(
    importScormPackage(await createScormPackage(traversal, {})),
    (error: unknown) => Reflect.get(Object(error), "code") === "SCORM_XML_BASE_UNSAFE"
  );
});

test("resolves a no-slash xml:base as a file base under RFC 3986 semantics", async () => {
  const manifest = scormManifest({ resourceHref: "index.html" })
    .replace("<manifest identifier=", '<manifest xml:base="package" identifier=')
    .replace("<resources>", '<resources xml:base="content/">')
    .replace(
      '<resource identifier="resource-1"',
      '<resource xml:base="lesson/" identifier="resource-1"'
    );
  const report = await importScormPackage(await createScormPackage(manifest, {
    "content/lesson/index.html": "static"
  }));
  assert.equal(report.courseVersion.resources[0]?.href, "content/lesson/index.html");
  assert.deepEqual(report.courseVersion.resources[0]?.filePaths, ["content/lesson/index.html"]);
});

test("accepts LOM and extension subtrees whose local names overlap core names", async () => {
  const manifest = scormManifest()
    .replace(
      "</metadata>",
      '<lom:lom xmlns:lom="http://ltsc.ieee.org/xsd/LOM"><lom:general><lom:title><lom:string>LOM title</lom:string></lom:title></lom:general></lom:lom></metadata>'
    )
    .replace(
      "</resource>",
      '<ext:resource xmlns:ext="urn:vendor"><ext:title>Extension title</ext:title></ext:resource></resource>'
    );
  const report = await importScormPackage(await createScormPackage(manifest, {
    "content.txt": "Static lesson"
  }));
  assert.equal(report.courseVersion.course.id, "scorm:manifest:course-minimal");
  assert.ok(report.warnings.some(({ code }) => code === "UNSUPPORTED_SEMANTIC_OMITTED"));
});

test("bounds identifiers, titles, warning amplification, and serialized reports", async () => {
  await assert.rejects(
    importScormPackage(await createScormPackage(scormManifest().replace(
      'identifier="course-minimal"',
      'identifier="identifier-too-long"'
    ), { "content.txt": "Static lesson" }), { limits: { maxIdentifierChars: 8 } }),
    (error: unknown) => Reflect.get(Object(error), "code") === "SCORM_FIELD_TOO_LARGE"
  );
  await assert.rejects(
    importScormPackage(await createScormPackage(scormManifest().replace(
      "Minimal course",
      "T".repeat(64)
    ), { "content.txt": "Static lesson" }), { limits: { maxTitleChars: 32 } }),
    (error: unknown) => Reflect.get(Object(error), "code") === "SCORM_FIELD_TOO_LARGE"
  );

  const distinctMissingResources = Array.from(
    { length: 20 },
    (_, index) => `<resource identifier="missing-resource-${index}" type="webcontent" href="missing-${index}.txt"><file href="missing-${index}.txt"/></resource>`
  ).join("");
  const warningsManifest = scormManifest().replace(
    /<resource identifier="resource-1"[\s\S]*?<\/resource>/u,
    distinctMissingResources
  );
  const warningReport = await importScormPackage(
    await createScormPackage(warningsManifest, { "content.txt": "Static lesson" }),
    { limits: { maxWarnings: 4 } }
  );
  assert.ok(warningReport.warnings.length <= 4);
  assert.ok(
    warningReport.warnings.some(({ code }) => code === "WARNING_LIMIT_REACHED"),
    "distinct warning sources must exercise the bounded truncation summary"
  );
  assert.ok(new Set(
    warningReport.warnings
      .filter(({ code }) => code === "RESOURCE_FILE_NOT_IN_PACKAGE")
      .map(({ sourceId }) => sourceId)
  ).size > 1);
  assert.equal(
    new Set(warningReport.warnings.map((warning) => JSON.stringify(warning))).size,
    warningReport.warnings.length
  );

  await assert.rejects(
    importScormPackage(await createScormPackage(scormManifest(), {
      "content.txt": "Static lesson"
    }), { limits: { maxReportBytes: 512 } }),
    (error: unknown) => Reflect.get(Object(error), "code") === "REPORT_TOO_LARGE"
  );
});

test("rejects host 19 links and special filesystem nodes", async () => {
  for (const fileType of [0xa0000000, 0x10000000, 0x20000000, 0x60000000, 0xc0000000]) {
    const bytes = new Uint8Array(await createScormPackage(scormManifest(), {
      "content.txt": "Static lesson"
    }));
    markEntryAsHostSpecialFile(bytes, "content.txt", 19, fileType);
    await assert.rejects(
      importScormPackage(bytes),
      (error: unknown) => ["ZIP_LINK_UNSUPPORTED", "ZIP_SPECIAL_FILE_UNSUPPORTED"].includes(
        String(Reflect.get(Object(error), "code"))
      )
    );
  }
});

test("requires strict and consistent SCORM schema/version evidence", async () => {
  for (const manifest of [
    scormManifest({ schemaVersion: "1.2 draft" }),
    scormManifest().replace("<schema>ADL SCORM</schema>", "<schema>ADL SCORM experimental</schema>"),
    scormManifest({
      schemaVersion: "1.2",
      adlcpNamespace: "http://www.adlnet.org/xsd/adlcp_v1p3"
    })
  ]) {
    await assert.rejects(
      importScormPackage(await createScormPackage(manifest, { "content.txt": "Static lesson" })),
      (error: unknown) => Reflect.get(Object(error), "code") === "SCORM_VERSION_UNSUPPORTED"
    );
  }
});

test("rejects conflicting duplicate metadata and schemaversion declarations", async () => {
  const conflictingSchemaVersion = scormManifest().replace(
    "</metadata>",
    "<schemaversion>2004</schemaversion></metadata>"
  );
  const conflictingMetadata = scormManifest().replace(
    "</metadata>",
    "</metadata><metadata><schema>ADL SCORM</schema><schemaversion>2004</schemaversion></metadata>"
  );
  const conflicting2004Edition = scormManifest({
    schemaVersion: "2004",
    adlcpNamespace: "http://www.adlnet.org/xsd/adlcp_v1p3"
  }).replace(
    "</metadata>",
    "<schemaversion>2004 4th Edition</schemaversion></metadata>"
  );
  for (const manifest of [conflictingSchemaVersion, conflictingMetadata, conflicting2004Edition]) {
    await assert.rejects(
      importScormPackage(await createScormPackage(manifest, { "content.txt": "Static lesson" })),
      (error: unknown) => Reflect.get(Object(error), "code") === "SCORM_VERSION_UNSUPPORTED"
    );
  }
});

test("attributes blocked executable references case-insensitively", async () => {
  const manifest = scormManifest({ resourceHref: "CONTENT.HTML" });
  const report = await importScormPackage(await createScormPackage(manifest, {
    "content.html": "<html>blocked</html>"
  }));
  assert.deepEqual(report.blockedExecutables[0]?.referencedByResourceIds, [
    "scorm:resource:resource-1"
  ]);
});

export { createScormPackage, scormManifest };
