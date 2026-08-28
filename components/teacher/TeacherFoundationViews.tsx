"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/AppProviders";
import {
  assignmentContentTypeLabels,
  assignmentStatusLabels,
  teacherMessageStatusLabels
} from "@/components/teacher/teacherLabels";
import { formatGradeLabel, textForLanguage } from "@/lib/i18n";
import { formatDateInHongKong } from "@/lib/utils";
import type { Assignment, Language, TeacherClass, TeacherFoundationData, TeacherMessage } from "@/types";

function formatDate(value: string | null, language: Language) {
  if (!value) return textForLanguage({ en: "Not set", zh: "未設定", zhHans: "未设定" }, language);
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric"
  });
}

function assignmentCompletion(assignment: Assignment) {
  if (!assignment.submissionCount) return 0;
  return Math.round((assignment.completedCount / assignment.submissionCount) * 100);
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === "active" || status === "unread"
      ? "border-cyan-300/45 bg-cyan-400/10 text-cyan-700 dark:text-cyan-100"
      : status === "draft" || status === "open"
        ? "border-amber-300/45 bg-amber-400/10 text-amber-700 dark:text-amber-100"
        : "border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${tone}`}>
      {label}
    </span>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="soft-panel p-6 text-center">
      <p className="text-base font-black text-slate-950 dark:text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

export function TeacherOverview({ foundation }: { foundation: TeacherFoundationData }) {
  const { language, t, text } = useSettings();
  const metricCards = [
    {
      label: t({ en: "Classes", zh: "班級", zhHans: "班级" }),
      value: foundation.totals.classes,
      detail: t({ en: "Active teacher spaces", zh: "可管理教學空間", zhHans: "可管理教学空间" })
    },
    {
      label: t({ en: "Students", zh: "學生", zhHans: "学生" }),
      value: foundation.totals.students,
      detail: t({ en: "Enrolled across classes", zh: "已加入班級學生", zhHans: "已加入班级学生" })
    },
    {
      label: t({ en: "Active assignments", zh: "進行中作業", zhHans: "进行中作业" }),
      value: foundation.totals.activeAssignments,
      detail: t({ en: "Ready for completion tracking", zh: "可追蹤完成進度", zhHans: "可追踪完成进度" })
    },
    {
      label: t({ en: "Unread inbox", zh: "未讀私信", zhHans: "未读私信" }),
      value: foundation.totals.unreadMessages,
      detail: t({ en: "Needs teacher response", zh: "需要教師回覆", zhHans: "需要教师回复" })
    }
  ];

  return (
    <div className="grid gap-6">
      <section className="glass-panel overflow-hidden p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {t({ en: "Teacher foundation", zh: "教師端基礎架構", zhHans: "教师端基础架构" })}
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
              {t({ en: "Classroom operations hub", zh: "課堂營運中心", zhHans: "课堂营运中心" })}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {t({
                en: "A protected teacher workspace for classes, assignments, inbox triage, resources, assessments, and reports.",
                zh: "受保護的教師工作台，集中管理班級、作業、私信、資源、測驗與報告。", zhHans: "受保护的教师工作台，集中管理班级、作业、私信、资源、测验与报告。"
              })}
            </p>
          </div>
          <Link
            href="/teacher/assignments"
            className="focus-ring inline-flex justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
          >
            {t({ en: "Review assignments", zh: "查看作業", zhHans: "查看作业" })}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <article key={metric.label} className="glass-panel p-5">
            <p className="text-sm font-black text-slate-500 dark:text-slate-400">{metric.label}</p>
            <p className="mt-4 text-4xl font-black gradient-text">{metric.value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Recent assignments", zh: "最近作業", zhHans: "最近作业" })}</h2>
            <Link href="/teacher/assignments" className="text-sm font-black text-cyan-700 dark:text-cyan-200">
              {t({ en: "Open all", zh: "查看全部", zhHans: "查看全部" })}
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {foundation.recentAssignments.length ? (
              foundation.recentAssignments.map((assignment) => (
                <article key={assignment.id} className="soft-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-950 dark:text-white">{text(assignment.title)}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {text(assignmentContentTypeLabels[assignment.contentType])} · {t({ en: "Due", zh: "截止", zhHans: "截止" })} {formatDate(assignment.dueAt, language)}
                      </p>
                    </div>
                    <StatusPill status={assignment.status} label={text(assignmentStatusLabels[assignment.status])} />
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${assignmentCompletion(assignment)}%` }} />
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title={t({ en: "No assignments yet", zh: "尚未有作業", zhHans: "尚未有作业" })} body={t({ en: "New assignments will appear here.", zh: "新作業會顯示在這裡。", zhHans: "新作业会显示在这里。" })} />
            )}
          </div>
        </div>

        <aside className="glass-panel p-5 sm:p-6">
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">{t({ en: "Inbox preview", zh: "私信預覽", zhHans: "私信预览" })}</h2>
          <div className="mt-5 grid gap-3">
            {foundation.inboxPreview.length ? (
              foundation.inboxPreview.map((message) => <MessageCard key={message.id} message={message} />)
            ) : (
              <EmptyState title={t({ en: "Inbox clear", zh: "暫無待覆私信", zhHans: "暂无待覆私信" })} body={t({ en: "Student messages will land here.", zh: "學生私信會顯示在這裡。", zhHans: "学生私信会显示在这里。" })} />
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

export function TeacherClassesView({ classes }: { classes: TeacherClass[] }) {
  const { language, t, text } = useSettings();

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
            {t({ en: "Classes", zh: "班級", zhHans: "班级" })}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Teacher class spaces", zh: "教師班級空間", zhHans: "教师班级空间" })}</h1>
        </div>
        <button className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="button">
          {t({ en: "Create class", zh: "建立班級", zhHans: "建立班级" })}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {classes.map((teacherClass) => (
          <article key={teacherClass.id} className="soft-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xl font-black text-slate-950 dark:text-white">{teacherClass.name}</p>
                <p className="mt-1 text-sm font-bold text-cyan-700 dark:text-cyan-200">
                  {formatGradeLabel(teacherClass.grade, language, true)} · {teacherClass.academicYear}
                </p>
              </div>
              <span className="rounded-full border border-slate-200/80 bg-white/75 px-3 py-1 text-xs font-black text-slate-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300">
                {teacherClass.studentCount} {t({ en: "students", zh: "學生", zhHans: "学生" })}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{text(teacherClass.description)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TeacherAssignmentsView({ assignments }: { assignments: Assignment[] }) {
  const { language, t, text } = useSettings();

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
            {t({ en: "Assignments", zh: "作業", zhHans: "作业" })}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Assignment foundation", zh: "作業分派基礎", zhHans: "作业分派基础" })}</h1>
        </div>
        <button className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="button">
          {t({ en: "New assignment", zh: "新增作業", zhHans: "新增作业" })}
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {assignments.length ? (
          assignments.map((assignment) => (
            <article key={assignment.id} className="soft-panel p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_150px_120px] lg:items-center">
                <div>
                  <p className="text-lg font-black text-slate-950 dark:text-white">{text(assignment.title)}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text(assignment.description)}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{t({ en: "Due", zh: "截止", zhHans: "截止" })}</p>
                  <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{formatDate(assignment.dueAt, language)}</p>
                </div>
                <div className="lg:text-right">
                  <p className="text-2xl font-black gradient-text">{assignmentCompletion(assignment)}%</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t({ en: "completed", zh: "已完成", zhHans: "已完成" })}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title={t({ en: "No assignments yet", zh: "尚未有作業", zhHans: "尚未有作业" })} body={t({ en: "Create the first teacher assignment from this workspace.", zh: "可在此工作台建立第一份教師作業。", zhHans: "可在此工作台建立第一份教师作业。" })} />
        )}
      </div>
    </section>
  );
}

function MessageCard({ message }: { message: TeacherMessage }) {
  const { t, text } = useSettings();

  return (
    <article className="soft-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-950 dark:text-white">{text(message.subject)}</p>
          <p className="mt-1 text-xs font-bold text-cyan-700 dark:text-cyan-200">{message.studentName}</p>
        </div>
        <StatusPill status={message.status} label={text(teacherMessageStatusLabels[message.status])} />
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{message.latestMessage}</p>
      <p className="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">
        {message.priority === "urgent" ? t({ en: "Urgent", zh: "緊急", zhHans: "紧急" }) : t({ en: "Normal priority", zh: "一般優先", zhHans: "一般优先" })}
      </p>
    </article>
  );
}

export function TeacherInboxView({ messages }: { messages: TeacherMessage[] }) {
  const { t } = useSettings();

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
          {t({ en: "Student inbox", zh: "學生私信", zhHans: "学生私信" })}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{t({ en: "Teacher response queue", zh: "教師回覆佇列", zhHans: "教师回复队列" })}</h1>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {messages.length ? (
          messages.map((message) => <MessageCard key={message.id} message={message} />)
        ) : (
          <EmptyState title={t({ en: "No messages", zh: "暫無私信", zhHans: "暂无私信" })} body={t({ en: "Student help requests will appear here.", zh: "學生求助會顯示在這裡。", zhHans: "学生求助会显示在这里。" })} />
        )}
      </div>
    </section>
  );
}
