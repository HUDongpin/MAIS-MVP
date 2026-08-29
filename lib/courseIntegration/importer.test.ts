import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";

import { importScormPackage } from "./importer";

const fixedZipDate = new Date("2020-01-01T00:00:00.000Z");

async function createScormPackage(
  manifest: string,
  files: Record<string, string | Uint8Array> = {},
  options: { readonly streamFiles?: boolean } = {}
) {
  const zip = new JSZip();
  zip.file("imsmanifest.xml", manifest, { date: fixedZipDate, createFolders: false });
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content, { date: fixedZipDate, createFolders: false });
  }
  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
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
  assert.deepEqual(report.warnings, []);
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
    assert.ok(report.warnings.every((warning) => warning.code === "RESOURCE_PATH_OMITTED"));
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
  assert.ok(report.warnings.every((warning) => warning.code === "RESOURCE_PATH_OMITTED"));
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
    "RESOURCE_SKIPPED"
  ]);
  assert.doesNotMatch(JSON.stringify(report.courseVersion), /generated|synthetic|resource-1/);
});

export { createScormPackage, scormManifest };
