import { NextResponse } from "next/server";
import { withAuthRouteJsonBoundary } from "@/lib/server/authRouteGuards";
import { deleteUserAccount, exportUserAccountData } from "@/lib/server/userStore";
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
    if (subject.status === "not-found") return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (subject.status === "not-student") return NextResponse.json({ error: "Student account required." }, { status: 403 });

    const result = await deleteUserAccount(userId);
    if (result.status === "not-found") return NextResponse.json({ error: "Account not found." }, { status: 404 });
    if (result.status === "blocked") {
      return NextResponse.json({ code: "deletion-blocked", blockers: result.blockers }, { status: 409 });
    }
    return NextResponse.json({ ok: true, deletedAt: new Date().toISOString(), recordsRemoved: result.summary.totalRemoved });
  });
}
