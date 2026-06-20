import { redirect } from "next/navigation";

const operationPathByLegacyTab: Record<string, string> = {
  notices: "notices",
  reminders: "reminders",
  roster: "roster",
  collaboration: "collaboration",
  archive: "term-archives"
};

export default async function TeacherOperationsPage({ searchParams }: { searchParams: Promise<{ classId?: string; tab?: string }> }) {
  const params = await searchParams;
  const segment = params.tab ? operationPathByLegacyTab[params.tab] : "notices";
  const nextParams = new URLSearchParams();
  if (params.classId) nextParams.set("classId", params.classId);

  redirect(`/teacher/operations/${segment ?? "notices"}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
}
