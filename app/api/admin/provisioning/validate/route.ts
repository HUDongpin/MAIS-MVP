import { NextResponse } from "next/server";
import { validateSchoolProvisioning } from "@/lib/server/userStore";
import { readProvisioningRequest, requireAdmin } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const input = await readProvisioningRequest(request);
  if (!input) {
    return NextResponse.json({ error: "Invalid provisioning request body." }, { status: 400 });
  }

  const validation = await validateSchoolProvisioning(input);
  return NextResponse.json({ validation });
}

