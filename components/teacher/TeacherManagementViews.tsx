"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  assessmentTypeLabels,
  assignmentContentTypeLabels,
  submissionStatusLabels,
  teacherMessageStatusLabels
} from "@/components/teacher/teacherLabels";
import { gradeIds } from "@/data/grades";
import { formatGradeLabel, localeForLanguage, textForLanguage } from "@/lib/i18n";
import type {
  Assignment,
  AssignmentContentType,
  Assessment,
  GradeId,
  Language,
  StudentAssignmentItem,
  Submission,
  TeacherAssignmentDetailData,
  TeacherClass,
  TeacherClassDetailData,
  TeacherClassStudentSummary,
  TeacherInboxData,
  TeacherInboxThread,
  TeacherStudentProfileData,
  TeacherStudentRiskTag,
  TeachingResource
} from "@/types";

const grades = gradeIds;
const contentTypes: AssignmentContentType[] = ["lesson", "practice", "visualization", "resource", "assessment"];

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return textForLanguage({ en: "No record", zh: "未有紀錄" }, language);
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function percent(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function riskLabel(tag: TeacherStudentRiskTag) {
  const labels: Record<TeacherStudentRiskTag, { en: string; zh: string }> = {
    "low-mastery": { en: "Low mastery", zh: "低掌握" },
    "repeated-mistakes": { en: "Repeated errors", zh: "連續錯題" },
    inactive: { en: "Inactive", zh: "低活躍" },
    "high-ai-tutor": { en: "AI help spike", zh: "AI 求助偏高" },
    "late-work": { en: "Late work", zh: "遲交" }
  };
  return labels[tag];
}

function statusTone(status: string) {
  if (status === "graded" || status === "resolved") return "border-emerald-300/55 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (status === "late" || status === "unread") return "border-rose-300/60 bg-rose-400/12 text-rose-800 dark:text-rose-100";
  if (status === "submitted" || status === "open" || status === "active") return "border-cyan-300/55 bg-cyan-400/12 text-cyan-800 dark:text-cyan-100";
  return "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
}

function StatusPill({ value, label }: { value: string; label: string }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusTone(value)}`}>{label}</span>;
}

function isDataDeletionRequestThread(thread: Pick<TeacherInboxThread, "subject">) {
  return [thread.subject.en, thread.subject.zh].some((value) => value.trim().toLowerCase() === "data deletion request" || value.trim() === "數據刪除申請");
}

function parentCategoryLabel(category: NonNullable<TeacherInboxThread["parentCategory"]>) {
  const labels: Record<NonNullable<TeacherInboxThread["parentCategory"]>, { en: string; zh: string }> = {
    "learning-support": { en: "Learning support", zh: "學習支援" },
    homework: { en: "Homework", zh: "家課 / 作業" },
    wellbeing: { en: "Wellbeing", zh: "身心狀態" },
    "report-question": { en: "Report question", zh: "報告查詢" },
    logistics: { en: "Logistics", zh: "行政安排" }
  };
  return labels[category];
}

function StudentRiskTags({ student }: { student: TeacherClassStudentSummary }) {
  const { text, t } = useSettings();
  if (!student.riskTags.length) {
    return <span className="rounded-full border border-emerald-300/50 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-700 dark:text-emerald-100">{t({ en: "On track", zh: "穩定" })}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {student.riskTags.map((tag) => (
        <span key={tag} className="rounded-full border border-amber-300/55 bg-amber-400/12 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-100">
          {text(riskLabel(tag))}
        </span>
      ))}
    </div>
  );
}

export function TeacherClassesManager({ classes }: { classes: TeacherClass[] }) {
  const router = useRouter();
  const { language, t, text } = useSettings();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        grade: form.get("grade"),
        academicYear: form.get("academicYear"),
        description: form.get("description")
      })
    });
    setIsSaving(false);
    if (!response.ok) {
      setError(t({ en: "Could not create the class yet.", zh: "暫時未能建立班級。" }));
      return;
    }
    formElement.reset();
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Classes", zh: "班級" })}</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Class and student management", zh: "班級與學生管理" })}</h1>
        <form onSubmit={handleCreate} className="mt-6 grid gap-4 lg:grid-cols-[minmax(160px,1.2fr)_120px_150px_minmax(180px,1fr)_auto] lg:items-end">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Class name", zh: "班級名稱" })}</span>
            <input name="name" required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Grade", zh: "年級" })}</span>
            <select name="grade" defaultValue="S3" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              {grades.map((grade) => <option key={grade} value={grade}>{formatGradeLabel(grade, language, true)}</option>)}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Academic year", zh: "學年" })}</span>
            <input name="academicYear" required defaultValue="2025-2026" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Notes", zh: "備註" })}</span>
            <input name="description" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          </label>
          <button disabled={isSaving} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950" type="submit">
            {isSaving ? t({ en: "Creating", zh: "建立中" }) : t({ en: "Create", zh: "建立" })}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {classes.map((teacherClass) => (
          <Link href={`/teacher/classes/${teacherClass.id}`} key={teacherClass.id} className="focus-ring glass-panel block p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-950 dark:text-white">{teacherClass.name}</p>
                <p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">{formatGradeLabel(teacherClass.grade, language, true)} · {teacherClass.academicYear}</p>
              </div>
              <span className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-black dark:border-white/10 dark:bg-white/[0.07]">
                {teacherClass.studentCount} {t({ en: "students", zh: "學生" })}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(teacherClass.description)}</p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Invite", zh: "邀請碼" })}: {teacherClass.inviteCode}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

export function TeacherClassDetailView({ detail }: { detail: TeacherClassDetailData }) {
  const router = useRouter();
  const { language, t } = useSettings();
  const [message, setMessage] = useState("");

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(detail.class.id)}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username") })
    });
    if (!response.ok) {
      setMessage(t({ en: "Could not add that student. Check the username and class membership.", zh: "未能加入該學生，請檢查用戶名稱或是否已在班內。" }));
      return;
    }
    formElement.reset();
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <Link href="/teacher/classes" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to classes", zh: "返回班級" })}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{formatGradeLabel(detail.class.grade, language, true)}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{detail.class.name}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{detail.class.academicYear} · {detail.class.studentCount} {t({ en: "students", zh: "學生" })}</p>
          </div>
          <div className="rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">{t({ en: "Invite code", zh: "邀請碼" })}</p>
            <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{detail.class.inviteCode}</p>
          </div>
        </div>
        <form onSubmit={handleAdd} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input name="username" required placeholder={t({ en: "Student username, e.g. HK Student Peter", zh: "學生用戶名稱，例如 HK Student Peter" })} className="focus-ring min-h-11 flex-1 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <button className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Add student", zh: "加入學生" })}</button>
        </form>
        {message ? <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-100">{message}</p> : null}
      </section>

      <section className="glass-panel overflow-hidden p-5 sm:p-6">
        <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Student roster", zh: "學生名單" })}</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">{t({ en: "Student", zh: "學生" })}</th>
                <th className="py-3 pr-4">{t({ en: "Recent activity", zh: "最近活躍" })}</th>
                <th className="py-3 pr-4">{t({ en: "Avg mastery", zh: "平均掌握" })}</th>
                <th className="py-3 pr-4">{t({ en: "Assignment completion", zh: "作業完成" })}</th>
                <th className="py-3">{t({ en: "Risk tags", zh: "風險標籤" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
              {detail.students.map((student) => (
                <tr key={student.studentId}>
                  <td className="py-4 pr-4">
                    <Link href={student.href} className="font-black text-cyan-700 dark:text-cyan-200">{student.studentName}</Link>
                    <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{formatGradeLabel(student.grade, language, true)}</p>
                  </td>
                  <td className="py-4 pr-4 font-semibold">{formatDate(student.recentActivityAt, language)}</td>
                  <td className="py-4 pr-4 font-black">{percent(student.averageMastery)}</td>
                  <td className="py-4 pr-4 font-black">{percent(student.assignmentCompletionRate)}</td>
                  <td className="py-4"><StudentRiskTags student={student} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function TeacherStudentProfileView({ profile }: { profile: TeacherStudentProfileData }) {
  const { language, text, t } = useSettings();

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <Link href="/teacher/classes" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to classes", zh: "返回班級" })}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{formatGradeLabel(profile.student.grade, language, true)}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{profile.student.name}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{profile.classes.map((item) => item.name).join(", ")}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="soft-panel px-4 py-3"><p className="text-2xl font-black gradient-text">{percent(profile.averageMastery)}</p><p className="text-xs font-bold">{t({ en: "Mastery", zh: "掌握" })}</p></div>
            <div className="soft-panel px-4 py-3"><p className="text-2xl font-black gradient-text">{profile.mistakes.filter((item) => !item.mastered).length}</p><p className="text-xs font-bold">{t({ en: "Active mistakes", zh: "錯題" })}</p></div>
            <div className="soft-panel px-4 py-3"><p className="text-2xl font-black gradient-text">{profile.aiTutor.messageCount7d}</p><p className="text-xs font-bold">{t({ en: "AI 7d", zh: "AI 7日" })}</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6">
          <div className="glass-panel p-5">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Progress", zh: "進度" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.progress.slice(0, 8).map((topic) => (
                <div key={topic.topicId}>
                  <div className="flex justify-between gap-3 text-sm font-bold"><span>{text(topic.title)}</span><span>{percent(topic.mastery)}</span></div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-white/10"><div className="h-2 rounded-full bg-cyan-400" style={{ width: percent(topic.mastery) }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Assignments", zh: "作業紀錄" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.assignments.map(({ assignment, submission }) => {
                const submissionStatus = submission?.status ?? "not-started";
                return (
                  <Link href={`/teacher/assignments/${assignment.id}`} key={assignment.id} className="soft-panel block p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <p className="font-black text-slate-950 dark:text-white">{text(assignment.title)}</p>
                      <StatusPill value={submissionStatus} label={text(submissionStatusLabels[submissionStatus])} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{submission?.score === null || submission?.score === undefined ? t({ en: "No score yet", zh: "暫無分數" }) : `${submission.score}%`}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Mistakes", zh: "錯題" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.mistakes.slice(0, 4).map((mistake) => (
                <div key={mistake.questionId} className="soft-panel p-3">
                  <p className="text-sm font-black text-slate-950 dark:text-white">{text(mistake.question.topic)}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{mistake.wrongAttempts} {t({ en: "wrong attempts", zh: "次錯誤" })}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Recent attempts", zh: "最近練習" })}</h2>
            <div className="mt-4 grid gap-3">
              {profile.recentAttempts.map((attempt) => (
                <div key={attempt.id} className="soft-panel p-3">
                  <p className="text-sm font-black">{text(attempt.topic)}</p>
                  <p className={attempt.isCorrect ? "text-xs font-bold text-emerald-600 dark:text-emerald-200" : "text-xs font-bold text-rose-600 dark:text-rose-200"}>{attempt.isCorrect ? t({ en: "Correct", zh: "正確" }) : t({ en: "Wrong", zh: "錯誤" })}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Messages and AI Tutor", zh: "私信與 AI Tutor" })}</h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{profile.messages.length} {t({ en: "teacher message threads", zh: "個教師私信串" })}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t({ en: "Last AI message", zh: "最近 AI 訊息" })}: {formatDate(profile.aiTutor.lastMessageAt, language)}</p>
          </div>
          <div className="glass-panel p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Parent access", zh: "家長端存取" })}</h2>
            <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Invite code", zh: "邀請碼" })}</p>
            <p className="mt-2 rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3 text-lg font-black tracking-[0.12em] text-cyan-800 dark:text-cyan-100">{profile.parentInviteCode}</p>
            <div className="mt-4 grid gap-2">
              {profile.guardianLinks.map((link) => (
                <div key={link.id} className="soft-panel p-3 text-sm font-bold">
                  {link.parentName} · {link.relationship}
                </div>
              ))}
              {!profile.guardianLinks.length ? <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No parent accounts linked yet.", zh: "尚未綁定家長帳戶。" })}</p> : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function AssignmentRows({ assignments }: { assignments: Assignment[] }) {
  const { language, text, t } = useSettings();
  return (
    <div className="grid gap-3">
      {assignments.map((assignment) => (
        <Link key={assignment.id} href={`/teacher/assignments/${assignment.id}`} className="focus-ring soft-panel block p-4 transition hover:-translate-y-0.5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_110px] lg:items-center">
            <div>
              <p className="text-lg font-black text-slate-950 dark:text-white">{text(assignment.title)}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text(assignmentContentTypeLabels[assignment.contentType])} · {text(assignment.description)}</p>
            </div>
            <p className="text-sm font-bold">{formatDate(assignment.dueAt, language)}</p>
            <p className="text-right text-2xl font-black gradient-text">{assignment.submissionCount ? percent(Math.round((assignment.completedCount / assignment.submissionCount) * 100)) : "0%"}</p>
          </div>
        </Link>
      ))}
      {!assignments.length ? <p className="soft-panel p-5 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No assignments yet.", zh: "尚未有作業。" })}</p> : null}
    </div>
  );
}

export function TeacherAssignmentsManager({ assignments }: { assignments: Assignment[] }) {
  const { t } = useSettings();
  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Assignments", zh: "作業" })}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Assignment distribution", zh: "作業分派" })}</h1>
        </div>
        <Link href="/teacher/assignments/new" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "New assignment", zh: "新增作業" })}</Link>
      </div>
      <div className="mt-6"><AssignmentRows assignments={assignments} /></div>
    </section>
  );
}

export function TeacherAssignmentNewView({
  classDetails,
  resources = [],
  assessments = []
}: {
  classDetails: TeacherClassDetailData[];
  resources?: TeachingResource[];
  assessments?: Assessment[];
}) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [selectedClassId, setSelectedClassId] = useState(classDetails[0]?.class.id ?? "");
  const selectedClass = classDetails.find((detail) => detail.class.id === selectedClassId) ?? classDetails[0];
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [contentType, setContentType] = useState<AssignmentContentType>("lesson");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const studentIds = scope === "selected" ? form.getAll("studentIds").map(String) : undefined;
    const response = await fetch("/api/teacher/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClassId,
        studentIds,
        title: form.get("title"),
        description: form.get("description"),
        contentType,
        targetId: form.get("targetId"),
        dueAt: form.get("dueAt"),
        allowRetake: form.get("allowRetake") === "on",
        showAnswers: form.get("showAnswers") === "on",
        countTowardsGrade: form.get("countTowardsGrade") === "on"
      })
    });
    const payload = await response.json().catch(() => null) as { assignment?: Assignment; error?: string } | null;
    if (!response.ok || !payload?.assignment) {
      setError(t({ en: "Could not create this assignment yet.", zh: "暫時未能建立此作業。" }));
      return;
    }
    router.push(`/teacher/assignments/${payload.assignment.id}`);
  };

  return (
    <section className="glass-panel p-5 sm:p-6">
      <Link href="/teacher/assignments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assignments", zh: "返回作業" })}</Link>
      <h1 className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Create assignment", zh: "建立作業" })}</h1>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Class", zh: "班級" })}</span><select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{classDetails.map((detail) => <option key={detail.class.id} value={detail.class.id}>{detail.class.name} · {formatGradeLabel(detail.class.grade, language, true)}</option>)}</select></label>
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Content type", zh: "內容類型" })}</span><select value={contentType} onChange={(event) => setContentType(event.target.value as AssignmentContentType)} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{contentTypes.map((type) => <option key={type} value={type}>{text(assignmentContentTypeLabels[type])}</option>)}</select></label>
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Title", zh: "標題" })}</span><input name="title" required className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          {contentType === "resource" ? (
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Resource", zh: "資源" })}</span><select name="targetId" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{resources.map((resource) => <option key={resource.id} value={resource.id}>{text(resource.title)} · {resource.fileType}</option>)}</select></label>
          ) : contentType === "assessment" ? (
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Assessment", zh: "測驗" })}</span><select name="targetId" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]">{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{text(assessment.title)} · {text(assessmentTypeLabels[assessment.type])}</option>)}</select></label>
          ) : (
            <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Target ID", zh: "目標 ID" })}</span><input name="targetId" placeholder={t({ en: "lesson slug, question id, topic id", zh: "課堂 slug、題目 ID、課題 ID" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          )}
          <label className="grid gap-2 lg:col-span-2"><span className="text-sm font-black">{t({ en: "Description", zh: "描述" })}</span><textarea name="description" rows={3} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          <label className="grid gap-2"><span className="text-sm font-black">{t({ en: "Due date", zh: "截止日期" })}</span><input name="dueAt" type="datetime-local" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06]" /></label>
          <div className="grid gap-2"><span className="text-sm font-black">{t({ en: "Recipients", zh: "對象" })}</span><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setScope("all")} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${scope === "all" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Whole class", zh: "全班" })}</button><button type="button" onClick={() => setScope("selected")} className={`focus-ring rounded-full px-4 py-2 text-sm font-black ${scope === "selected" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "soft-panel"}`}>{t({ en: "Selected students", zh: "指定學生" })}</button></div></div>
        </div>
        {scope === "selected" && selectedClass ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {selectedClass.students.map((student) => (
              <label key={student.studentId} className="soft-panel flex items-center gap-3 p-3 text-sm font-bold"><input name="studentIds" type="checkbox" value={student.studentId} />{student.studentName}</label>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="allowRetake" type="checkbox" defaultChecked />{t({ en: "Allow retake", zh: "允許重做" })}</label>
          <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="showAnswers" type="checkbox" />{t({ en: "Show answers", zh: "顯示答案" })}</label>
          <label className="soft-panel flex items-center gap-2 px-4 py-3 text-sm font-bold"><input name="countTowardsGrade" type="checkbox" defaultChecked />{t({ en: "Count toward grade", zh: "計入成績" })}</label>
        </div>
        {error ? <p className="text-sm font-bold text-rose-700 dark:text-rose-200">{error}</p> : null}
        <button className="focus-ring w-fit rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Create assignment", zh: "建立作業" })}</button>
      </form>
    </section>
  );
}

export function TeacherAssignmentDetailView({ detail }: { detail: TeacherAssignmentDetailData }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [scoreBySubmission, setScoreBySubmission] = useState<Record<string, string>>({});

  const gradeSubmission = async (submission: Submission) => {
    const score = Number(scoreBySubmission[submission.id] ?? submission.score ?? 0);
    const response = await fetch(`/api/teacher/submissions/${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score })
    });
    if (response.ok) router.refresh();
  };

  return (
    <div className="grid gap-6">
      <section className="glass-panel p-5 sm:p-6">
        <Link href="/teacher/assignments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">{t({ en: "Back to assignments", zh: "返回作業" })}</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{detail.class.name}</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{text(detail.assignment.title)}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text(detail.assignment.description)}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black gradient-text">{percent(detail.completionRate)}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "completion", zh: "完成率" })}</p>
          </div>
        </div>
      </section>
      <section className="glass-panel overflow-x-auto p-5 sm:p-6">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400"><tr><th className="py-3 pr-4">{t({ en: "Student", zh: "學生" })}</th><th className="py-3 pr-4">{t({ en: "Status", zh: "狀態" })}</th><th className="py-3 pr-4">{t({ en: "Score", zh: "分數" })}</th><th className="py-3 pr-4">{t({ en: "Submitted", zh: "提交" })}</th><th className="py-3">{t({ en: "Grade", zh: "批改" })}</th></tr></thead>
          <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
            {detail.submissions.map((submission) => (
              <tr key={submission.id}>
                <td className="py-4 pr-4"><Link className="font-black text-cyan-700 dark:text-cyan-200" href={`/teacher/students/${submission.studentId}`}>{submission.studentName}</Link></td>
                <td className="py-4 pr-4"><StatusPill value={submission.status} label={text(submissionStatusLabels[submission.status])} /></td>
                <td className="py-4 pr-4 font-black">{submission.score ?? "-"}</td>
                <td className="py-4 pr-4">{formatDate(submission.submittedAt, language)}</td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <input value={scoreBySubmission[submission.id] ?? submission.score ?? ""} onChange={(event) => setScoreBySubmission((current) => ({ ...current, [submission.id]: event.target.value }))} className="focus-ring w-20 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]" />
                    <button onClick={() => gradeSubmission(submission)} type="button" className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Save", zh: "儲存" })}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function TeacherInboxManager({ inbox }: { inbox: TeacherInboxData }) {
  const router = useRouter();
  const { language, text, t } = useSettings();
  const [reply, setReply] = useState("");
  const selected = inbox.selectedThread;
  const selectedIsDataDeletionRequest = selected ? isDataDeletionRequestThread(selected) : false;

  const filteredThreads = useMemo(() => inbox.threads, [inbox.threads]);

  const patchThread = async (thread: TeacherInboxThread, patch: Record<string, unknown>) => {
    const response = await fetch(`/api/teacher/inbox/${encodeURIComponent(thread.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (response.ok) router.refresh();
  };

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    const response = await fetch(`/api/teacher/inbox/${encodeURIComponent(selected.id)}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: reply })
    });
    if (response.ok) {
      setReply("");
      router.refresh();
    }
  };

  const draftReply = async () => {
    if (!selected) return;
    const response = await fetch(`/api/teacher/inbox/${encodeURIComponent(selected.id)}/draft`, {
      method: "POST"
    });
    const payload = await response.json().catch(() => null) as { draft?: string } | null;
    if (response.ok && payload?.draft) setReply(payload.draft);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
      <aside className="glass-panel p-4">
        <h1 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Inbox", zh: "收件匣" })}</h1>
        <div className="mt-4 grid gap-2">
          {filteredThreads.map((thread) => (
            <Link key={thread.id} href={`/teacher/inbox?thread=${encodeURIComponent(thread.id)}`} className={`focus-ring rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selected?.id === thread.id ? "border-cyan-300/55 bg-cyan-400/12" : "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]"}`}>
              <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-black">{text(thread.subject)}</p><span>{thread.starred ? "★" : ""}</span></div>
              <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{thread.studentName}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {isDataDeletionRequestThread(thread) ? (
                  <span className="rounded-full border border-rose-300/60 bg-rose-400/12 px-2.5 py-1 text-[11px] font-black text-rose-800 dark:text-rose-100">
                    {t({ en: "Data deletion request", zh: "數據刪除申請" })}
                  </span>
                ) : null}
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone(thread.status)}`}>{text(teacherMessageStatusLabels[thread.status])}</span>
                {thread.priority === "urgent" ? (
                  <span className="rounded-full border border-amber-300/60 bg-amber-400/12 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:text-amber-100">
                    {t({ en: "Urgent", zh: "緊急" })}
                  </span>
                ) : null}
                {thread.parentContext ? (
                  <span className="rounded-full border border-violet-300/60 bg-violet-400/12 px-2.5 py-1 text-[11px] font-black text-violet-800 dark:text-violet-100">
                    {t({ en: "Parent", zh: "家長" })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{thread.latestMessage}</p>
            </Link>
          ))}
        </div>
      </aside>
      <section className="glass-panel p-4 sm:p-5">
        {selected ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                  {selected.parentContext ? `${selected.parentContext.guardianName} · ${selected.studentName}` : selected.studentName}
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{text(selected.subject)}</h2>
                {selected.parentContext ? (
                  <span className="mt-3 inline-flex rounded-full border border-violet-300/60 bg-violet-400/12 px-3 py-1 text-xs font-black text-violet-800 dark:text-violet-100">
                    {text(parentCategoryLabel(selected.parentContext.category))}
                  </span>
                ) : null}
                {selectedIsDataDeletionRequest ? (
                  <span className="mt-3 inline-flex rounded-full border border-rose-300/60 bg-rose-400/12 px-3 py-1 text-xs font-black text-rose-800 dark:text-rose-100">
                    {t({ en: "Data deletion request", zh: "數據刪除申請" })}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => patchThread(selected, { starred: !selected.starred })} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">{selected.starred ? t({ en: "Unstar", zh: "取消星標" }) : t({ en: "Star", zh: "加星" })}</button>
                <button type="button" onClick={() => patchThread(selected, { status: selected.status === "resolved" ? "open" : "resolved" })} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{selected.status === "resolved" ? t({ en: "Reopen", zh: "重開" }) : t({ en: "Resolve", zh: "標記解決" })}</button>
              </div>
            </div>
            {selectedIsDataDeletionRequest ? (
              <div className="mt-5 rounded-2xl border border-rose-300/50 bg-rose-400/10 p-4 text-sm font-semibold leading-6 text-rose-800 dark:text-rose-100">
                {t({
                  en: "Privacy workflow: confirm the student's identity and school retention policy before deleting analytics records. Mark this thread resolved only after the data deletion request is handled.",
                  zh: "私隱流程：刪除學習分析紀錄前，請先確認學生身份及學校資料保留政策。完成數據刪除申請後才將此對話標記為已解決。"
                })}
              </div>
            ) : null}
            <div className="mt-5 grid gap-3">
              {selected.messages.map((message) => (
                <div key={message.id} className={`max-w-[86%] rounded-2xl border p-4 ${message.senderRole === "teacher" ? "ml-auto border-cyan-300/45 bg-cyan-400/10" : "border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-white/[0.06]"}`}>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{message.senderName} · {formatDate(message.createdAt, language)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{message.body}</p>
                  {message.attachments.length ? <p className="mt-2 text-xs font-bold text-cyan-700 dark:text-cyan-200">{message.attachments.length} {t({ en: "attachments", zh: "附件" })}</p> : null}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3">
	              <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={4} placeholder={selected.parentContext ? t({ en: "Reply to the parent", zh: "回覆家長" }) : t({ en: "Reply to the student", zh: "回覆學生" })} className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/[0.06]" />
	              <div className="flex flex-wrap gap-2">
	                <button onClick={draftReply} type="button" className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">{t({ en: "Draft reply", zh: "草擬回覆" })}</button>
	                <button onClick={sendReply} type="button" className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Send reply", zh: "發送回覆" })}</button>
	              </div>
            </div>
          </>
        ) : <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No messages yet.", zh: "尚未有私信。" })}</p>}
      </section>
      <aside className="glass-panel p-4">
        {selected ? (
          <>
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Student context", zh: "學生上下文" })}</h2>
            <p className="mt-3 text-sm font-bold text-cyan-700 dark:text-cyan-200">{formatGradeLabel(selected.studentGrade, language, true)} · {selected.className ?? ""}</p>
            <p className="mt-3 text-3xl font-black gradient-text">{percent(selected.studentContext.averageMastery)}</p>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "average mastery", zh: "平均掌握" })}</p>
            {selected.parentContext ? (
              <div className="mt-5 rounded-2xl border border-violet-300/45 bg-violet-400/10 p-3 text-sm font-bold text-violet-800 dark:text-violet-100">
                <p>{t({ en: "Parent", zh: "家長" })}: {selected.parentContext.guardianName}</p>
                <p className="mt-1">{t({ en: "Category", zh: "類型" })}: {text(parentCategoryLabel(selected.parentContext.category))}</p>
              </div>
            ) : null}
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Active mistakes", zh: "目前錯題" })}</h3>
            <div className="mt-3 grid gap-2">
              {selected.studentContext.activeMistakes.map((mistake) => <div key={mistake.questionId} className="soft-panel p-3 text-xs font-bold">{text(mistake.question.topic)} · {mistake.wrongAttempts}</div>)}
            </div>
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Current assignments", zh: "目前作業" })}</h3>
            <div className="mt-3 grid gap-2">
              {selected.studentContext.currentAssignments.map((item: StudentAssignmentItem) => <Link key={item.assignment.id} href={`/teacher/assignments/${item.assignment.id}`} className="soft-panel block p-3 text-xs font-bold">{text(item.assignment.title)} · {text(submissionStatusLabels[item.submission.status])}</Link>)}
            </div>
          </>
        ) : null}
      </aside>
    </div>
  );
}
