# Course integration: safe static import slice

## Supported boundary

This slice accepts SCORM 1.2 and SCORM 2004 ZIP packages for **static inspection only**. It reads the ZIP directory and the root `imsmanifest.xml` in memory, identifies the SCORM version, maps safely identifiable organization/item/resource relationships into the canonical course model, computes a SHA-256 package identity, and returns a static import report.

The importer never evaluates or imports package code. HTML, JavaScript, WebAssembly, Flash, XHTML, and SVG entries are retained only as `blockedExecutables` metadata. It performs no network requests, filesystem writes, persistence, publication, LMS calls, login, LTI launch, grade passback, or roster synchronization. Manifest information that cannot be mapped without inference is omitted and reported in `warnings`; assessments are not inferred from a generic SCORM SCO or asset.

Default package limits are:

- uploaded ZIP: 20 MiB;
- ZIP entries: 2,000;
- one uncompressed file: 16 MiB;
- total declared uncompressed content: 64 MiB;
- `imsmanifest.xml`: 1 MiB.

ZIP64, multi-disk ZIPs, encrypted entries, unsupported compression, unsafe or duplicate canonical paths, NULs, and XML `DOCTYPE`/`ENTITY` declarations are rejected. Only the manifest is decompressed, through a bounded stream with actual-size and CRC32 verification.

## Calling the teacher API

Send `POST /api/teacher/course-imports` as `multipart/form-data` with exactly one file field named `package`. The caller must have an authenticated teacher or admin session and must include the same rendered-user constraint used by current teacher APIs, for example both `X-MAIS-Expected-User-Id` and `expectedUserId`:

```bash
curl -X POST \
  -H "X-MAIS-Expected-User-Id: <current-user-id>" \
  -F "expectedUserId=<current-user-id>" \
  -F "package=@course.zip;type=application/zip" \
  "http://localhost:3000/api/teacher/course-imports?expectedUserId=<current-user-id>"
```

The successful response contains only `{ "import": <static-report> }`. It does not create a course, save an upload, publish content, or contact an LMS.

## Failure semantics

- `400`: malformed/empty ZIP input, invalid multipart input, missing or duplicate `package` field, or unreadable upload;
- `401`: no authenticated session;
- `403`: authenticated user is not a teacher/admin;
- `409`: expected-user constraint does not match the current authenticated user;
- `413`: compressed upload, entry count, single-file, total-uncompressed, or manifest limit exceeded;
- `422`: unsafe/unsupported ZIP, missing manifest, unsafe XML, unsupported SCORM version, or otherwise unmappable required manifest structure;
- `503`: authentication could not be checked.

Client-visible errors use stable codes and generic messages. They do not include server paths, stack traces, raw parser diagnostics, credentials, or provider details. A syntactically valid import may still contain structured warnings and blocked executable metadata.

## LTI/LMS readiness gate

The exported readiness descriptor is fail-closed: LMS/LTI providers are `unconfigured`; course publication, package upload to an LMS, external writes, login, launch, grade passback, and roster sync are `disabled`.

Enabling any live LMS/LTI capability requires a separate owner-authorized slice naming the provider and environment, approved tenant/data/write scopes, credential placement by the provider owner, protocol and threat-model review, test fixtures plus provider sandbox evidence, rollback/observability controls, and explicit production authorization. This static importer is not that authorization.

Existing xAPI/LRS support is telemetry infrastructure. An xAPI statement or reachable LRS does **not** prove SCORM runtime conformance, LTI login/launch, grade passback, roster sync, LMS publication, or end-to-end LMS readiness.
