# Course integration: safe static import slice

## Supported boundary

This slice accepts SCORM 1.2 and SCORM 2004 ZIP packages for **static inspection only**. It reads the ZIP structure and root `imsmanifest.xml` in memory, identifies the SCORM version, maps only safely identifiable organization/item/resource relationships, and returns a dry-run report.

The canonical course model is provider-neutral. Its required source provenance uses generic `source.format`/`source.version` and adapter descriptors; source-specific facts live only in optional reverse-domain extension namespaces. The SCORM adapter therefore records manifest and resource-type metadata under `org.adlnet.scorm`, while a future MAIS-native, Common Cartridge, or other adapter can use its own format and namespace without pretending to be SCORM.

Source package identity, canonical version identity, and import-event time are separate:

- `sourcePackage.sha256` and `courseVersion.sourceProvenance.packageSha256` identify the original bytes;
- `courseVersion.versionMetadata.contentSha256` hashes normalized canonical content;
- `versionId` deterministically binds that canonical content hash and `predecessorVersionId`;
- `importEvent.importedAt` records this parse operation and is not part of immutable canonical content.

Repeating the same import at another time therefore returns the same canonical version. Choosing a different predecessor returns a different version ID even when canonical content is unchanged.

The importer never evaluates or imports package code. HTML, JavaScript, WebAssembly, Flash, XHTML, and SVG entries are retained only as `blockedExecutables` metadata. It performs no network requests, filesystem writes, persistence, publication, LMS calls, login, LTI launch, grade passback, or roster synchronization. Manifest information that cannot be mapped without inference is omitted and reported in `warnings`; assessments are not inferred from a generic SCORM SCO or asset.

Default package limits are:

- complete multipart request body: 21 MiB;
- uploaded ZIP part: 20 MiB;
- ZIP entries: 2,000;
- one uncompressed file: 16 MiB;
- total declared uncompressed content: 64 MiB;
- `imsmanifest.xml`: 1 MiB.

The API reads `request.body` as a bounded byte stream before parsing any part; `Content-Length` is only an early rejection hint and is never trusted as the byte count. All fields, headers, boundaries, and package bytes count toward the body limit. The narrowly scoped parser requires strict CRLF framing, permits only `expectedUserId` and exactly one file field named `package`, limits part count and header size, and rejects duplicate package fields, unsupported fields, malformed framing, or a package part above its own limit. It never calls `request.formData()`.

ZIP64, multi-disk ZIPs, encrypted entries, unsupported compression, unsafe/absolute/duplicate canonical paths, and contradictory local/central declarations are rejected. Data-descriptor entries are deliberately rejected rather than partially trusted, including signed and unsigned descriptor forms. A directory is recognized only by a trailing slash and must declare zero compressed bytes, zero uncompressed bytes, and zero CRC; external attributes cannot reclassify a payload file to evade size accounting. Only the manifest is decompressed, through a bounded stream with actual-size and CRC32 verification.

The XML parser rejects `DOCTYPE`/`ENTITY`, malformed markup, invalid entities, and every illegal literal XML 1.0 code point in text, attributes, comments, CDATA, or processing instructions. Manifest paths are checked before and after percent decoding; absolute paths, traversal, encoded separators, and dangerous URI schemes are omitted with warnings rather than dereferenced.

## Calling the teacher API

Send `POST /api/teacher/course-imports` as `multipart/form-data` with exactly one file field named `package`. The caller must have an authenticated teacher or admin session and must include the same rendered-user constraint used by current teacher APIs, for example both `X-MAIS-Expected-User-Id` and `expectedUserId`:

```bash
curl -X POST \
  -H "X-MAIS-Expected-User-Id: <current-user-id>" \
  -F "expectedUserId=<current-user-id>" \
  -F "package=@course.zip;type=application/zip" \
  "http://localhost:3000/api/teacher/course-imports?expectedUserId=<current-user-id>"
```

The successful response contains only `{ "import": <static-report> }`. It does not create a course, save the request or upload, publish content, or contact an LMS.

## Failure semantics

- `400`: malformed/empty ZIP input, invalid multipart syntax or length header, unsupported/duplicate/missing fields, or contradictory ZIP declarations;
- `401`: no authenticated session;
- `403`: authenticated user is not a teacher/admin;
- `409`: expected-user constraint does not match the current authenticated user;
- `413`: request body, compressed upload, package part, entry count, single-file, total-uncompressed, manifest, or multipart field-count limit exceeded;
- `422`: unsafe/unsupported ZIP features or paths, data descriptors, contradictory directory metadata, missing manifest, unsafe XML, unsupported SCORM version, or otherwise unmappable required manifest structure;
- `503`: authentication could not be checked.

Client-visible errors use stable codes and generic messages. They do not include server paths, stack traces, raw parser diagnostics, credentials, filenames supplied by the client, or provider details. A syntactically valid import may still contain structured warnings and blocked executable metadata.

## LTI/LMS readiness gate

The exported readiness descriptor is fail-closed: LMS/LTI providers are `unconfigured`; course publication, package upload to an LMS, external writes, login, launch, grade passback, and roster sync are `disabled`.

Enabling any live LMS/LTI capability requires a separate owner-authorized slice naming the provider and environment, approved tenant/data/write scopes, credential placement by the provider owner, protocol and threat-model review, test fixtures plus provider sandbox evidence, rollback/observability controls, and explicit production authorization. This static importer is not that authorization.

Existing xAPI/LRS support is telemetry infrastructure. An xAPI statement or reachable LRS does **not** prove SCORM runtime conformance, LTI login/launch, grade passback, roster sync, LMS publication, or end-to-end LMS readiness.
