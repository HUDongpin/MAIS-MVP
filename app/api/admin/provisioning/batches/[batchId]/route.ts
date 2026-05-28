import { NextResponse } from "next/server";
import { getProvisioningBatchForAdmin } from "@/lib/server/userStore";
import { requireAdmin } from "../../_shared";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const { batchId } = await params;
  const batch = await getProvisioningBatchForAdmin(admin.authenticated.user.id, batchId);
  if (!batch) return NextResponse.json({ error: "Provisioning batch not found." }, { status: 404 });

  return NextResponse.json({ batch });
}

