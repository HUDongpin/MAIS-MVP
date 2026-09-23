import type { SchoolProvisioningAuthorizationInput } from "@/types";

type ParseResult =
  | { status: "ok"; authorization: SchoolProvisioningAuthorizationInput }
  | { status: "invalid"; reason: string };

export function parseSchoolProvisioningAuthorization(
  value: unknown,
  schoolCode: string,
  academicYear: string,
  recordedAt: string
): ParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { status: "invalid", reason: "School permission must be recorded before student batch creation." };
  }
  const record = value as Record<string, unknown>;
  if (record.confirmed !== true) {
    return { status: "invalid", reason: "An administrator must confirm that school permission was obtained." };
  }
  const authorizedCode = typeof record.schoolCode === "string" ? record.schoolCode.trim().toUpperCase() : "";
  const authorizedYear = typeof record.academicYear === "string" ? record.academicYear.trim() : "";
  if (!schoolCode || authorizedCode !== schoolCode || authorizedYear !== academicYear) {
    return { status: "invalid", reason: "School permission must match this school code and academic year." };
  }
  const approvedByName = typeof record.approvedByName === "string" ? record.approvedByName.trim() : "";
  const evidenceReference = typeof record.evidenceReference === "string" ? record.evidenceReference.trim() : "";
  if (!approvedByName || approvedByName.length > 120 || !evidenceReference || evidenceReference.length > 200) {
    return { status: "invalid", reason: "School permission needs an approver name and evidence reference." };
  }
  const approvedAt = typeof record.approvedAt === "string" ? record.approvedAt.trim() : "";
  const parsedDate = new Date(approvedAt);
  if (!approvedAt || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString() !== approvedAt || approvedAt > recordedAt) {
    return { status: "invalid", reason: "School permission needs a valid past UTC approval time." };
  }
  return {
    status: "ok",
    authorization: {
      confirmed: true,
      schoolCode,
      academicYear,
      approvedByName,
      approvedAt,
      evidenceReference
    }
  };
}
