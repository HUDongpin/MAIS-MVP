import { NextResponse } from "next/server";
import {
  expectedUserConstraintsFromRequest,
  guardExpectedAuthenticatedUser,
  requireAuthenticatedUser
} from "@/lib/server/auth";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";
import {
  issueGuardianInvitationForTeacher,
  revokeGuardianLinkForTeacher
} from "@/lib/server/userStore";

type TeacherAuthentication = (
  request: Request
) => Promise<{ user: { id: string; role: string } } | null>;

const guardianIssueRateLimit = { max: 6, windowMs: 60_000 };
const guardianRevokeRateLimit = { max: 12, windowMs: 60_000 };

function teacherPrivateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("CDN-Cache-Control", "private, no-store");
  response.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
  return response;
}

function guardianUnavailable() {
  return teacherPrivateJson(
    { error: "Guardian access temporarily unavailable." },
    { status: 503 }
  );
}

function teacherGuardianStatus(status: string) {
  if (status === "forbidden") return 403;
  if (status === "class-not-found" || status === "student-not-found" || status === "link-not-found") return 404;
  if (status === "conflict") return 409;
  return 400;
}

function safeDecodedIdentifier(value: unknown) {
  if (typeof value !== "string" || !value || value.length > 256) return null;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded || decoded.length > 256 || /[\u0000-\u001f\u007f]/.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

type InviteContext = { params: Promise<{ classId: string; studentId: string }> };

export function createTeacherGuardianInviteIssueHandler({
  authenticateUser = requireAuthenticatedUser,
  consumeRateLimit = consumeInMemoryRateLimit,
  issueInvitation = issueGuardianInvitationForTeacher
}: {
  authenticateUser?: TeacherAuthentication;
  consumeRateLimit?: typeof consumeInMemoryRateLimit;
  issueInvitation?: typeof issueGuardianInvitationForTeacher;
} = {}) {
  return async function teacherGuardianInviteIssue(request: Request, { params }: InviteContext) {
    try {
      const authenticated = await authenticateUser(request);
      if (!authenticated) return teacherPrivateJson({ error: "Not authenticated." }, { status: 401 });
      if (authenticated.user.role !== "teacher") {
        return teacherPrivateJson({ error: "Teacher access required." }, { status: 403 });
      }
      const expectedUserConflict = guardExpectedAuthenticatedUser(
        authenticated,
        expectedUserConstraintsFromRequest(request),
        { requireConstraint: true }
      );
      if (expectedUserConflict) {
        expectedUserConflict.headers.set("CDN-Cache-Control", "private, no-store");
        expectedUserConflict.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
        return expectedUserConflict;
      }

      const raw = await params;
      const classId = safeDecodedIdentifier(raw.classId);
      const studentId = safeDecodedIdentifier(raw.studentId);
      if (!classId || !studentId) return teacherPrivateJson({ error: "invalid" }, { status: 400 });

      const rateLimit = consumeRateLimit(
        `teacher-guardian:issue:${authenticated.user.id}:${classId}:${studentId}`,
        guardianIssueRateLimit
      );
      if (!rateLimit.allowed) {
        return teacherPrivateJson(
          { error: "rate-limited" },
          { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
      }

      const result = await issueInvitation({
        teacherId: authenticated.user.id,
        classId,
        studentId
      });
      if (result.status !== "issued") {
        return teacherPrivateJson({ error: result.status }, { status: teacherGuardianStatus(result.status) });
      }

      return teacherPrivateJson({
        invitation: {
          version: result.invitation.version,
          token: result.invitation.token,
          expiresAt: result.invitation.expiresAt
        }
      }, { status: 201 });
    } catch {
      return guardianUnavailable();
    }
  };
}

type RevokeContext = { params: Promise<{ classId: string; studentId: string; linkId: string }> };

export function createTeacherGuardianLinkRevokeHandler({
  authenticateUser = requireAuthenticatedUser,
  consumeRateLimit = consumeInMemoryRateLimit,
  revokeLink = revokeGuardianLinkForTeacher
}: {
  authenticateUser?: TeacherAuthentication;
  consumeRateLimit?: typeof consumeInMemoryRateLimit;
  revokeLink?: typeof revokeGuardianLinkForTeacher;
} = {}) {
  return async function teacherGuardianLinkRevoke(request: Request, { params }: RevokeContext) {
    try {
      const authenticated = await authenticateUser(request);
      if (!authenticated) return teacherPrivateJson({ error: "Not authenticated." }, { status: 401 });
      if (authenticated.user.role !== "teacher") {
        return teacherPrivateJson({ error: "Teacher access required." }, { status: 403 });
      }
      const expectedUserConflict = guardExpectedAuthenticatedUser(
        authenticated,
        expectedUserConstraintsFromRequest(request),
        { requireConstraint: true }
      );
      if (expectedUserConflict) {
        expectedUserConflict.headers.set("CDN-Cache-Control", "private, no-store");
        expectedUserConflict.headers.set("Vercel-CDN-Cache-Control", "private, no-store");
        return expectedUserConflict;
      }

      const raw = await params;
      const classId = safeDecodedIdentifier(raw.classId);
      const studentId = safeDecodedIdentifier(raw.studentId);
      const linkId = safeDecodedIdentifier(raw.linkId);
      if (!classId || !studentId || !linkId) return teacherPrivateJson({ error: "invalid" }, { status: 400 });

      const rateLimit = consumeRateLimit(
        `teacher-guardian:revoke:${authenticated.user.id}:${classId}:${studentId}:${linkId}`,
        guardianRevokeRateLimit
      );
      if (!rateLimit.allowed) {
        return teacherPrivateJson(
          { error: "rate-limited" },
          { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
      }

      const result = await revokeLink({
        teacherId: authenticated.user.id,
        classId,
        studentId,
        linkId
      });
      if (result.status !== "revoked") {
        return teacherPrivateJson({ error: result.status }, { status: teacherGuardianStatus(result.status) });
      }
      return teacherPrivateJson({
        revokedAt: result.revokedAt,
        invitation: {
          version: result.invitation.version,
          token: result.invitation.token,
          expiresAt: result.invitation.expiresAt
        }
      });
    } catch {
      return guardianUnavailable();
    }
  };
}
