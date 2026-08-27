import {
  canAccessTeacherArea,
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import {
  isCourseImportError
} from "@/lib/courseIntegration/errors";
import {
  importScormPackage,
  type ImportScormPackageOptions
} from "@/lib/courseIntegration/importer";
import { DEFAULT_SCORM_IMPORT_LIMITS } from "@/lib/courseIntegration/zip";
import type { StudentSession } from "@/types";

const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
export const COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES =
  DEFAULT_SCORM_IMPORT_LIMITS.maxPackageBytes + MAX_MULTIPART_OVERHEAD_BYTES;

type CourseImportUser = Pick<StudentSession, "id" | "role">;
type CourseImportAuthentication = (
  request: Request
) => Promise<{ user: CourseImportUser } | null>;
type CoursePackageImporter = (
  bytes: Uint8Array,
  options: ImportScormPackageOptions
) => Promise<unknown>;

interface UploadedPackage {
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function applyPrivateBoundary(response: Response) {
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("CDN-Cache-Control", "private, no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}

function privateJson(body: unknown, init?: ResponseInit) {
  return applyPrivateBoundary(Response.json(body, init));
}

function stableError(code: string, error: string, status: number) {
  return privateJson({ code, error }, { status });
}

function isUploadedPackage(value: FormDataEntryValue): value is FormDataEntryValue & UploadedPackage {
  return typeof value === "object" && value !== null &&
    typeof Reflect.get(value, "size") === "number" &&
    typeof Reflect.get(value, "arrayBuffer") === "function";
}

function contentLengthFailure(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength === null) return null;
  if (!/^[0-9]+$/.test(contentLength)) {
    return stableError("INVALID_CONTENT_LENGTH", "The request content length is invalid.", 400);
  }
  if (Number(contentLength) > COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES) {
    return stableError("PACKAGE_TOO_LARGE", "The uploaded package exceeds the size limit.", 413);
  }
  return null;
}

function expectedUserConflict(
  authenticated: { user: { id: string } },
  constraints: readonly unknown[],
  requireConstraint: boolean
) {
  const conflict = guardExpectedAuthenticatedUser(authenticated, constraints, { requireConstraint });
  return conflict ? applyPrivateBoundary(conflict) : null;
}

function courseImportFailure(error: unknown) {
  if (isCourseImportError(error)) {
    return stableError(error.code, error.message, error.status);
  }
  return stableError(
    "COURSE_PACKAGE_INVALID",
    "The course package could not be imported safely.",
    422
  );
}

export function createTeacherCourseImportPostHandler({
  authenticateUser = requireAuthenticatedUser,
  canAccessTeacher = canAccessTeacherArea,
  importPackage = importScormPackage,
  now = () => new Date()
}: {
  authenticateUser?: CourseImportAuthentication;
  canAccessTeacher?: (user: CourseImportUser) => boolean;
  importPackage?: CoursePackageImporter;
  now?: () => Date;
} = {}) {
  return async function teacherCourseImportPost(request: Request) {
    let authenticated: Awaited<ReturnType<CourseImportAuthentication>>;
    try {
      authenticated = await authenticateUser(request);
    } catch {
      return stableError(
        "AUTHENTICATION_UNAVAILABLE",
        "Course import authentication is temporarily unavailable.",
        503
      );
    }
    if (!authenticated) return privateJson({ error: "Not authenticated." }, { status: 401 });

    const requestIdentityConflict = expectedUserConflict(
      authenticated,
      expectedUserConstraintsFromRequest(request),
      true
    );
    if (requestIdentityConflict) return requestIdentityConflict;
    if (!canAccessTeacher(authenticated.user)) {
      return privateJson({ error: "Teacher access required." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("multipart/form-data;")) {
      return stableError(
        "MULTIPART_REQUIRED",
        "The request must use multipart/form-data with a package field.",
        400
      );
    }
    const lengthFailure = contentLengthFailure(request);
    if (lengthFailure) return lengthFailure;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return stableError("MULTIPART_INVALID", "The multipart request could not be parsed.", 400);
    }
    const bodyIdentityConflict = expectedUserConflict(
      authenticated,
      formData.getAll("expectedUserId"),
      false
    );
    if (bodyIdentityConflict) return bodyIdentityConflict;

    const packageFields = formData.getAll("package");
    if (packageFields.length !== 1 || !isUploadedPackage(packageFields[0]!)) {
      return stableError(
        "PACKAGE_FIELD_REQUIRED",
        "Exactly one file must be supplied in the package field.",
        400
      );
    }
    const uploadedPackage = packageFields[0];
    if (!Number.isSafeInteger(uploadedPackage.size) || uploadedPackage.size < 0) {
      return stableError("PACKAGE_INVALID", "The uploaded package metadata is invalid.", 400);
    }
    if (uploadedPackage.size === 0) {
      return stableError("PACKAGE_EMPTY", "The uploaded package is empty.", 400);
    }
    if (uploadedPackage.size > DEFAULT_SCORM_IMPORT_LIMITS.maxPackageBytes) {
      return stableError("PACKAGE_TOO_LARGE", "The uploaded package exceeds the size limit.", 413);
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await uploadedPackage.arrayBuffer());
    } catch {
      return stableError("PACKAGE_READ_FAILED", "The uploaded package could not be read.", 400);
    }
    if (bytes.byteLength !== uploadedPackage.size) {
      return stableError("PACKAGE_READ_FAILED", "The uploaded package could not be read safely.", 400);
    }

    try {
      const report = await importPackage(bytes, { importedAt: now().toISOString() });
      return privateJson({ import: report });
    } catch (error) {
      return courseImportFailure(error);
    }
  };
}
