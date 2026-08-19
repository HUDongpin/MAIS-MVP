"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { formatGradeLabel, textForLanguage } from "@/lib/i18n";
import { cn, formatDateInHongKong } from "@/lib/utils";
import type {
  AITutorTranscriptAccessSummary,
  ClassRosterProfile,
  Language,
  NovaLensPolicy,
  NovaLensRunSummary,
  PrepTeam,
  PrepTeamShareKind,
  ProvisioningCredential,
  TermArchive,
  TeacherMissingWorkItem,
  TeacherNotice,
  TeacherOperationsData,
  TeacherReminderRun,
  TeacherRosterImportValidation
} from "@/types";

type OperationsTab = "notices" | "reminders" | "roster" | "collaboration" | "archive" | "ai-governance";

const tabs: Array<{ id: OperationsTab; label: { en: string; zh: string; zhHans?: string } }> = [
  { id: "notices", label: { en: "Notice receipts", zh: "通知回執", zhHans: "通知回执" } },
  { id: "reminders", label: { en: "Missing work", zh: "未交提醒", zhHans: "未交提醒" } },
  { id: "roster", label: { en: "Roster & seats", zh: "花名冊與座位", zhHans: "花名册与座位" } },
  { id: "collaboration", label: { en: "Collaboration", zh: "協作與備課組", zhHans: "协作与备课组" } },
  { id: "archive", label: { en: "Term archive", zh: "學期歸檔", zhHans: "学期归档" } },
  { id: "ai-governance", label: { en: "AI governance", zh: "AI 治理", zhHans: "AI 治理" } }
];

const tabPathById: Record<OperationsTab, string> = {
  notices: "notices",
  reminders: "reminders",
  roster: "roster",
  collaboration: "collaboration",
  archive: "term-archives",
  "ai-governance": "ai-governance"
};

const prepTeamShareKindOptions: Array<{ value: PrepTeamShareKind; label: { en: string; zh: string; zhHans?: string } }> = [
  { value: "resource", label: { en: "Resource", zh: "教學資源", zhHans: "教学资源" } },
  { value: "assessment", label: { en: "Assessment", zh: "測驗評估", zhHans: "测验评估" } },
  { value: "lesson-kit", label: { en: "Lesson kit", zh: "備課包", zhHans: "备课包" } },
  { value: "note", label: { en: "Note", zh: "備註", zhHans: "备注" } }
];

const sampleRosterCsv = [
  "studentNo,name,grade,email,username,seatLabel,seatRow,seatColumn,parentName,parentEmail",
  "01,Chan Tsz Long,S3,tszlong@example.edu.hk,tszlong,1A,1,1,Mrs Chan,parent.chan@example.com"
].join("\n");

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) return "-";
  return formatDateInHongKong(value, language, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function statusTone(status: string) {
  if (status === "sent" || status === "acknowledged" || status === "enabled") return "border-emerald-300/60 bg-emerald-400/12 text-emerald-800 dark:text-emerald-100";
  if (status === "failed") return "border-rose-300/60 bg-rose-400/12 text-rose-800 dark:text-rose-100";
  if (status === "queued" || status === "disabled") return "border-amber-300/60 bg-amber-400/12 text-amber-800 dark:text-amber-100";
  return "border-slate-200/80 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200";
}

function StatusPill({ value }: { value: string }) {
  return <span className={`inline-flex max-w-full whitespace-nowrap rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusTone(value)}`}>{value}</span>;
}

function OperationsMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="glass-panel min-w-0 p-4">
      <p className="break-words text-xs font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black gradient-text">{value}</p>
    </article>
  );
}

function domIdPart(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

function missingWorkAnchorId(assignmentId: string, studentId: string) {
  return `missing-work-${domIdPart(assignmentId)}-${domIdPart(studentId)}`;
}

function csvCell(value: string | number | boolean | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function credentialsToCsv(credentials: ProvisioningCredential[]) {
  const header = ["role", "name", "username", "temporaryPassword", "schoolCode", "classCode", "passwordChangeRequired"];
  const rows = credentials.map((credential) => [
    credential.role,
    credential.name,
    credential.username,
    credential.temporaryPassword,
    credential.schoolCode,
    credential.classCode ?? "",
    credential.passwordChangeRequired
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function NoticeCard({ notice, onSend }: { notice: TeacherNotice; onSend: (noticeId: string) => void }) {
  const { language, t, text } = useSettings();
  return (
    <article id={`notice-${notice.id}`} className="soft-panel min-w-0 scroll-mt-24 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-base font-black text-slate-950 dark:text-white">{text(notice.subject)}</p>
          <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">{notice.className} · {notice.channelName}</p>
        </div>
        <StatusPill value={notice.status} />
      </div>
      <p className="mt-3 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{text(notice.body)}</p>
      <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Ack", zh: "回執", zhHans: "回执" })}</p>
          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">{notice.acknowledgement.acknowledged}/{notice.acknowledgement.total}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Due", zh: "截止", zhHans: "截止" })}</p>
          <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{formatDate(notice.dueAt, language)}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Last send", zh: "最近發送", zhHans: "最近发送" })}</p>
          <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{formatDate(notice.sentAt, language)}</p>
        </div>
        <div className="min-w-0 sm:text-right">
          <button
            type="button"
            onClick={() => onSend(notice.id)}
            className="focus-ring w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950 sm:w-auto"
          >
            {notice.status === "draft" ? t({ en: "Send", zh: "發送", zhHans: "发送" }) : t({ en: "Retry", zh: "重試", zhHans: "重试" })}
          </button>
        </div>
      </div>
      <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-2">{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th>
              <th>{t({ en: "Guardian", zh: "家長", zhHans: "家长" })}</th>
              <th>{t({ en: "Status", zh: "狀態", zhHans: "状态" })}</th>
              <th>{t({ en: "Acknowledged", zh: "確認時間", zhHans: "确认时间" })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {notice.recipients.map((recipient) => (
              <tr key={recipient.id}>
                <td className="py-2 font-bold text-slate-800 dark:text-slate-100">{recipient.studentName}</td>
                <td className="font-semibold text-slate-600 dark:text-slate-300">{recipient.guardianName ?? "-"}</td>
                <td><StatusPill value={recipient.status} /></td>
                <td className="font-semibold text-slate-500 dark:text-slate-400">{formatDate(recipient.acknowledgedAt, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function NoticeReadyPanel({ notice, onSend }: { notice: TeacherNotice; onSend: (noticeId: string) => void }) {
  const { t, text } = useSettings();

  return (
    <section className="glass-panel min-w-0 border-emerald-300/45 bg-emerald-400/10 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">{t({ en: "Notice ready", zh: "通知已就緒", zhHans: "通知已就绪" })}</p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{text(notice.subject)}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {notice.className} · {notice.acknowledgement.pending}/{notice.acknowledgement.total} {t({ en: "pending acknowledgements", zh: "待回執", zhHans: "待回执" })}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button type="button" onClick={() => onSend(notice.id)} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {notice.status === "draft" ? t({ en: "Send now", zh: "立即發送", zhHans: "立即发送" }) : t({ en: "Retry send", zh: "重新發送", zhHans: "重新发送" })}
          </button>
          <a href={`#notice-${notice.id}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Open receipts", zh: "查看回執", zhHans: "查看回执" })}
          </a>
        </div>
      </div>
    </section>
  );
}

function PrepTeamReadyPanel({ team, shareId }: { team: PrepTeam; shareId: string }) {
  const { t, text } = useSettings();
  const latestShare = shareId ? team.shares.find((share) => share.id === shareId) : null;

  return (
    <section className="glass-panel min-w-0 border-emerald-300/45 bg-emerald-400/10 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {latestShare ? t({ en: "Share added", zh: "共享已加入", zhHans: "共享已加入" }) : t({ en: "Prep team ready", zh: "備課組已就緒", zhHans: "备课组已就绪" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{text(team.name)}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {latestShare ? text(latestShare.title) : `${team.members.length} ${t({ en: "members", zh: "成員", zhHans: "成员" })} · ${team.shares.length} ${t({ en: "shares", zh: "共享資料", zhHans: "共享资料" })}`}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href={`#prep-team-${team.id}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Open team", zh: "查看備課組", zhHans: "查看备课组" })}
          </a>
          {latestShare ? (
            <a href={`#prep-share-${latestShare.id}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
              {t({ en: "Open share", zh: "查看共享", zhHans: "查看共享" })}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReminderRunReadyPanel({
  runs,
  missingWork
}: {
  runs: TeacherReminderRun[];
  missingWork: TeacherMissingWorkItem[];
}) {
  const { t, text } = useSettings();
  const attemptedCount = runs.filter((run) => run.status !== "skipped").length;
  const skippedCount = runs.length - attemptedCount;
  const firstRun = runs[0] ?? null;
  const firstItem = firstRun
    ? missingWork.find((item) => item.assignmentId === firstRun.assignmentId && item.studentId === firstRun.studentId)
    : null;

  return (
    <section aria-live="polite" className="mt-5 rounded-2xl border border-emerald-300/55 bg-emerald-400/12 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {t({ en: "Reminder run ready", zh: "提醒任務已就緒", zhHans: "提醒任务已就绪" })}
          </p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">
            {attemptedCount} {t({ en: "attempted", zh: "已嘗試", zhHans: "已尝试" })}{skippedCount ? ` · ${skippedCount} ${t({ en: "skipped", zh: "已跳過", zhHans: "已跳过" })}` : ""}
          </p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {firstItem
              ? `${firstItem.studentName} · ${text(firstItem.assignmentTitle)}`
              : t({ en: "No eligible missing-work reminders were generated.", zh: "本次沒有符合條件的未交提醒。", zhHans: "本次没有符合条件的未交提醒。" })}
          </p>
        </div>
        {firstRun ? <StatusPill value={firstRun.threshold} /> : null}
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        {firstItem ? (
          <a href={`#${missingWorkAnchorId(firstItem.assignmentId, firstItem.studentId)}`} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Open missing work", zh: "查看未交項", zhHans: "查看未交项" })}
          </a>
        ) : null}
        {firstRun?.noticeId ? (
          <Link href={`/teacher/operations/notices#notice-${encodeURIComponent(firstRun.noticeId)}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Notice receipts", zh: "通知回執", zhHans: "通知回执" })}
          </Link>
        ) : null}
        {firstRun ? (
          <Link href={`/teacher/assignments/${encodeURIComponent(firstRun.assignmentId)}`} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Assignment", zh: "作業", zhHans: "作业" })}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function MissingWorkTable({ items, onRunManual }: { items: TeacherMissingWorkItem[]; onRunManual: (assignmentId?: string) => void }) {
  const { language, t, text } = useSettings();
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <tr>
            <th className="py-3">{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th>
            <th>{t({ en: "Assignment", zh: "作業", zhHans: "作业" })}</th>
            <th>{t({ en: "Due", zh: "截止", zhHans: "截止" })}</th>
            <th>{t({ en: "Next threshold", zh: "下一提醒", zhHans: "下一提醒" })}</th>
            <th>{t({ en: "Last reminder", zh: "上次提醒", zhHans: "上次提醒" })}</th>
            <th className="text-right">{t({ en: "Action", zh: "操作", zhHans: "操作" })}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
          {items.map((item) => (
            <tr id={missingWorkAnchorId(item.assignmentId, item.studentId)} key={`${item.assignmentId}-${item.studentId}`} className="scroll-mt-24">
              <td className="py-3 font-black text-slate-950 dark:text-white">{item.studentName}</td>
              <td className="font-semibold text-slate-700 dark:text-slate-200">{text(item.assignmentTitle)}</td>
              <td className="font-semibold text-slate-500 dark:text-slate-400">{formatDate(item.dueAt, language)}</td>
              <td>{item.nextThreshold ? <StatusPill value={item.nextThreshold} /> : <span className="text-xs font-bold text-slate-400">-</span>}</td>
              <td className="font-semibold text-slate-500 dark:text-slate-400">{formatDate(item.lastReminderAt, language)}</td>
              <td className="text-right">
                <button
                  type="button"
                  onClick={() => onRunManual(item.assignmentId)}
                  className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                >
                  {t({ en: "Manual send", zh: "手動補發", zhHans: "手动补发" })}
                </button>
              </td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                {t({ en: "No missing work for this class.", zh: "此班暫無未交作業。", zhHans: "此班暂无未交作业。" })}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function RosterCredentialPanel({
  credentials,
  onCopy,
  onDownload,
  status
}: {
  credentials: ProvisioningCredential[];
  onCopy: () => void;
  onDownload: () => void;
  status: string;
}) {
  const { t } = useSettings();

  if (!credentials.length) return null;

  return (
    <section className="glass-panel min-w-0 overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">{t({ en: "Account handoff", zh: "帳號交付", zhHans: "账号交付" })}</p>
          <h2 className="mt-2 break-words text-xl font-black text-slate-950 dark:text-white">{t({ en: "Temporary login slips", zh: "臨時登入單", zhHans: "临时登录单" })}</h2>
          <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
            {t({
              en: "These credentials are shown only for this import result. Copy or download them before leaving the page.",
              zh: "這些登入資料只在本次導入結果中顯示；離開頁面前請複製或下載。", zhHans: "这些登录资料只在本次导入结果中显示；离开页面前请复制或下载。"
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onCopy} className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            {t({ en: "Copy CSV", zh: "複製 CSV", zhHans: "复制 CSV" })}
          </button>
          <button type="button" onClick={onDownload} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Download CSV", zh: "下載 CSV", zhHans: "下载 CSV" })}
          </button>
        </div>
      </div>

      {status ? <p aria-live="polite" className="mt-4 break-words rounded-2xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-100">{status}</p> : null}

      <div className="mt-5 min-w-0 max-w-full overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-3">{t({ en: "Role", zh: "角色", zhHans: "角色" })}</th>
              <th>{t({ en: "Name", zh: "姓名", zhHans: "姓名" })}</th>
              <th>{t({ en: "Username", zh: "用戶名", zhHans: "用户名" })}</th>
              <th>{t({ en: "Temporary password", zh: "臨時密碼", zhHans: "临时密码" })}</th>
              <th>{t({ en: "School / class", zh: "學校 / 班級", zhHans: "学校 / 班级" })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {credentials.map((credential) => (
              <tr key={`${credential.role}-${credential.username}`}>
                <td className="py-3 font-black capitalize text-slate-950 dark:text-white">{credential.role}</td>
                <td className="font-bold text-slate-700 dark:text-slate-200">{credential.name}</td>
                <td className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200">{credential.username}</td>
                <td className="font-mono text-xs font-black text-slate-950 dark:text-white">{credential.temporaryPassword}</td>
                <td className="font-bold text-slate-500 dark:text-slate-400">{credential.schoolCode}{credential.classCode ? ` · ${credential.classCode}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RosterRow({ row }: { row: ClassRosterProfile }) {
  const router = useRouter();
  const { t } = useSettings();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    await fetch(`/api/teacher/classes/${encodeURIComponent(row.classId)}/roster/${encodeURIComponent(row.enrollmentId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentNo: form.get("studentNo"),
        seatLabel: form.get("seatLabel"),
        seatRow: Number(form.get("seatRow") || 0) || null,
        seatColumn: Number(form.get("seatColumn") || 0) || null,
        displayOrder: Number(form.get("displayOrder") || row.displayOrder)
      })
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <tr>
      <td className="py-3 font-black text-slate-950 dark:text-white">{row.studentName}</td>
      <td className="font-semibold text-slate-500 dark:text-slate-400">{row.guardianStatus} · {row.guardianCount}</td>
      <td colSpan={5}>
        <form onSubmit={submit} className="grid min-w-0 gap-2 sm:grid-cols-[90px_90px_80px_80px_80px_auto]">
          <input name="studentNo" defaultValue={row.studentNo ?? ""} aria-label={t({ en: "Student number", zh: "學號", zhHans: "学号" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <input name="seatLabel" defaultValue={row.seatLabel ?? ""} aria-label={t({ en: "Seat label", zh: "座位", zhHans: "座位" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <input name="seatRow" type="number" min="1" defaultValue={row.seatRow ?? ""} aria-label={t({ en: "Seat row", zh: "座位行", zhHans: "座位行" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <input name="seatColumn" type="number" min="1" defaultValue={row.seatColumn ?? ""} aria-label={t({ en: "Seat column", zh: "座位列", zhHans: "座位列" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <input name="displayOrder" type="number" min="1" defaultValue={row.displayOrder} aria-label={t({ en: "Display order", zh: "排序", zhHans: "排序" })} className="focus-ring min-w-0 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
          <button disabled={saving} className="focus-ring min-w-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950" type="submit">
            {saving ? t({ en: "Saving", zh: "儲存中", zhHans: "储存中" }) : t({ en: "Save", zh: "儲存", zhHans: "储存" })}
          </button>
        </form>
      </td>
    </tr>
  );
}

type NovaLensGovernanceState = {
  policy: NovaLensPolicy;
  runs: NovaLensRunSummary[];
};

type NovaLensPolicySaveResult = {
  policy?: NovaLensPolicy;
  event?: {
    changedFields?: string[];
  };
};

const novaLensSurfaceOptions: NovaLensPolicy["enabledSurfaces"] = [
  "lesson",
  "practice",
  "dashboard",
  "roadmap",
  "visualization",
  "teacher-console",
  "parent-console",
  "admin-console",
  "general"
];
const novaLensRoleOptions: NovaLensPolicy["allowedRoles"] = ["student", "teacher", "parent", "admin"];

function statusLabel(status: NovaLensRunSummary["status"]) {
  if (status === "completed") return "completed";
  if (status === "provider-fallback") return "fallback";
  if (status === "registration-required") return "registration";
  return status;
}

function NovaLensPolicyReadyPanel({
  policy,
  changedFields,
  runCount
}: {
  policy: NovaLensPolicy;
  changedFields: string[];
  runCount: number;
}) {
  const { language, t } = useSettings();

  return (
    <section className="mt-4 rounded-3xl border border-emerald-300/50 bg-emerald-400/10 p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">
            {t({ en: "Governance policy applied", zh: "治理策略已生效", zhHans: "治理策略已生效" })}
          </p>
          <p className="mt-1 break-words text-sm font-bold text-emerald-900 dark:text-emerald-100">
            {t({ en: "Server-confirmed policy is reloaded and ready for audit.", zh: "已重新載入服務端確認的策略，可供審計。", zhHans: "已重新载入服务端确认的策略，可供审计。" })}
          </p>
        </div>
        <StatusPill value={policy.enabled ? "enabled" : "disabled"} />
      </div>

      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
        <div className="soft-panel min-w-0 p-3">
          <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Roles", zh: "角色", zhHans: "角色" })}</p>
          <p className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">{policy.allowedRoles.join(", ") || "-"}</p>
        </div>
        <div className="soft-panel min-w-0 p-3">
          <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Surfaces", zh: "範圍", zhHans: "范围" })}</p>
          <p className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">{policy.enabledSurfaces.length} {t({ en: "enabled", zh: "已啟用", zhHans: "已启用" })}</p>
        </div>
        <div className="soft-panel min-w-0 p-3">
          <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Limits", zh: "限制", zhHans: "限制" })}</p>
          <p className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">
            {policy.maxSelectionLength} {t({ en: "chars", zh: "字元", zhHans: "字元" })} · {policy.retentionDays} {t({ en: "days", zh: "日", zhHans: "日" })}
          </p>
        </div>
        <div className="soft-panel min-w-0 p-3">
          <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{t({ en: "Audit", zh: "審計", zhHans: "审计" })}</p>
          <p className="mt-2 break-words text-sm font-black text-slate-950 dark:text-white">
            {policy.blockedPatterns.length} {t({ en: "blocked terms", zh: "阻擋詞", zhHans: "阻挡词" })} · {runCount} {t({ en: "runs loaded", zh: "run 已載入", zhHans: "run 已载入" })}
          </p>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        {(changedFields.length ? changedFields : [t({ en: "no field delta", zh: "無欄位差異", zhHans: "无栏位差异" })]).map((field) => (
          <span key={field} className="rounded-full border border-emerald-300/70 bg-white/75 px-3 py-1 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {field}
          </span>
        ))}
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <p className="break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
          {t({ en: "Updated", zh: "更新時間", zhHans: "更新时间" })}: {formatDate(policy.updatedAt, language)}
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          <a href="#nova-policy-form" className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Review policy", zh: "查看策略", zhHans: "查看策略" })}
          </a>
          <a href="#nova-run-history" className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Audit runs", zh: "審計 run", zhHans: "审计 run" })}
          </a>
        </div>
      </div>
    </section>
  );
}

function NovaLensGovernancePanel() {
  const router = useRouter();
  const { currentUser, language, t } = useSettings();
  const [state, setState] = useState<NovaLensGovernanceState | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");
  const [lastAppliedPolicy, setLastAppliedPolicy] = useState<NovaLensPolicy | null>(null);
  const [lastChangedFields, setLastChangedFields] = useState<string[]>([]);
  const isAdmin = currentUser?.role === "admin";

  async function loadGovernance(nextMessage = "") {
    setStatus("loading");
    setMessage(nextMessage);
    try {
      const response = await fetch("/api/nova-lens/runs?limit=80", {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await response.json() as { data?: NovaLensGovernanceState };
      if (!response.ok || !payload.data) throw new Error("Could not load AI Tutor governance.");
      setState(payload.data);
      setStatus("idle");
      return payload.data;
    } catch {
      setStatus("error");
      setMessage(t({ en: "Could not load AI Tutor governance data.", zh: "暫時未能載入 AI Tutor 治理資料。", zhHans: "暂时未能载入 AI Tutor 治理资料。" }));
      return null;
    }
  }

  useEffect(() => {
    void loadGovernance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state || !isAdmin) return;
    setStatus("saving");
    setMessage("");
    setLastAppliedPolicy(null);
    setLastChangedFields([]);
    const form = new FormData(event.currentTarget);
    const enabledSurfaces = novaLensSurfaceOptions.filter((surface) => form.get(`surface-${surface}`) === "on");
    const allowedRoles = novaLensRoleOptions.filter((role) => form.get(`role-${role}`) === "on");
    try {
      const response = await fetch("/api/admin/nova-lens/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.get("enabled") === "on",
          allowedRoles,
          enabledSurfaces,
          maxSelectionLength: Number(form.get("maxSelectionLength")),
          retentionDays: Number(form.get("retentionDays")),
          blockedPatterns: String(form.get("blockedPatterns") ?? "")
            .split("\n")
            .map((pattern) => pattern.trim())
            .filter(Boolean)
        }),
        cache: "no-store",
        credentials: "same-origin"
      });
      const savePayload = await response.json().catch(() => null) as NovaLensPolicySaveResult | null;
      const nextMessage = response.ok
        ? t({ en: "AI Tutor policy saved. Current settings reloaded.", zh: "AI Tutor 策略已儲存，現行設定已重新載入。", zhHans: "AI Tutor 策略已储存，现行设定已重新载入。" })
        : t({ en: "Could not save AI Tutor policy. Current settings reloaded.", zh: "暫時未能儲存 AI Tutor 策略，現行設定已重新載入。", zhHans: "暂时未能储存 AI Tutor 策略，现行设定已重新载入。" });
      const loadedGovernance = await loadGovernance(nextMessage);
      if (response.ok) {
        setLastAppliedPolicy(loadedGovernance?.policy ?? savePayload?.policy ?? null);
        setLastChangedFields(savePayload?.event?.changedFields ?? []);
      }
      router.refresh();
    } catch {
      setStatus("error");
      setMessage(t({ en: "Could not save AI Tutor policy.", zh: "暫時未能儲存 AI Tutor 策略。", zhHans: "暂时未能储存 AI Tutor 策略。" }));
    }
  }

  const completedRuns = state?.runs.filter((run) => run.status === "completed").length ?? 0;
  const blockedRuns = state?.runs.filter((run) => run.status === "blocked").length ?? 0;
  const fallbackRuns = state?.runs.filter((run) => run.status === "provider-fallback").length ?? 0;

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="glass-panel min-w-0 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-black text-slate-950 dark:text-white">{t({ en: "AI Tutor governance", zh: "AI Tutor 治理", zhHans: "AI Tutor 治理" })}</h2>
            <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">
              {isAdmin
                ? t({ en: "Admin policy controls and redacted agent runs.", zh: "管理員策略控制與已遮蔽 agent run。", zhHans: "管理员策略控制与已遮蔽 agent run。" })
                : t({ en: "Read-only redacted AI Tutor agent history.", zh: "只讀已遮蔽 AI Tutor agent 紀錄。", zhHans: "只读已遮蔽 AI Tutor agent 纪录。" })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadGovernance()}
            className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
          >
            {status === "loading" ? t({ en: "Loading…", zh: "載入中…", zhHans: "载入中…" }) : t({ en: "Refresh", zh: "重新整理", zhHans: "重新整理" })}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <OperationsMetric label={t({ en: "Completed", zh: "已完成", zhHans: "已完成" })} value={completedRuns} />
          <OperationsMetric label={t({ en: "Blocked", zh: "已阻擋", zhHans: "已阻挡" })} value={blockedRuns} />
          <OperationsMetric label={t({ en: "Fallback", zh: "後備回覆", zhHans: "后备回复" })} value={fallbackRuns} />
        </div>

        {message ? <p aria-live="polite" className="mt-4 rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-100">{message}</p> : null}
        {lastAppliedPolicy ? <NovaLensPolicyReadyPanel policy={lastAppliedPolicy} changedFields={lastChangedFields} runCount={state?.runs.length ?? 0} /> : null}

        {state && isAdmin ? (
          <form id="nova-policy-form" key={state.policy.updatedAt} onSubmit={savePolicy} className="mt-5 grid scroll-mt-24 gap-4">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/70 p-3 text-sm font-black text-slate-800 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100">
              <span>{t({ en: "AI Tutor enabled", zh: "啟用 AI Tutor", zhHans: "启用 AI Tutor" })}</span>
              <input name="enabled" type="checkbox" defaultChecked={state.policy.enabled} className="h-5 w-5 accent-cyan-600" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Max selection", zh: "最長選取", zhHans: "最长选取" })}</span>
                <input name="maxSelectionLength" type="number" min={80} max={1800} defaultValue={state.policy.maxSelectionLength} autoComplete="off" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Retention days", zh: "保留日數", zhHans: "保留日数" })}</span>
                <input name="retentionDays" type="number" min={1} max={365} defaultValue={state.policy.retentionDays} autoComplete="off" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
              </label>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Allowed roles", zh: "允許角色", zhHans: "允许角色" })}</p>
              <div className="flex flex-wrap gap-2">
                {novaLensRoleOptions.map((role) => (
                  <label key={role} className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.06]">
                    <input name={`role-${role}`} type="checkbox" defaultChecked={state.policy.allowedRoles.includes(role)} className="accent-cyan-600" />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Enabled surfaces", zh: "啟用範圍", zhHans: "启用范围" })}</p>
              <div className="flex flex-wrap gap-2">
                {novaLensSurfaceOptions.map((surface) => (
                  <label key={surface} className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black dark:border-white/10 dark:bg-white/[0.06]">
                    <input name={`surface-${surface}`} type="checkbox" defaultChecked={state.policy.enabledSurfaces.includes(surface)} className="accent-cyan-600" />
                    {surface}
                  </label>
                ))}
              </div>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Blocked patterns", zh: "阻擋字詞", zhHans: "阻挡字词" })}</span>
              <textarea name="blockedPatterns" rows={5} defaultValue={state.policy.blockedPatterns.join("\n")} autoComplete="off" className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            </label>
            <button type="submit" disabled={status === "saving"} className="focus-ring rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
              {status === "saving" ? t({ en: "Saving…", zh: "儲存中…", zhHans: "储存中…" }) : t({ en: "Save policy", zh: "儲存策略", zhHans: "储存策略" })}
            </button>
          </form>
        ) : null}
      </div>

      <div id="nova-run-history" className="glass-panel min-w-0 scroll-mt-24 overflow-hidden p-5">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Redacted run history", zh: "已遮蔽 run 紀錄", zhHans: "已遮蔽 run 纪录" })}</h2>
        <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3">{t({ en: "Time", zh: "時間", zhHans: "时间" })}</th>
                <th>{t({ en: "User", zh: "用戶", zhHans: "用户" })}</th>
                <th>{t({ en: "Surface", zh: "範圍", zhHans: "范围" })}</th>
                <th>{t({ en: "Action", zh: "動作", zhHans: "动作" })}</th>
                <th>{t({ en: "Status", zh: "狀態", zhHans: "状态" })}</th>
                <th>{t({ en: "Preview", zh: "預覽", zhHans: "预览" })}</th>
                <th>{t({ en: "Flags", zh: "旗標", zhHans: "旗标" })}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
              {state?.runs.map((run) => (
                <tr key={run.id}>
                  <td className="py-3 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(run.createdAt, language)}</td>
                  <td className="font-black text-slate-950 dark:text-white">{run.userName}<span className="ml-2 text-xs font-bold text-slate-400">{run.role}</span></td>
                  <td className="font-semibold text-slate-600 dark:text-slate-300">{run.surface}</td>
                  <td className="font-semibold text-slate-600 dark:text-slate-300">{run.action}</td>
                  <td><StatusPill value={statusLabel(run.status)} /></td>
                  <td className="max-w-[18rem] whitespace-normal break-words font-semibold leading-6 text-slate-600 dark:text-slate-300">{run.selectedTextPreview}</td>
                  <td className="max-w-[14rem] whitespace-normal break-words text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">{run.policyFlags.join(", ") || "-"}</td>
                </tr>
              ))}
              {state && !state.runs.length ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "No AI Tutor runs yet.", zh: "暫無 AI Tutor run。", zhHans: "暂无 AI Tutor run。" })}
                  </td>
                </tr>
              ) : null}
              {!state && status === "loading" ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "Loading AI Tutor runs…", zh: "正在載入 AI Tutor run…", zhHans: "正在载入 AI Tutor run…" })}
                  </td>
                </tr>
              ) : null}
              {!state && status === "error" ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                    {t({ en: "AI Tutor governance data is unavailable.", zh: "AI Tutor 治理資料暫時未能使用。", zhHans: "AI Tutor 治理资料暂时未能使用。" })}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function AiTutorTranscriptAccessPanel() {
  const { language, t } = useSettings();
  const [events, setEvents] = useState<AITutorTranscriptAccessSummary[] | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  async function loadAccessLog() {
    setStatus("loading");
    try {
      const response = await fetch("/api/teacher/ai-tutor-transcript-access?limit=80", {
        cache: "no-store",
        credentials: "same-origin"
      });
      const payload = await response.json() as { data?: { events: AITutorTranscriptAccessSummary[] } };
      if (!response.ok || !payload.data) throw new Error("Could not load transcript access log.");
      setEvents(payload.data.events);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void loadAccessLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="glass-panel min-w-0 overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Transcript access log", zh: "對話查看紀錄", zhHans: "对话查看纪录" })}</h2>
          <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({ en: "Every time a teacher opens a student's AI Tutor conversation is recorded here.", zh: "每次教師開啟學生 AI Tutor 對話都會記錄於此。", zhHans: "每次教师开启学生 AI Tutor 对话都会记录于此。" })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAccessLog()}
          className="focus-ring rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
        >
          {status === "loading" ? t({ en: "Loading…", zh: "載入中…", zhHans: "载入中…" }) : t({ en: "Refresh", zh: "重新整理", zhHans: "重新整理" })}
        </button>
      </div>

      <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-3">{t({ en: "Time", zh: "時間", zhHans: "时间" })}</th>
              <th>{t({ en: "Viewer", zh: "查看者", zhHans: "查看者" })}</th>
              <th>{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th>
              <th>{t({ en: "Messages", zh: "訊息數", zhHans: "讯息数" })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
            {events?.map((event) => (
              <tr key={event.id}>
                <td className="py-3 text-xs font-bold text-slate-500 dark:text-slate-400">{formatDate(event.createdAt, language)}</td>
                <td className="font-black text-slate-950 dark:text-white">{event.viewerName}<span className="ml-2 text-xs font-bold text-slate-400">{event.viewerRole}</span></td>
                <td className="font-semibold text-slate-600 dark:text-slate-300">{event.studentName}</td>
                <td className="font-black text-slate-950 dark:text-white">{event.messageCount}</td>
              </tr>
            ))}
            {events && !events.length ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                  {t({ en: "No transcripts have been opened yet.", zh: "尚未有人開啟過對話。", zhHans: "尚未有人开启过对话。" })}
                </td>
              </tr>
            ) : null}
            {!events && status === "loading" ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                  {t({ en: "Loading access log…", zh: "正在載入查看紀錄…", zhHans: "正在载入查看纪录…" })}
                </td>
              </tr>
            ) : null}
            {!events && status === "error" ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                  {t({ en: "Transcript access log is unavailable.", zh: "對話查看紀錄暫時未能使用。", zhHans: "对话查看纪录暂时未能使用。" })}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ArchiveReadyPanel({ archive }: { archive: TermArchive }) {
  const { t } = useSettings();

  return (
    <section className="glass-panel min-w-0 border-emerald-300/45 bg-emerald-400/10 p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-100">{t({ en: "Archive ready", zh: "歸檔已就緒", zhHans: "归档已就绪" })}</p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-white">{archive.termLabel}</p>
          <p className="mt-1 break-words text-xs font-bold text-emerald-900 dark:text-emerald-100">
            {archive.className} · {archive.snapshot.studentCount} {t({ en: "students", zh: "學生", zhHans: "学生" })} · {archive.snapshot.assignmentCount} {t({ en: "assignments", zh: "作業", zhHans: "作业" })}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Link href={archive.exportUrl} className="focus-ring rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white dark:bg-white dark:text-slate-950">
            {t({ en: "Download archive", zh: "下載歸檔", zhHans: "下载归档" })}
          </Link>
          <a href={`#archive-${archive.id}`} className="focus-ring rounded-full border border-emerald-300/70 bg-white/75 px-4 py-2 text-xs font-black text-emerald-900 dark:border-emerald-200/30 dark:bg-white/[0.08] dark:text-emerald-100">
            {t({ en: "Open snapshot", zh: "查看快照", zhHans: "查看快照" })}
          </a>
        </div>
      </div>
    </section>
  );
}

export function TeacherOperationsView({
  data,
  initialTab = "notices"
}: {
  data: TeacherOperationsData;
  initialTab?: OperationsTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, t, text } = useSettings();
  const queryTab = searchParams.get("tab");
  const resolvedInitialTab = tabs.some((tab) => tab.id === queryTab) ? (queryTab as OperationsTab) : initialTab;
  const [activeTab, setActiveTab] = useState<OperationsTab>(resolvedInitialTab);
  const [message, setMessage] = useState("");
  const [rosterCsv, setRosterCsv] = useState(sampleRosterCsv);
  const [validation, setValidation] = useState<TeacherRosterImportValidation | null>(null);
  const [importCredentials, setImportCredentials] = useState<ProvisioningCredential[]>([]);
  const [credentialStatus, setCredentialStatus] = useState("");
  const [createdNotice, setCreatedNotice] = useState<TeacherNotice | null>(null);
  const [createdArchive, setCreatedArchive] = useState<TermArchive | null>(null);
  const [latestReminderRuns, setLatestReminderRuns] = useState<TeacherReminderRun[] | null>(null);
  const [prepTeamOverrides, setPrepTeamOverrides] = useState<Record<string, PrepTeam>>({});
  const [selectedPrepTeamId, setSelectedPrepTeamId] = useState(data.prepTeams[0]?.id ?? "");
  const [createdPrepTeamId, setCreatedPrepTeamId] = useState("");
  const [createdPrepShareId, setCreatedPrepShareId] = useState("");
  const selectedClass = useMemo(() => data.classes.find((teacherClass) => teacherClass.id === data.selectedClassId) ?? data.classes[0] ?? null, [data.classes, data.selectedClassId]);
  const activeCreatedNotice = createdNotice?.classId === selectedClass?.id ? createdNotice : null;
  const activeCreatedArchive = createdArchive?.classId === selectedClass?.id ? createdArchive : null;
  const visiblePrepTeams = useMemo(() => {
    const sourceIds = new Set(data.prepTeams.map((team) => team.id));
    const localTeams = Object.values(prepTeamOverrides).filter((team) => !sourceIds.has(team.id));
    return [
      ...localTeams,
      ...data.prepTeams.map((team) => prepTeamOverrides[team.id] ?? team)
    ];
  }, [data.prepTeams, prepTeamOverrides]);
  const selectedPrepTeam = visiblePrepTeams.find((team) => team.id === selectedPrepTeamId) ?? visiblePrepTeams[0] ?? null;
  const highlightedPrepTeam = createdPrepTeamId ? visiblePrepTeams.find((team) => team.id === createdPrepTeamId) ?? null : null;
  const visibleNotices = useMemo(() => {
    if (!activeCreatedNotice) return data.notices;
    return [activeCreatedNotice, ...data.notices.filter((notice) => notice.id !== activeCreatedNotice.id)];
  }, [activeCreatedNotice, data.notices]);
  const visibleArchives = useMemo(() => {
    if (!activeCreatedArchive) return data.termArchives;
    return [activeCreatedArchive, ...data.termArchives.filter((archive) => archive.id !== activeCreatedArchive.id)];
  }, [activeCreatedArchive, data.termArchives]);

  function setTab(tab: OperationsTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    router.replace(`/teacher/operations/${tabPathById[tab]}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  async function createNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    // React clears event.currentTarget once the synchronous phase of the
    // handler returns, so keep the element to reset it after the await.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classId: selectedClass?.id,
        channelId: form.get("channelId"),
        audience: form.get("audience"),
        subject: form.get("subject"),
        body: form.get("body"),
        dueAt: form.get("dueAt")
      })
    });
    const payload = await response.json().catch(() => null) as { notice?: TeacherNotice; error?: string } | null;
    setMessage(response.ok ? t({ en: "Notice draft created.", zh: "通知草稿已建立。", zhHans: "通知草稿已建立。" }) : t({ en: "Could not create notice.", zh: "暫時未能建立通知。", zhHans: "暂时未能建立通知。" }));
    if (response.ok && payload?.notice) {
      setCreatedNotice(payload.notice);
      formElement.reset();
    }
    router.refresh();
  }

  async function sendNotice(noticeId: string) {
    const response = await fetch(`/api/teacher/notices/${encodeURIComponent(noticeId)}/deliveries`, { method: "POST" });
    const payload = await response.json().catch(() => null) as { notice?: TeacherNotice; error?: string } | null;
    if (response.ok && payload?.notice && createdNotice?.id === payload.notice.id) {
      setCreatedNotice(payload.notice);
    }
    setMessage(response.ok ? t({ en: "Notice send attempt recorded.", zh: "通知發送記錄已更新。", zhHans: "通知发送记录已更新。" }) : t({ en: "Could not send notice.", zh: "暫時未能發送通知。", zhHans: "暂时未能发送通知。" }));
    router.refresh();
  }

  async function runReminders(manual: boolean, assignmentId?: string) {
    setLatestReminderRuns(null);
    const response = await fetch("/api/teacher/reminder-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: selectedClass?.id, assignmentId, manual })
    });
    const payload = await response.json().catch(() => null) as { runs?: TeacherReminderRun[]; error?: string } | null;
    if (response.ok && payload?.runs) {
      setLatestReminderRuns(payload.runs);
    }
    setMessage(response.ok ? t({ en: "Reminder run completed.", zh: "提醒任務已完成。", zhHans: "提醒任务已完成。" }) : t({ en: "Could not run reminders.", zh: "暫時未能執行提醒。", zhHans: "暂时未能执行提醒。" }));
    router.refresh();
  }

  async function validateRoster(commit = false) {
    if (!selectedClass) return;
    setCredentialStatus("");
    if (!commit) setImportCredentials([]);
    const endpoint = commit ? "commit" : "validate";
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(selectedClass.id)}/roster-import/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: rosterCsv })
    });
    const payload = await response.json().catch(() => null) as { validation?: TeacherRosterImportValidation; credentials?: ProvisioningCredential[] } | null;
    if (payload?.validation) setValidation(payload.validation);
    const nextCredentials = commit && response.ok ? payload?.credentials ?? [] : [];
    setImportCredentials(nextCredentials);
    setMessage(response.ok
      ? commit
        ? nextCredentials.length
          ? t({ en: `Roster import committed. ${nextCredentials.length} login slips are ready.`, zh: `花名冊已導入，已生成 ${nextCredentials.length} 份登入單。`, zhHans: `花名册已导入，已生成 ${nextCredentials.length} 份登录单。` })
          : t({ en: "Roster import committed. No new temporary accounts were created.", zh: "花名冊已導入，沒有新增臨時帳號。", zhHans: "花名册已导入，没有新增临时账号。" })
        : t({ en: "Roster CSV validated.", zh: "CSV 驗證完成。", zhHans: "CSV 验证完成。" })
      : t({ en: "Roster import needs attention.", zh: "花名冊導入需要修正。", zhHans: "花名册导入需要修正。" }));
    if (!commit || !nextCredentials.length) {
      router.refresh();
    }
  }

  async function copyImportCredentials() {
    if (!importCredentials.length) return;
    try {
      await navigator.clipboard.writeText(credentialsToCsv(importCredentials));
      setCredentialStatus(t({ en: "Credential CSV copied.", zh: "登入單 CSV 已複製。", zhHans: "登录单 CSV 已复制。" }));
    } catch {
      setCredentialStatus(t({ en: "Could not copy. Use Download CSV instead.", zh: "暫時未能複製，請改用下載 CSV。", zhHans: "暂时未能复制，请改用下载 CSV。" }));
    }
  }

  function downloadImportCredentials() {
    if (!importCredentials.length) return;
    const blob = new Blob([credentialsToCsv(importCredentials)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedClass?.name ?? "class"}-temporary-logins.csv`.replace(/[^\w.-]+/g, "-");
    anchor.click();
    URL.revokeObjectURL(url);
    setCredentialStatus(t({ en: "Credential CSV downloaded.", zh: "登入單 CSV 已下載。", zhHans: "登录单 CSV 已下载。" }));
  }

  async function addCollaborator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(selectedClass.id)}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherUsername: form.get("teacherUsername"), role: form.get("role") })
    });
    setMessage(response.ok ? t({ en: "Collaborator saved.", zh: "協作教師已儲存。", zhHans: "协作教师已储存。" }) : t({ en: "Could not save collaborator.", zh: "暫時未能儲存協作教師。", zhHans: "暂时未能储存协作教师。" }));
    if (response.ok) formElement.reset();
    router.refresh();
  }

  async function createPrepTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/teacher/prep-teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), description: form.get("description"), grade: form.get("grade") || undefined })
    });
    const payload = await response.json().catch(() => null) as { team?: PrepTeam; error?: string } | null;
    setMessage(response.ok ? t({ en: "Prep team created.", zh: "備課組已建立。", zhHans: "备课组已建立。" }) : t({ en: "Could not create prep team.", zh: "暫時未能建立備課組。", zhHans: "暂时未能建立备课组。" }));
    if (response.ok && payload?.team) {
      setPrepTeamOverrides((current) => ({ [payload.team!.id]: payload.team!, ...current }));
      setSelectedPrepTeamId(payload.team.id);
      setCreatedPrepTeamId(payload.team.id);
      setCreatedPrepShareId("");
      formElement.reset();
    }
    router.refresh();
  }

  async function createPrepTeamShare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPrepTeam) return;
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/teacher/prep-teams/${encodeURIComponent(selectedPrepTeam.id)}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: form.get("kind"),
        title: form.get("title"),
        targetId: form.get("targetId")
      })
    });
    const payload = await response.json().catch(() => null) as { team?: PrepTeam; share?: { id: string }; error?: string } | null;
    setMessage(response.ok ? t({ en: "Prep team share added.", zh: "備課組共享已加入。", zhHans: "备课组共享已加入。" }) : t({ en: "Could not add prep team share.", zh: "暫時未能加入共享資料。", zhHans: "暂时未能加入共享资料。" }));
    if (response.ok && payload?.team) {
      setPrepTeamOverrides((current) => ({ ...current, [payload.team!.id]: payload.team! }));
      setSelectedPrepTeamId(payload.team.id);
      setCreatedPrepTeamId(payload.team.id);
      setCreatedPrepShareId(payload.share?.id ?? "");
      formElement.reset();
    }
    router.refresh();
  }

  async function createArchive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/teacher/classes/${encodeURIComponent(selectedClass.id)}/term-archives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termLabel: form.get("termLabel") })
    });
    const payload = await response.json().catch(() => null) as { archive?: TermArchive; error?: string } | null;
    setMessage(response.ok ? t({ en: "Archive snapshot created.", zh: "學期快照已建立。", zhHans: "学期快照已建立。" }) : t({ en: "Could not create archive.", zh: "暫時未能建立歸檔。", zhHans: "暂时未能建立归档。" }));
    if (response.ok && payload?.archive) {
      setCreatedArchive(payload.archive);
      formElement.reset();
    }
    router.refresh();
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="glass-panel min-w-0 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="break-words text-sm font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300 sm:tracking-[0.24em]">{t({ en: "Operations", zh: "校務落地", zhHans: "校务落地" })}</p>
            <h1 className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{selectedClass ? selectedClass.name : t({ en: "Teacher operations", zh: "教師校務工作台", zhHans: "教师校务工作台" })}</h1>
            {selectedClass ? <p className="mt-2 break-words text-sm font-bold text-slate-500 dark:text-slate-400">{formatGradeLabel(selectedClass.grade, language, true)} · {selectedClass.academicYear}</p> : null}
          </div>
          <div className="max-w-full rounded-2xl border border-cyan-300/45 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-800 dark:text-cyan-100">
            {data.wecom.enabled ? t({ en: "WeCom enabled", zh: "企業微信已啟用", zhHans: "企业微信已启用" }) : t({ en: "WeCom disabled", zh: "企業微信未啟用", zhHans: "企业微信未启用" })}
          </div>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-5">
          <OperationsMetric label={t({ en: "Notices", zh: "通知", zhHans: "通知" })} value={data.totals.notices} />
          <OperationsMetric label={t({ en: "Pending ack", zh: "待回執", zhHans: "待回执" })} value={data.totals.pendingAcknowledgements} />
          <OperationsMetric label={t({ en: "Missing work", zh: "未交", zhHans: "未交" })} value={data.totals.missingWork} />
          <OperationsMetric label={t({ en: "Collaborators", zh: "協作者", zhHans: "协作者" })} value={data.totals.collaborators} />
          <OperationsMetric label={t({ en: "Archives", zh: "歸檔", zhHans: "归档" })} value={data.totals.archives} />
        </div>

        <div className="mt-5 flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1" role="tablist" aria-label={t({ en: "Operations tabs", zh: "校務分頁", zhHans: "校务分页" })}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "focus-ring shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition",
                activeTab === tab.id
                  ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                  : "border border-slate-200/80 bg-white/70 text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
              )}
            >
              {text(tab.label)}
            </button>
          ))}
        </div>
        {message ? <p className="mt-4 break-words rounded-2xl border border-cyan-300/40 bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-800 dark:text-cyan-100">{message}</p> : null}
      </section>

      {activeTab === "notices" ? (
        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <form onSubmit={createNotice} className="glass-panel grid min-w-0 h-fit gap-4 p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Create notice", zh: "建立通知", zhHans: "建立通知" })}</h2>
            <label className="grid min-w-0 gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "WeCom channel", zh: "企業微信群", zhHans: "企业微信群" })}</span>
              <select name="channelId" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
                {data.wecom.channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.name}{channel.configured ? "" : " (not configured)"}</option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-2">
              <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Audience", zh: "對象", zhHans: "对象" })}</span>
              <select name="audience" defaultValue="parents" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
                <option value="parents">{t({ en: "Parents", zh: "家長", zhHans: "家长" })}</option>
                <option value="students">{t({ en: "Students", zh: "學生", zhHans: "学生" })}</option>
                <option value="both">{t({ en: "Parents and students", zh: "家長與學生", zhHans: "家长与学生" })}</option>
              </select>
            </label>
            <input name="subject" required placeholder={t({ en: "Notice subject", zh: "通知標題", zhHans: "通知标题" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            <textarea name="body" required rows={5} placeholder={t({ en: "Message body", zh: "通知內容", zhHans: "通知内容" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            <input name="dueAt" type="datetime-local" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            <button className="focus-ring min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Create draft", zh: "建立草稿", zhHans: "建立草稿" })}</button>
          </form>
          <div className="grid min-w-0 gap-4">
            {activeCreatedNotice ? <NoticeReadyPanel notice={activeCreatedNotice} onSend={sendNotice} /> : null}
            {visibleNotices.map((notice) => <NoticeCard key={notice.id} notice={notice} onSend={sendNotice} />)}
            {!visibleNotices.length ? <div className="glass-panel p-6 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "No notices yet.", zh: "暫無通知。", zhHans: "暂无通知。" })}</div> : null}
          </div>
        </section>
      ) : null}

      {activeTab === "reminders" ? (
        <section className="glass-panel min-w-0 overflow-hidden p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-black text-slate-950 dark:text-white">{t({ en: "Missing-work reminders", zh: "未交作業提醒", zhHans: "未交作业提醒" })}</h2>
              <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">{data.reminderPolicy.thresholds.join(" · ")}</p>
            </div>
            <button onClick={() => runReminders(false)} className="focus-ring min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="button">
              {t({ en: "Run due reminders", zh: "執行到期提醒", zhHans: "执行到期提醒" })}
            </button>
          </div>
          {latestReminderRuns ? <ReminderRunReadyPanel runs={latestReminderRuns} missingWork={data.missingWork} /> : null}
          <div className="mt-5 min-w-0 max-w-full">
            <MissingWorkTable items={data.missingWork} onRunManual={(assignmentId) => runReminders(true, assignmentId)} />
          </div>
        </section>
      ) : null}

      {activeTab === "roster" ? (
        <div className="grid min-w-0 gap-4">
          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="glass-panel grid min-w-0 h-fit gap-4 p-5">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "CSV import", zh: "CSV 導入", zhHans: "CSV 导入" })}</h2>
              <textarea value={rosterCsv} onChange={(event) => setRosterCsv(event.target.value)} rows={12} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-mono text-xs dark:border-white/10 dark:bg-white/[0.06]" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => validateRoster(false)} className="focus-ring min-w-0 rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">{t({ en: "Validate", zh: "驗證", zhHans: "验证" })}</button>
                <button type="button" onClick={() => validateRoster(true)} className="focus-ring min-w-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Commit import", zh: "確認導入", zhHans: "确认导入" })}</button>
              </div>
              {validation ? (
                <div className="soft-panel min-w-0 break-words p-4 text-sm font-bold text-slate-600 dark:text-slate-300">
                  {validation.totals.valid}/{validation.totals.rows} {t({ en: "valid rows", zh: "有效行", zhHans: "有效行" })} · {validation.totals.creates} {t({ en: "creates", zh: "新增", zhHans: "新增" })} · {validation.totals.updates} {t({ en: "updates", zh: "更新", zhHans: "更新" })}
                </div>
              ) : null}
            </div>
            <div className="glass-panel min-w-0 overflow-hidden p-5">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Student numbers and seats", zh: "學號與座位表", zhHans: "学号与座位表" })}</h2>
              <div className="mt-4 min-w-0 max-w-full overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3">{t({ en: "Student", zh: "學生", zhHans: "学生" })}</th>
                      <th>{t({ en: "Parent link", zh: "家長綁定", zhHans: "家长绑定" })}</th>
                      <th>{t({ en: "Student no / seat / row / column / order", zh: "學號 / 座位 / 行 / 列 / 排序", zhHans: "学号 / 座位 / 行 / 列 / 排序" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-white/10">
                    {data.roster.map((row) => <RosterRow key={row.enrollmentId} row={row} />)}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <RosterCredentialPanel credentials={importCredentials} onCopy={copyImportCredentials} onDownload={downloadImportCredentials} status={credentialStatus} />
        </div>
      ) : null}

      {activeTab === "collaboration" ? (
        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          <form onSubmit={addCollaborator} className="glass-panel grid min-w-0 h-fit gap-4 p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Class collaborators", zh: "任課教師協作", zhHans: "任课教师协作" })}</h2>
            <input name="teacherUsername" required placeholder={t({ en: "Teacher username or email", zh: "教師用戶名或電郵", zhHans: "教师用户名或邮箱" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            <select name="role" defaultValue="co-teacher" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
              <option value="co-teacher">{t({ en: "Co-teacher", zh: "協作教師", zhHans: "协作教师" })}</option>
              <option value="viewer">{t({ en: "Viewer", zh: "只讀", zhHans: "只读" })}</option>
            </select>
            <button className="focus-ring min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Save collaborator", zh: "儲存協作者", zhHans: "储存协作者" })}</button>
            <div className="grid min-w-0 gap-2">
              {data.collaborators.map((collaborator) => (
                <div key={collaborator.id} className="soft-panel flex min-w-0 flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="break-words font-black text-slate-950 dark:text-white">{collaborator.teacherName}</p>
                    <p className="break-words text-xs font-bold text-slate-500 dark:text-slate-400">{collaborator.teacherUsername}</p>
                  </div>
                  <StatusPill value={collaborator.role} />
                </div>
              ))}
            </div>
          </form>

          <div className="grid min-w-0 gap-4">
            <form onSubmit={createPrepTeam} className="glass-panel grid min-w-0 h-fit gap-4 p-5">
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Prep team sharing", zh: "備課組共享", zhHans: "备课组共享" })}</h2>
              <input name="name" required placeholder={t({ en: "Prep team name", zh: "備課組名稱", zhHans: "备课组名称" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
              <input name="description" placeholder={t({ en: "Description", zh: "描述", zhHans: "描述" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
              <select name="grade" defaultValue={selectedClass?.grade ?? ""} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
                <option value="">{t({ en: "No grade lock", zh: "不限年級", zhHans: "不限年级" })}</option>
                {data.classes.map((teacherClass) => <option key={teacherClass.id} value={teacherClass.grade}>{formatGradeLabel(teacherClass.grade, language, true)}</option>)}
              </select>
              <button className="focus-ring min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Create prep team", zh: "建立備課組", zhHans: "建立备课组" })}</button>
            </form>

            {highlightedPrepTeam ? <PrepTeamReadyPanel team={highlightedPrepTeam} shareId={createdPrepShareId} /> : null}

            {selectedPrepTeam ? (
              <form onSubmit={createPrepTeamShare} className="glass-panel grid min-w-0 gap-4 p-5">
                <div className="min-w-0">
                  <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300">{t({ en: "Share handoff", zh: "共享交付", zhHans: "共享交付" })}</p>
                  <h2 className="mt-2 break-words text-xl font-black text-slate-950 dark:text-white">{t({ en: "Add to prep team", zh: "加入備課組", zhHans: "加入备课组" })}</h2>
                </div>
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Team", zh: "備課組", zhHans: "备课组" })}</span>
                  <select value={selectedPrepTeam.id} onChange={(event) => setSelectedPrepTeamId(event.target.value)} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
                    {visiblePrepTeams.map((team) => <option key={team.id} value={team.id}>{text(team.name)}</option>)}
                  </select>
                </label>
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t({ en: "Kind", zh: "類型", zhHans: "类型" })}</span>
                  <select name="kind" defaultValue="resource" className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]">
                    {prepTeamShareKindOptions.map((option) => <option key={option.value} value={option.value}>{text(option.label)}</option>)}
                  </select>
                </label>
                <input name="title" required placeholder={t({ en: "Shared item title", zh: "共享項目標題", zhHans: "共享项目标题" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
                <input name="targetId" placeholder={t({ en: "Optional resource, assessment, or lesson-kit id", zh: "可選資源、評估或備課包 ID", zhHans: "可选资源、评估或备课包 ID" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
                <button className="focus-ring min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Add share", zh: "加入共享", zhHans: "加入共享" })}</button>
              </form>
            ) : null}

            <section className="glass-panel min-w-0 p-5">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-xs font-black uppercase tracking-[0.14em] text-cyan-600 dark:text-cyan-300">{t({ en: "Prep workspace", zh: "備課工作區", zhHans: "备课工作区" })}</p>
                  <h2 className="mt-2 break-words text-xl font-black text-slate-950 dark:text-white">{t({ en: "Shared teams and materials", zh: "共享備課組與材料", zhHans: "共享备课组与材料" })}</h2>
                </div>
                <p className="shrink-0 text-xs font-black text-slate-500 dark:text-slate-400">{visiblePrepTeams.length} {t({ en: "teams", zh: "備課組", zhHans: "备课组" })}</p>
              </div>
              <div className="mt-4 grid min-w-0 gap-3">
                {visiblePrepTeams.map((team) => (
                  <article id={`prep-team-${team.id}`} key={team.id} className="soft-panel min-w-0 scroll-mt-24 p-4">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words font-black text-slate-950 dark:text-white">{text(team.name)}</p>
                        <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{team.members.map((member) => member.teacherName).join(", ")}</p>
                      </div>
                      <button type="button" onClick={() => setSelectedPrepTeamId(team.id)} className="focus-ring shrink-0 rounded-full border border-slate-200/80 bg-white/75 px-3 py-2 text-xs font-black text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
                        {t({ en: "Select", zh: "選取", zhHans: "选取" })}
                      </button>
                    </div>
                    <p className="mt-3 break-words text-xs font-bold text-slate-500 dark:text-slate-400">{text(team.description)}</p>
                    <div className="mt-3 grid min-w-0 gap-2">
                      {team.shares.slice(0, 4).map((share) => (
                        <div id={`prep-share-${share.id}`} key={share.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 scroll-mt-24 dark:border-white/10 dark:bg-white/[0.06]">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="min-w-0 break-words text-sm font-black text-slate-950 dark:text-white">{text(share.title)}</p>
                            <StatusPill value={share.kind} />
                          </div>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500 dark:text-slate-400">
                            {share.createdByName} · {formatDate(share.createdAt, language)}{share.targetId ? ` · ${share.targetId}` : ""}
                          </p>
                        </div>
                      ))}
                      {!team.shares.length ? (
                        <p className="rounded-2xl border border-dashed border-slate-300/80 px-3 py-4 text-sm font-bold text-slate-500 dark:border-white/15 dark:text-slate-400">{t({ en: "No shared materials yet.", zh: "尚未有共享材料。", zhHans: "尚未有共享材料。" })}</p>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!visiblePrepTeams.length ? (
                  <div className="soft-panel min-w-0 p-5 text-sm font-bold text-slate-500 dark:text-slate-400">{t({ en: "Create a prep team to start sharing materials.", zh: "建立備課組後即可共享材料。", zhHans: "建立备课组后即可共享材料。" })}</div>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === "ai-governance" ? (
        <div className="grid min-w-0 gap-4">
          <NovaLensGovernancePanel />
          <AiTutorTranscriptAccessPanel />
        </div>
      ) : null}

      {activeTab === "archive" ? (
        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <form onSubmit={createArchive} className="glass-panel grid min-w-0 h-fit gap-4 p-5">
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{t({ en: "Create read-only snapshot", zh: "建立只讀快照", zhHans: "建立只读快照" })}</h2>
            <input name="termLabel" required placeholder={t({ en: "2025-2026 Term 1", zh: "2025-2026 上學期", zhHans: "2025-2026 上学期" })} className="focus-ring min-w-0 w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold dark:border-white/10 dark:bg-white/[0.06]" />
            <button className="focus-ring min-w-0 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950" type="submit">{t({ en: "Archive term", zh: "歸檔學期", zhHans: "归档学期" })}</button>
          </form>
          <div className="grid min-w-0 gap-3">
            {activeCreatedArchive ? <ArchiveReadyPanel archive={activeCreatedArchive} /> : null}
            {visibleArchives.map((archive) => (
              <article id={`archive-${archive.id}`} key={archive.id} className="glass-panel min-w-0 scroll-mt-24 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-xl font-black text-slate-950 dark:text-white">{archive.termLabel}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">{archive.className} · {formatDate(archive.createdAt, language)}</p>
                  </div>
                  <Link href={archive.exportUrl} className="focus-ring shrink-0 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{t({ en: "Download", zh: "下載", zhHans: "下载" })}</Link>
                </div>
                <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-5">
                  {Object.entries(archive.snapshot).map(([key, value]) => (
                    <div key={key} className="soft-panel min-w-0 p-3">
                      <p className="break-words text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{key}</p>
                      <p className="mt-2 text-xl font-black text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
