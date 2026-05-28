import { NextResponse } from "next/server";
import { createSchoolProvisioningBatch } from "@/lib/server/userStore";
import { readProvisioningRequest, requireAdmin } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("response" in admin) return admin.response;

  const input = await readProvisioningRequest(request);
  if (!input) {
    return NextResponse.json({ error: "Invalid provisioning request body." }, { status: 400 });
  }

  const result = await createSchoolProvisioningBatch(admin.authenticated.user.id, input);
  if (result.status === "forbidden") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }
  if (result.status === "invalid") {
    return NextResponse.json({ error: "Provisioning validation failed.", validation: result.validation }, { status: 400 });
  }

  return NextResponse.json({ batch: result.batch }, { status: 201 });
}

