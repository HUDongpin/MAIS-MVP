import { mediaStoreRoot, mediaOwnerHash, readMediaOwnerErasure } from "@/lib/server/mediaOwnerErasure";
import { NextResponse } from "next/server";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { deleteUserAccount, exportUserAccountData, withAuthenticatedMutation } from "@/lib/server/userStore";
import { learnerAuthorityFailureResponse } from "@/lib/server/learnerAuthorityState";
import { requireAdmin } from "../../provisioning/_shared";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };

async function studentExport(userId: string) {
  const data = await exportUserAccountData(userId);
  if (!data) return { status: "not-found" as const };
  const user = (data.tables.users as Array<{ role?: unknown }> | undefined)?.[0];
  if (user?.role !== "student") return { status: "not-student" as const };
  return { status: "ok" as const, data };
}

/** Admin-assisted export after the operator verifies a guardian request. */
export async function GET(request: Request, context: RouteContext) {
  return withAuthRouteJsonBoundary("admin-student-export", async () => {
    const admin = await requireAdmin(request);
    if ("response" in admin) {
      return admin.response ?? NextResponse.json({ error: "Admin role required." }, { status: 403 });
    }

    const { userId } = await context.params;
    if (!userId?.trim()) return NextResponse.json({ error: "Student account id is required." }, { status: 400 });
    const result = await studentExport(userId);
    if (result.status === "not-found") return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (result.status === "not-student") return NextResponse.json({ error: "Student account required." }, { status: 403 });

    return new NextResponse(JSON.stringify(result.data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mais-student-data-export.json"',
        "Cache-Control": "no-store"
      }
    });
  });
}

/** Admin-assisted erasure. The operator must verify authority outside this API. */
export async function DELETE(request: Request, context: RouteContext) {
  return withAuthRouteJsonBoundary("admin-student-delete", async () => {
    const admin = await requireAdmin(request);
    if ("response" in admin) {
      return admin.response ?? NextResponse.json({ error: "Admin role required." }, { status: 403 });
    }

    const { userId } = await context.params;
    if (!userId?.trim()) return NextResponse.json({ error: "Student account id is required." }, { status: 400 });

    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || body.confirm !== "DELETE" || body.userId !== userId) {
      return NextResponse.json({
        code: "confirmation-required",
        error: 'Send {"confirm":"DELETE","userId":"<student-id>"} to confirm the exact account.'
      }, { status: 400 });
    }

    const subject = await studentExport(userId);
    if (subject.status === "not-found") {
      // A self-deleted account of any role can need physical cleanup. This
      // branch cannot authorize deletion of an account that is still live.
      const marker = await readMediaOwnerErasure(mediaStoreRoot(), mediaOwnerHash(userId));
      if (!marker) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (subject.status === "not-student") return NextResponse.json({ error: "Student account required." }, { status: 403 });

    const generation = subject.status === "ok"
      ? (subject.data.tables["learner_authority.accounts"]?.[0] as { generation?: string } | undefined)?.generation : undefined;
    const result = await withAuthenticatedMutation(admin.authenticated, () => deleteUserAccount(userId, subject.status === "not-found"
      ? { requireDeletedAccount: true }
      : { requiredRole: "student", expectedGeneration: generation })).catch(learnerAuthorityFailureResponse);
    if (result instanceof Response) return new NextResponse(result.body, { status: result.status, headers: result.headers });
    if (result.status === "not-found") return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (result.status === "blocked") {
      return NextResponse.json({ code: "deletion-blocked", blockers: result.blockers }, { status: 409 });
    }
    const pending = result.mediaPurge.status === "pending";
    return NextResponse.json({
      ok: !pending, accountDeleted: true, mediaPurgePending: pending,
      ...(pending ? { code: "account-media-erasure-pending", error: "Account deleted; physical media erasure is incomplete. Retry the exact deleted account after resolving the reported cleanup condition." } : {}),
      deletedAt: new Date().toISOString(), recordsRemoved: result.summary.totalRemoved
    }, { status: pending ? 503 : 200 });
  });
}
