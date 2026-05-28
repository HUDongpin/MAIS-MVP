import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import type { ProvisioningRequest } from "@/types";

export async function requireAdmin(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return { response: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }

  if (authenticated.user.role !== "admin") {
    return { response: NextResponse.json({ error: "Admin role required." }, { status: 403 }) };
  }

  return { authenticated };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fileText(value: FormDataEntryValue | null) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.text();
}

export async function readProvisioningRequest(request: Request): Promise<ProvisioningRequest | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const schoolRaw = form.get("school");
    let school: unknown = {
      name: form.get("schoolName"),
      code: form.get("schoolCode"),
      academicYear: form.get("academicYear"),
      contactName: form.get("contactName"),
      contactEmail: form.get("contactEmail")
    };
    if (typeof schoolRaw === "string" && schoolRaw.trim()) {
      try {
        school = JSON.parse(schoolRaw) as unknown;
      } catch {
        return null;
      }
    } else {
      school = {
          name: form.get("schoolName"),
          code: form.get("schoolCode"),
          academicYear: form.get("academicYear"),
          contactName: form.get("contactName"),
          contactEmail: form.get("contactEmail")
      };
    }

    if (!isRecord(school)) return null;

    return {
      school: {
        name: typeof school.name === "string" ? school.name : "",
        code: typeof school.code === "string" ? school.code : "",
        academicYear: typeof school.academicYear === "string" ? school.academicYear : "",
        contactName: typeof school.contactName === "string" ? school.contactName : undefined,
        contactEmail: typeof school.contactEmail === "string" ? school.contactEmail : undefined
      },
      classesCsv: await fileText(form.get("classes") ?? form.get("classesCsv")),
      teachersCsv: await fileText(form.get("teachers") ?? form.get("teachersCsv")),
      studentsCsv: await fileText(form.get("students") ?? form.get("studentsCsv"))
    };
  }

  const body = await request.json().catch(() => null) as unknown;
  if (!isRecord(body) || !isRecord(body.school)) return null;
  return body as ProvisioningRequest;
}
