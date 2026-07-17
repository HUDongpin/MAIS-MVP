import type { ReactNode } from "react";
import { TeacherShell } from "@/components/teacher/TeacherShell";
import { getTeacherShellForLayout } from "./getTeacherFoundation";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: ReactNode }) {
  const foundation = await getTeacherShellForLayout();

  return (
    <TeacherShell user={foundation.teacher} classes={foundation.classes}>
      {children}
    </TeacherShell>
  );
}
