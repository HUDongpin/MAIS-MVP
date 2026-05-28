import { NextResponse } from "next/server";
import { getProvisioningBatchCredentialCsvForAdmin } from "@/lib/server/userStore";
import { requireAdmin } from "../../../_shared";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ batchId: string }> }) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const { batchId } = await params;
  const exportFile = await getProvisioningBatchCredentialCsvForAdmin(admin.authenticated.user.id, batchId);
  if (!exportFile) return NextResponse.json({ error: "Provisioning batch not found." }, { status: 404 });

  return new NextResponse(exportFile.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFile.filename}"`
    }
  });
}

