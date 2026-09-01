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
  courseImportAdmissionController,
  type CourseImportAdmissionLease
} from "@/lib/courseIntegration/admission";

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
type CourseImportAdmission = (
  request: Request,
  userId: string
) => Promise<Response | CourseImportAdmissionLease>;

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

function courseImportAborted() {
  return stableError(
    "COURSE_IMPORT_ABORTED",
    "The course import request was cancelled or exceeded its time limit.",
    408
  );
}

async function importWithinAdmission(
  importPackage: () => Promise<unknown>,
  signal: AbortSignal
): Promise<{ readonly status: "aborted" } | { readonly status: "completed"; readonly report: unknown }> {
  if (signal.aborted) return { status: "aborted" };
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      action();
    };
    const onAbort = () => finish(() => resolve({ status: "aborted" }));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    Promise.resolve()
      .then(importPackage)
      .then(
        (report) => finish(() => resolve({ status: "completed", report })),
        (error) => finish(() => reject(error))
      );
  });
}

export function createTeacherCourseImportPostHandler({
  authenticateUser = requireAuthenticatedUser,
  canAccessTeacher = canAccessTeacherArea,
  admitImport = (request, userId) => courseImportAdmissionController.admit(request, userId),
  importPackage = importScormPackage,
  now = () => new Date(),
  maxMultipartBodyBytes = COURSE_IMPORT_MAX_MULTIPART_BODY_BYTES,
  maxPackageBytes = DEFAULT_SCORM_IMPORT_LIMITS.maxPackageBytes
}: {
  authenticateUser?: CourseImportAuthentication;
  canAccessTeacher?: (user: CourseImportUser) => boolean;
  admitImport?: CourseImportAdmission;
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

    let admission: Response | CourseImportAdmissionLease;
    try {
      admission = await admitImport(request, authenticated.user.id);
    } catch {
      return stableError(
        "COURSE_IMPORT_ADMISSION_UNAVAILABLE",
        "Course import admission is temporarily unavailable.",
        503
      );
    }
    if (admission instanceof Response) return applyPrivateBoundary(admission);

    try {
      if (admission.signal.aborted) {
        return courseImportAborted();
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
          maxPackageBytes,
          signal: admission.signal
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
        const outcome = await importWithinAdmission(
          () => importPackage(multipart.packageBytes, {
            importedAt: now().toISOString(),
            signal: admission.signal
          }),
          admission.signal
        );
        if (outcome.status === "aborted") return courseImportAborted();
        return privateJson({ import: outcome.report });
      } catch (error) {
        if (admission.signal.aborted) return courseImportAborted();
        return courseImportFailure(error);
      }
    } finally {
      admission.release();
    }
  };
}
