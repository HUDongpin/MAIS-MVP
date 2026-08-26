"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import { isValidGuardianInviteToken } from "@/lib/parentConstraints";
import type { GuardianLink, Language, LocalizedText } from "@/types";

export function guardianInvitationIssuePath(classId: string, studentId: string) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/guardian-invitations`;
}

export function guardianLinkRevokePath(classId: string, studentId: string, linkId: string) {
  return `/api/teacher/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/guardian-links/${encodeURIComponent(linkId)}`;
}

export function guardianExpectedUserHeaders(userId: string) {
  return { "X-MAIS-Expected-User-Id": userId };
}

export function guardianAccessErrorCopy(
  status: number | "network",
  retryAfterSeconds?: number
): LocalizedText {
  if (status === "network") {
    return {
      en: "The network request did not complete. Check your connection and try again.",
      zh: "網絡請求未能完成，請檢查連線後重試。"
    };
  }
  if (status === 400) return { en: "Check the request and try again.", zh: "請檢查資料後重試。" };
  if (status === 403) return { en: "You do not have permission for this student and class.", zh: "你沒有此學生及班級的操作權限。" };
  if (status === 404) return { en: "The student, class, or guardian link was not found.", zh: "找不到學生、班級或家長連結。" };
  if (status === 409) return { en: "Guardian access changed before this request completed. Refresh and try again.", zh: "家長存取狀態已變更，請重新整理後重試。" };
  if (status === 410) return { en: "This invitation expired or was revoked. Issue a new one.", zh: "此邀請已過期或被撤銷，請重新發出。" };
  if (status === 429) {
    const seconds = Number.isFinite(retryAfterSeconds) && Number(retryAfterSeconds) > 0
      ? Math.ceil(Number(retryAfterSeconds))
      : 60;
    return {
      en: `Too many requests. Try again in ${seconds} seconds.`,
      zh: `請求過於頻密，請於 ${seconds} 秒後重試。`
    };
  }
  return {
    en: "Guardian access is temporarily unavailable. Try again later.",
    zh: "家長存取功能暫時無法使用，請稍後重試。"
  };
}

function expiryLabel(value: string, language: Language) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return value;
  const locale = language === "zh-Hans" ? "zh-CN" : language === "zh" ? "zh-HK" : "en-HK";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong"
  }).format(timestamp);
}

type RevealedInvitation = {
  token: string;
  version: number;
  expiresAt: string;
};

export function readRevealedGuardianInvitation(value: unknown): RevealedInvitation | null {
  if (typeof value !== "object" || value === null) return null;
  const invitation = (value as { invitation?: unknown }).invitation;
  if (typeof invitation !== "object" || invitation === null) return null;
  const candidate = invitation as Partial<RevealedInvitation>;
  if (
    typeof candidate.token !== "string" ||
    !isValidGuardianInviteToken(candidate.token) ||
    !Number.isInteger(candidate.version) ||
    typeof candidate.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(candidate.expiresAt))
  ) return null;
  return {
    token: candidate.token,
    version: candidate.version as number,
    expiresAt: candidate.expiresAt
  };
}

type GuardianAccessControlsProps = {
  classId: string;
  studentId: string;
  guardianLinks: GuardianLink[];
};

export function GuardianAccessControls({ classId, studentId, guardianLinks }: GuardianAccessControlsProps) {
  const router = useRouter();
  const { currentUser, language, t } = useSettings();
  const expectedTeacherIdRef = useRef(currentUser?.role === "teacher" ? currentUser.id : null);
  const expectedTeacherId = expectedTeacherIdRef.current;
  const [busyOperation, setBusyOperation] = useState<"issue" | string | null>(null);
  const [revealedInvitation, setRevealedInvitation] = useState<RevealedInvitation | null>(null);
  const [hiddenLinkIds, setHiddenLinkIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<LocalizedText | null>(null);
  const [errorMessage, setErrorMessage] = useState<LocalizedText | null>(null);
  const activeLinks = guardianLinks.filter((link) => link.status === "active" && !hiddenLinkIds.includes(link.id));
  const isBusy = busyOperation !== null;

  const setResponseError = (response: Response) => {
    const retryAfter = Number(response.headers.get("Retry-After"));
    setErrorMessage(guardianAccessErrorCopy(response.status, retryAfter));
  };

  const issueInvitation = async () => {
    if (!classId || !expectedTeacherId || isBusy) return;
    setBusyOperation("issue");
    setRevealedInvitation(null);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(guardianInvitationIssuePath(classId, studentId), {
        method: "POST",
        headers: guardianExpectedUserHeaders(expectedTeacherId)
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setResponseError(response);
        return;
      }
      const invitation = readRevealedGuardianInvitation(payload);
      if (!invitation) {
        setErrorMessage(guardianAccessErrorCopy(503));
        return;
      }

      setRevealedInvitation(invitation);
      setStatusMessage({
        en: "A one-time guardian invitation was issued.",
        zh: "已發出一次性家長邀請。"
      });
      router.refresh();
    } catch {
      setErrorMessage(guardianAccessErrorCopy("network"));
    } finally {
      setBusyOperation(null);
    }
  };

  const copyInvitation = async () => {
    if (!revealedInvitation) return;
    setErrorMessage(null);
    try {
      await navigator.clipboard.writeText(revealedInvitation.token);
      setStatusMessage({ en: "Invitation code copied.", zh: "邀請碼已複製。" });
    } catch {
      setErrorMessage({
        en: "The code could not be copied automatically. Select and copy it manually.",
        zh: "未能自動複製邀請碼，請手動選取並複製。"
      });
    }
  };

  const revokeLink = async (link: GuardianLink) => {
    if (!classId || !expectedTeacherId || isBusy) return;
    const confirmed = window.confirm(t({
      en: `Revoke parent access for ${link.parentName}? Existing sessions will lose access immediately.`,
      zh: `確定撤銷 ${link.parentName} 的家長存取權嗎？現有存取將立即失效。`
    }));
    if (!confirmed) return;

    setBusyOperation(link.id);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const response = await fetch(guardianLinkRevokePath(classId, studentId, link.id), {
        method: "DELETE",
        headers: guardianExpectedUserHeaders(expectedTeacherId)
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setResponseError(response);
        return;
      }
      const invitation = readRevealedGuardianInvitation(payload);
      if (!invitation) {
        setErrorMessage(guardianAccessErrorCopy(503));
        router.refresh();
        return;
      }

      setHiddenLinkIds((current) => [...current, link.id]);
      setRevealedInvitation(invitation);
      setStatusMessage({
        en: `Parent access for ${link.parentName} was revoked. Copy the replacement one-time code now.`,
        zh: `已撤銷 ${link.parentName} 的家長存取權；請立即複製新的單次邀請碼。`
      });
      router.refresh();
    } catch {
      setErrorMessage(guardianAccessErrorCopy("network"));
    } finally {
      setBusyOperation(null);
    }
  };

  return (
    <section className="glass-panel p-5" aria-labelledby="guardian-access-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="guardian-access-heading" className="text-xl font-black text-slate-950 dark:text-white">
            {t({ en: "Parent access", zh: "家長端存取" })}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({
              en: "Issue a 24-hour, one-time code or revoke an active guardian link.",
              zh: "發出 24 小時有效的一次性邀請碼，或撤銷現有家長連結。"
            })}
          </p>
        </div>
        <button
          type="button"
          disabled={!classId || !expectedTeacherId || isBusy}
          onClick={issueInvitation}
          className="focus-ring rounded-full bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyOperation === "issue"
            ? t({ en: "Issuing…", zh: "發出中…" })
            : t({ en: "Issue / rotate code", zh: "發出／輪換邀請碼" })}
        </button>
      </div>

      {!classId ? (
        <p role="alert" className="mt-4 rounded-2xl border border-amber-300/55 bg-amber-400/10 p-3 text-sm font-bold text-amber-800 dark:text-amber-100">
          {t({ en: "Select an authorised class before managing parent access.", zh: "請先選擇獲授權的班級，才可管理家長存取。" })}
        </p>
      ) : null}

      {revealedInvitation ? (
        <div className="mt-4 rounded-2xl border border-cyan-300/55 bg-cyan-400/10 p-4">
          <p className="text-sm font-black text-cyan-900 dark:text-cyan-100">
            {t({ en: "Copy this code now. It will not be shown again.", zh: "請立即複製此邀請碼；離開後不會再次顯示。" })}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="min-w-0 break-all rounded-xl bg-white/80 px-3 py-2 text-base font-black tracking-[0.08em] text-slate-950 dark:bg-slate-950/70 dark:text-white">
              {revealedInvitation.token}
            </code>
            <button type="button" onClick={copyInvitation} className="focus-ring rounded-full border border-cyan-400/50 px-3 py-2 text-xs font-black">
              {t({ en: "Copy code", zh: "複製邀請碼" })}
            </button>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            {t({ en: "Expires", zh: "到期時間" })}: {expiryLabel(revealedInvitation.expiresAt, language)}
          </p>
        </div>
      ) : null}

      {statusMessage ? <p role="status" className="mt-4 text-sm font-bold text-emerald-700 dark:text-emerald-200">{t(statusMessage)}</p> : null}
      {errorMessage ? <p role="alert" className="mt-4 text-sm font-bold text-rose-700 dark:text-rose-200">{t(errorMessage)}</p> : null}

      <div className="mt-5 grid gap-2">
        {activeLinks.map((link) => (
          <div key={link.id} className="soft-panel flex flex-wrap items-center justify-between gap-3 p-3 text-sm font-bold">
            <div className="min-w-0">
              <p className="break-words text-slate-950 dark:text-white">{link.parentName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{link.relationship}</p>
            </div>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => revokeLink(link)}
              className="focus-ring rounded-full border border-rose-300/60 px-3 py-2 text-xs font-black text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-200"
            >
              {busyOperation === link.id ? t({ en: "Revoking…", zh: "撤銷中…" }) : t({ en: "Revoke", zh: "撤銷" })}
            </button>
          </div>
        ))}
        {!activeLinks.length ? (
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            {t({ en: "No parent accounts linked yet.", zh: "尚未綁定家長帳戶。" })}
          </p>
        ) : null}
      </div>
    </section>
  );
}
