"use client";

import { useRouter } from "next/navigation";
import { useSettings } from "@/components/providers/AppProviders";
import { statusChipClass, rateStatus, zoneEyebrowClass } from "@/components/teacher/teacherZones";
import { formatGradeLabel } from "@/lib/i18n";
import { cn, formatDateInHongKong } from "@/lib/utils";
import type { TeacherClass, TeacherGradebookCell, TeacherGradebookColumn, TeacherGradebookData } from "@/types";

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.05]">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function formatPercent(value: number | null): string {
  return value === null ? "--" : `${value}%`;
}

function GradebookCell({ cell }: { cell: TeacherGradebookCell }) {
  const { t } = useSettings();
  if (cell.state === "graded" && cell.percentage !== null) {
    return (
      <div className={cn("mx-auto inline-flex min-w-[3.25rem] flex-col items-center rounded-lg border px-2 py-1", statusChipClass[rateStatus(cell.percentage)])}>
        <span className="text-sm font-black leading-none">{cell.percentage}%</span>
        <span className="mt-0.5 text-[10px] font-semibold opacity-70">{cell.score}/{cell.maxScore}</span>
      </div>
    );
  }
  if (cell.state === "pending") {
    return <span className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">{t({ en: "Pending", zh: "待批", zhHans: "待批" })}</span>;
  }
  return <span className="text-slate-300 dark:text-slate-600" aria-label={t({ en: "No submission", zh: "未提交", zhHans: "未提交" })}>—</span>;
}

function ColumnHeader({ column }: { column: TeacherGradebookColumn }) {
  const { text, t, language } = useSettings();
  const kindLabel = column.kind === "assignment" ? t({ en: "Assignment", zh: "作業", zhHans: "作业" }) : t({ en: "Assessment", zh: "測驗", zhHans: "测验" });
  return (
    <th className="min-w-[7.5rem] px-2 py-3 align-bottom text-center font-semibold">
      <div className="flex flex-col items-center gap-1">
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
          column.kind === "assignment"
            ? "bg-indigo-500/12 text-indigo-700 dark:bg-indigo-300/15 dark:text-indigo-200"
            : "bg-cyan-500/12 text-cyan-700 dark:bg-cyan-300/15 dark:text-cyan-200"
        )}>{kindLabel}</span>
        <span className="line-clamp-2 text-xs font-black text-slate-800 dark:text-slate-100" title={text(column.title)}>{text(column.title)}</span>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          {t({ en: "max", zh: "滿分", zhHans: "满分" })} {column.maxScore}
          {!column.countsTowardsGrade ? ` · ${t({ en: "not graded", zh: "不計分", zhHans: "不计分" })}` : ""}
        </span>
        {column.dueAt ? <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{formatDateInHongKong(column.dueAt, language, { month: "short", day: "numeric" })}</span> : null}
      </div>
    </th>
  );
}

export function TeacherGradebookView({
  data,
  classes,
  activeClassId
}: {
  data: TeacherGradebookData | null;
  classes: TeacherClass[];
  activeClassId: string;
}) {
  const { language, t } = useSettings();
  const router = useRouter();

  const hasClasses = classes.length > 0;
  const columns = data?.columns ?? [];
  const students = data?.students ?? [];
  const hasGrid = columns.length > 0 && students.length > 0;

  return (
    <div className="grid gap-6">
      <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={cn("text-sm font-black uppercase tracking-[0.24em]", zoneEyebrowClass.students)}>{t({ en: "Students & data", zh: "學生與數據", zhHans: "学生与数据" })}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Gradebook", zh: "成績冊", zhHans: "成绩册" })}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t({ en: "Every student's scores across all graded work in one grid.", zh: "在同一個表格檢視每位學生所有計分項目的成績。", zhHans: "在同一个表格检视每位学生所有计分项目的成绩。" })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {hasClasses ? (
              <label className="grid gap-1">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Class", zh: "班級", zhHans: "班级" })}</span>
                <select
                  value={activeClassId}
                  onChange={(event) => router.push(`/teacher/gradebook?classId=${encodeURIComponent(event.target.value)}`)}
                  className="focus-ring rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 dark:border-white/15 dark:bg-slate-900 dark:text-white"
                >
                  {classes.map((teacherClass) => (
                    <option key={teacherClass.id} value={teacherClass.id}>
                      {teacherClass.name} · {formatGradeLabel(teacherClass.grade, language, true)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <a
              href={`/api/teacher/gradebook/export?classId=${encodeURIComponent(activeClassId)}`}
              className={cn(
                "focus-ring self-end rounded-full px-5 py-2.5 text-sm font-black",
                hasGrid ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "pointer-events-none bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-500"
              )}
              aria-disabled={!hasGrid}
            >
              {t({ en: "Export CSV", zh: "匯出 CSV", zhHans: "汇出 CSV" })}
            </a>
          </div>
        </div>
        {data ? (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <StatCard label={t({ en: "Class average", zh: "全班平均", zhHans: "全班平均" })} value={formatPercent(data.classAverage)} detail={t({ en: "Grade-counting work", zh: "計分項目", zhHans: "计分项目" })} />
            <StatCard label={t({ en: "Students", zh: "學生", zhHans: "学生" })} value={String(students.length)} detail={t({ en: "Enrolled", zh: "已入班", zhHans: "已入班" })} />
            <StatCard label={t({ en: "Graded items", zh: "計分項目", zhHans: "计分项目" })} value={String(columns.length)} detail={t({ en: "Assignments and assessments", zh: "作業與測驗", zhHans: "作业与测验" })} />
          </div>
        ) : null}
      </section>

      <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        {!hasClasses ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t({ en: "Create a class and add students to start building a gradebook.", zh: "先建立班級並加入學生，即可開始使用成績冊。", zhHans: "先建立班级并加入学生，即可开始使用成绩册。" })}
          </p>
        ) : students.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t({ en: "No students are enrolled in this class yet.", zh: "此班級尚未有學生。", zhHans: "此班级尚未有学生。" })}
          </p>
        ) : columns.length === 0 ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t({ en: "No graded work yet. Assign homework or an assessment to this class to populate the grid.", zh: "尚未有計分項目。為此班級派發作業或測驗後即會顯示。", zhHans: "尚未有计分项目。为此班级派发作业或测验后即会显示。" })}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="sticky left-0 z-10 min-w-[10rem] bg-white px-3 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    {t({ en: "Student", zh: "學生", zhHans: "学生" })}
                  </th>
                  {columns.map((column) => <ColumnHeader key={column.id} column={column} />)}
                  <th className="min-w-[5.5rem] px-2 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    {t({ en: "Average", zh: "平均", zhHans: "平均" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.studentId} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className="sticky left-0 z-10 max-w-[14rem] truncate bg-white px-3 py-3 font-bold text-slate-900 dark:bg-slate-950 dark:text-white" title={student.studentName}>
                      {student.studentName}
                    </td>
                    {student.cells.map((cell) => (
                      <td key={cell.columnId} className="px-2 py-3 text-center">
                        <GradebookCell cell={cell} />
                      </td>
                    ))}
                    <td className="px-2 py-3 text-center">
                      <span className="text-sm font-black text-slate-900 dark:text-white">{formatPercent(student.average)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-white/10">
                  <td className="sticky left-0 z-10 bg-white px-3 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    {t({ en: "Class avg", zh: "全班平均", zhHans: "全班平均" })}
                  </td>
                  {columns.map((column) => (
                    <td key={column.id} className="px-2 py-3 text-center text-sm font-black text-slate-700 dark:text-slate-200">
                      {formatPercent(column.average)}
                    </td>
                  ))}
                  <td className="px-2 py-3 text-center text-sm font-black text-slate-900 dark:text-white">{formatPercent(data?.classAverage ?? null)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
