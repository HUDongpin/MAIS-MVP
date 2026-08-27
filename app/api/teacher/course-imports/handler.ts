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

import {
  isCourseImportMultipartError,
  parseBoundedCourseImportMultipart
} from "./multipart";

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
  now = () => new Date(),
  maxMultipartBodyBytes = COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES,
  maxPackageBytes = DEFAULT_SCORM_IMPORT_LIMITS.maxPackageBytes
}: {
  authenticateUser?: CourseImportAuthentication;
  canAccessTeacher?: (user: CourseImportUser) => boolean;
  importPackage?: CoursePackageImporter;
  now?: () => Date;
  maxMultipartBodyBytes?: number;
  maxPackageBytes?: number;
} = {}) {
  if (
    !Number.isSafeInteger(maxMultipartBodyBytes) ||
    maxMultipartBodyBytes <= 0 ||
    !Number.isSafeInteger(maxPackageBytes) ||
    maxPackageBytes <= 0 ||
    maxPackageBytes > maxMultipartBodyBytes
  ) {
    throw new TypeError("Course import multipart limits are invalid.");
  }
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
    let multipart: Awaited<ReturnType<typeof parseBoundedCourseImportMultipart>>;
    try {
      multipart = await parseBoundedCourseImportMultipart(request, {
        maxBodyBytes: maxMultipartBodyBytes,
        maxPackageBytes
      });
    } catch (error) {
      if (isCourseImportMultipartError(error)) {
        return stableError(error.code, error.message, error.status);
      }
      return stableError("MULTIPART_INVALID", "The multipart request could not be parsed.", 400);
    }
    const bodyIdentityConflict = expectedUserConflict(
      authenticated,
      multipart.expectedUserIds,
      false
    );
    if (bodyIdentityConflict) return bodyIdentityConflict;

    try {
      const report = await importPackage(multipart.packageBytes, { importedAt: now().toISOString() });
      return privateJson({ import: report });
    } catch (error) {
      return courseImportFailure(error);
    }
  };
}
