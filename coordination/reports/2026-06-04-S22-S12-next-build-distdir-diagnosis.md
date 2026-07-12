# 2026-06-04 S22/S12 Next Build DistDir Diagnosis

## Owner Request

Dr. Peter Hu accepted the follow-up recommendation to execute the release/build investigation for the live classroom tools work.

## Finding

The default `.next` build directory is in a corrupted/inconsistent manifest state. The source code and admin API routes are buildable in a clean isolated distDir.

## Evidence

- `npm run build` with default `.next` compiled successfully and passed lint/type validation, then failed during `Collecting page data`.
- Observed failures included:
  - `/api/admin/storage/health`
  - `/api/admin/storage/export`
  - `/api/admin/provisioning/validate`
- The corresponding source files exist:
  - `app/api/admin/storage/health/route.ts`
  - `app/api/admin/storage/export/route.ts`
  - `app/api/admin/provisioning/validate/route.ts`
- After the failed default build, `.next/server/app-paths-manifest.json` was observed as an empty object.
- Isolated build command passed:
  - `NEXT_DIST_DIR=.next-s13-build-debug npm run build`
- The isolated build generated a valid app paths manifest with:
  - `/api/admin/provisioning/validate/route`
  - `/api/admin/storage/export/route`
  - `/api/admin/storage/health/route`

## Root Cause Assessment

The issue is not the admin route source implementation and not the live classroom tools change. The likely root cause is stale/corrupted default `.next` generated state from repeated parallel local builds.

## Recommended S22/S12 Action

- In a controlled release/build session, clean or replace the default Next dist directory and rerun `npm run build`.
- Do not preserve `.next` as evidence after a successful clean build unless S22 needs it for release forensics.
- Confirm `tsconfig.json` does not accumulate local distDir-specific includes from temporary builds.
- If the clean default build still fails, inspect Next manifest generation after compile and before page-data collection.

## Acceptance Criteria

- `npm run build` passes using the default distDir.
- `.next/server/app-paths-manifest.json` contains API route keys after compile.
- No local-only distDir include is added to committed `tsconfig.json`.
