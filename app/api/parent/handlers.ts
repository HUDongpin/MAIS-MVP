import { requireParentUser } from "@/lib/server/auth";
import {
  acknowledgeParentNotice,
  getParentChildSummary,
  getParentFoundationData,
  getParentNoticeData,
  getParentReportData,
  linkParentToStudentByInviteCode
} from "@/lib/server/userStore";
import {
  toParentChildSummarySafe,
  toParentFoundationSafeData,
  toParentGuardianLinkSafe,
  toParentNoticeDataSafe,
  toParentReportDataSafe
} from "@/lib/server/userStore/parentSafeDto";
import { consumeInMemoryRateLimit } from "@/lib/server/rateLimit";
import { parentPersistenceUnavailable, parentPrivateJson } from "@/app/api/parent/response";
import type { GuardianRelationship } from "@/types";

type ParentAuthentication = (request: Request) => Promise<{ user: { id: string } } | null>;
const parentLinkRateLimit = { max: 10, windowMs: 60_000 };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function createParentGuardianLinkHandler({
  authenticateParent = requireParentUser,
  consumeRateLimit = consumeInMemoryRateLimit,
  linkParent = linkParentToStudentByInviteCode,
  projectLink = toParentGuardianLinkSafe
}: {
  authenticateParent?: ParentAuthentication;
  consumeRateLimit?: typeof consumeInMemoryRateLimit;
  linkParent?: typeof linkParentToStudentByInviteCode;
  projectLink?: typeof toParentGuardianLinkSafe;
} = {}) {
  return async function parentGuardianLinkPost(request: Request) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });

      const rateLimit = consumeRateLimit(`parent-link:${authenticated.user.id}`, parentLinkRateLimit);
      if (!rateLimit.allowed) {
        return parentPrivateJson(
          { error: "rate-limited" },
          { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return parentPrivateJson({ error: "invalid" }, { status: 400 });
      }
      if (!isRecord(body)) return parentPrivateJson({ error: "invalid" }, { status: 400 });

      const result = await linkParent({
        parentId: authenticated.user.id,
        inviteCode: typeof body.inviteCode === "string" ? body.inviteCode : "",
        relationship: body.relationship as GuardianRelationship
      });
      if (result.status === "linked") return parentPrivateJson({ link: projectLink(result.link) });

      const status = result.status === "forbidden"
        ? 403
        : result.status === "not-found"
          ? 404
          : result.status === "consumed" || result.status === "conflict"
            ? 409
            : result.status === "expired" || result.status === "revoked"
              ? 410
              : 400;
      return parentPrivateJson({ error: result.status }, { status });
    } catch {
      return parentPrivateJson(
        { error: "Guardian access temporarily unavailable." },
        { status: 503 }
      );
    }
  };
}

export function createParentFoundationGetHandler({
  authenticateParent = requireParentUser,
  loadFoundation = getParentFoundationData,
  projectFoundation = toParentFoundationSafeData
}: {
  authenticateParent?: ParentAuthentication;
  loadFoundation?: typeof getParentFoundationData;
  projectFoundation?: typeof toParentFoundationSafeData;
} = {}) {
  return async function parentFoundationGet(request: Request) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });

      const url = new URL(request.url);
      const data = await loadFoundation(authenticated.user.id, url.searchParams.get("studentId"));
      if (!data) return parentPrivateJson({ error: "Parent console unavailable." }, { status: 404 });

      return parentPrivateJson({ data: projectFoundation(data) });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}

type ParentChildSummaryContext = { params: Promise<{ studentId: string }> };

export function createParentChildSummaryGetHandler({
  authenticateParent = requireParentUser,
  loadChildSummary = getParentChildSummary,
  projectChildSummary = toParentChildSummarySafe
}: {
  authenticateParent?: ParentAuthentication;
  loadChildSummary?: typeof getParentChildSummary;
  projectChildSummary?: typeof toParentChildSummarySafe;
} = {}) {
  return async function parentChildSummaryGet(request: Request, { params }: ParentChildSummaryContext) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });

      const { studentId } = await params;
      const summary = await loadChildSummary(authenticated.user.id, studentId);
      if (!summary) return parentPrivateJson({ error: "Child summary unavailable." }, { status: 404 });

      return parentPrivateJson({ summary: projectChildSummary(summary) });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}

export function createParentReportsGetHandler({
  authenticateParent = requireParentUser,
  loadReports = getParentReportData,
  projectReports = toParentReportDataSafe
}: {
  authenticateParent?: ParentAuthentication;
  loadReports?: typeof getParentReportData;
  projectReports?: typeof toParentReportDataSafe;
} = {}) {
  return async function parentReportsGet(request: Request) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });

      const url = new URL(request.url);
      const data = await loadReports(authenticated.user.id, url.searchParams.get("studentId"));
      if (!data) return parentPrivateJson({ error: "Reports unavailable." }, { status: 404 });

      return parentPrivateJson({ data: projectReports(data) });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}

export function createParentNoticesGetHandler({
  authenticateParent = requireParentUser,
  loadNotices = getParentNoticeData,
  projectNotices = toParentNoticeDataSafe
}: {
  authenticateParent?: ParentAuthentication;
  loadNotices?: typeof getParentNoticeData;
  projectNotices?: typeof toParentNoticeDataSafe;
} = {}) {
  return async function parentNoticesGet(request: Request) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });

      const url = new URL(request.url);
      const data = await loadNotices(authenticated.user.id, {
        selectedStudentId: url.searchParams.get("studentId"),
        recipientId: url.searchParams.get("recipientId")
      });
      if (!data) return parentPrivateJson({ error: "Parent notices unavailable." }, { status: 404 });

      return parentPrivateJson({ data: projectNotices(data) });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}

type ParentNoticeAckContext = { params: Promise<{ recipientId: string }> };

export function createParentNoticeAckHandler({
  authenticateParent = requireParentUser,
  acknowledgeNotice = acknowledgeParentNotice
}: {
  authenticateParent?: ParentAuthentication;
  acknowledgeNotice?: typeof acknowledgeParentNotice;
} = {}) {
  return async function parentNoticeAck(request: Request, { params }: ParentNoticeAckContext) {
    try {
      const authenticated = await authenticateParent(request);
      if (!authenticated) return parentPrivateJson({ error: "Parent access required." }, { status: 403 });

      const { recipientId } = await params;
      const result = await acknowledgeNotice({
        parentId: authenticated.user.id,
        recipientId: decodeURIComponent(recipientId)
      });

      if (result.status !== "acknowledged") {
        const status = result.status === "forbidden" ? 403 : result.status === "not-found" ? 404 : 400;
        return parentPrivateJson({ error: result.status }, { status });
      }

      return parentPrivateJson({ receipt: result.receipt });
    } catch {
      return parentPersistenceUnavailable();
    }
  };
}
