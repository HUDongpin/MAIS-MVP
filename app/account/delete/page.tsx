"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  ACCOUNT_ERASURE_CONFIRMATION_PHRASE,
  clearLocalDataForErasedUser,
  type AccountErasureErrorCode,
  type AccountErasureReceipt
} from "@/lib/accountErasure";

const copy = {
  eyebrow: { en: "Account and data", zh: "帳戶與資料", zhHans: "账户与数据" },
  titleSelf: { en: "Delete your account", zh: "刪除你的帳戶", zhHans: "删除你的账户" },
  titleOther: { en: "Delete this learner's account", zh: "刪除此學生的帳戶", zhHans: "删除此学生的账户" },
  leadSelf: {
    en: "This permanently erases your account and everything you have done on MAIS. It happens straight away and cannot be undone.",
    zh: "此操作會永久刪除你的帳戶及你在 MAIS 的所有紀錄。刪除即時生效，且無法復原。",
    zhHans: "此操作会永久删除你的账户及你在 MAIS 的所有记录。删除立即生效，且无法恢复。"
  },
  leadOther: {
    en: "This permanently erases the learner's account and everything they have done on MAIS. It happens straight away and cannot be undone.",
    zh: "此操作會永久刪除該學生的帳戶及其在 MAIS 的所有紀錄。刪除即時生效，且無法復原。",
    zhHans: "此操作会永久删除该学生的账户及其在 MAIS 的所有记录。删除立即生效，且无法恢复。"
  },
  removedTitle: { en: "What is permanently deleted", zh: "會被永久刪除的資料", zhHans: "会被永久删除的数据" },
  removed: [
    { en: "The login, password, and profile", zh: "登入帳號、密碼及個人檔案", zhHans: "登录账号、密码及个人档案" },
    { en: "Every practice attempt, lesson progress, and mastery record", zh: "所有練習作答、課堂進度及掌握程度紀錄", zhHans: "所有练习作答、课堂进度及掌握程度记录" },
    { en: "All AI tutor conversations", zh: "所有 AI 導師對話紀錄", zhHans: "所有 AI 导师对话记录" },
    { en: "Uploaded photographs of work", zh: "已上載的作業相片", zhHans: "已上传的作业照片" },
    { en: "Reward points, game progress, and collections", zh: "獎勵分數、遊戲進度及收藏", zhHans: "奖励积分、游戏进度及收藏" },
    { en: "Messages about the learner", zh: "有關該學生的訊息", zhHans: "有关该学生的消息" }
  ],
  keptTitle: { en: "What is kept, with the link to this account removed", zh: "會保留但不再連結此帳戶的資料", zhHans: "会保留但不再关联此账户的数据" },
  kept: [
    { en: "Classes, lessons, and assignments, so other learners keep their work", zh: "班別、課堂及作業，讓其他學生保留其紀錄", zhHans: "班级、课堂及作业，让其他学生保留其记录" },
    { en: "Safety and AI-governance records, kept as evidence without the name, identifier, or any quoted words", zh: "安全及 AI 管治紀錄，會移除姓名、識別碼及引述內容後保留作為紀錄", zhHans: "安全及 AI 治理记录，会移除姓名、标识及引述内容后保留作为记录" }
  ],
  limitsTitle: { en: "Two limits worth knowing", zh: "兩項須留意的限制", zhHans: "两项须留意的限制" },
  limits: [
    { en: "Encrypted database backups keep the data until they age out of their retention window.", zh: "加密資料庫備份會保留資料，直至備份到期為止。", zhHans: "加密数据库备份会保留数据，直至备份到期为止。" },
    { en: "If your school has connected its own external learning-record system, we cannot delete data from that system. Ask the school to do so.", zh: "若學校已連接自家的外部學習紀錄系統，我們無法刪除該系統的資料，請聯絡學校處理。", zhHans: "若学校已连接自有的外部学习记录系统，我们无法删除该系统的数据，请联系学校处理。" }
  ],
  confirmLabel: {
    en: "Type the phrase below exactly to confirm",
    zh: "請完全照下方字句輸入以確認",
    zhHans: "请完全照下方字句输入以确认"
  },
  confirmHint: {
    en: "Type it exactly as shown, in capitals.",
    zh: "請以大階英文完全照樣輸入。",
    zhHans: "请以大写英文完全照样输入。"
  },
  submitSelf: { en: "Permanently delete my account", zh: "永久刪除我的帳戶", zhHans: "永久删除我的账户" },
  submitOther: { en: "Permanently delete this account", zh: "永久刪除此帳戶", zhHans: "永久删除此账户" },
  submitting: { en: "Deleting...", zh: "正在刪除...", zhHans: "正在删除..." },
  cancel: { en: "Cancel and go back", zh: "取消並返回", zhHans: "取消并返回" },
  doneTitle: { en: "The account has been deleted", zh: "帳戶已刪除", zhHans: "账户已删除" },
  doneSelf: {
    en: "Your account and data have been erased. You have been signed out.",
    zh: "你的帳戶及資料已刪除，並已登出。",
    zhHans: "你的账户及数据已删除，并已退出登录。"
  },
  doneOther: {
    en: "The learner's account and data have been erased.",
    zh: "該學生的帳戶及資料已刪除。",
    zhHans: "该学生的账户及数据已删除。"
  },
  doneRecords: { en: "Records deleted", zh: "已刪除紀錄", zhHans: "已删除记录" },
  doneUnlinked: { en: "Records kept but unlinked", zh: "已保留但解除連結的紀錄", zhHans: "已保留但解除关联的记录" },
  doneMedia: { en: "Files destroyed", zh: "已銷毀檔案", zhHans: "已销毁文件" },
  doneHome: { en: "Go to the home page", zh: "前往主頁", zhHans: "前往主页" },
  signedInAs: { en: "Signed in as", zh: "登入身分", zhHans: "登录身份" },
  needsSignIn: { en: "Sign in to manage account deletion.", zh: "請先登入以管理帳戶刪除。", zhHans: "请先登录以管理账户删除。" },
  signIn: { en: "Sign in", zh: "登入", zhHans: "登录" },
  privacyLink: { en: "Read the privacy policy", zh: "閱讀私隱政策", zhHans: "阅读隐私政策" }
} as const;

const errorCopy: Record<AccountErasureErrorCode, { en: string; zh: string; zhHans: string }> = {
  "confirmation-required": {
    en: "The confirmation phrase does not match. Type it exactly as shown.",
    zh: "確認字句不相符，請完全照樣輸入。",
    zhHans: "确认字句不相符，请完全照样输入。"
  },
  "subject-not-found": {
    en: "That account no longer exists. It may already have been deleted.",
    zh: "該帳戶已不存在，可能已被刪除。",
    zhHans: "该账户已不存在，可能已被删除。"
  },
  "requester-not-found": {
    en: "Your session has expired. Sign in again to continue.",
    zh: "你的登入狀態已過期，請重新登入。",
    zhHans: "你的登录状态已过期，请重新登录。"
  },
  "not-authorized": {
    en: "You may only delete your own account, a child linked to you, or a learner at your school.",
    zh: "你只可刪除自己的帳戶、已連結的子女帳戶，或你所屬學校的學生帳戶。",
    zhHans: "你只可删除自己的账户、已关联的子女账户，或你所属学校的学生账户。"
  },
  "seeded-account-protected": {
    en: "This is a built-in demo account. It is recreated automatically, so it cannot be deleted.",
    zh: "此為內建示範帳戶，系統會自動重建，故無法刪除。",
    zhHans: "此为内置演示账户，系统会自动重建，故无法删除。"
  },
  "media-erasure-failed": {
    en: "Stored files could not be deleted, so nothing was erased. Please try again in a moment.",
    zh: "未能刪除已儲存的檔案，故未有刪除任何資料，請稍後再試。",
    zhHans: "未能删除已保存的文件，故未删除任何数据，请稍后再试。"
  },
  "rate-limited": {
    en: "Too many deletion requests. Please wait a few minutes and try again.",
    zh: "刪除請求過於頻密，請稍候數分鐘再試。",
    zhHans: "删除请求过于频繁，请稍候数分钟再试。"
  },
  network: {
    en: "Could not reach the server. Nothing was deleted. Check your connection and try again.",
    zh: "無法連接伺服器，未有刪除任何資料。請檢查網絡連線後再試。",
    zhHans: "无法连接服务器，未删除任何数据。请检查网络连接后再试。"
  },
  unknown: {
    en: "The account could not be deleted. Nothing was erased. Please try again.",
    zh: "未能刪除帳戶，未有刪除任何資料，請再試一次。",
    zhHans: "未能删除账户，未删除任何数据，请再试一次。"
  }
};

function sumCounts(counts: Record<string, number> | undefined) {
  return Object.values(counts ?? {}).reduce((total, count) => total + count, 0);
}

export default function DeleteAccountPage() {
  const { currentUser, logout, t } = useSettings();
  // `undefined` means the query string has not been read yet. It matters: until
  // it resolves, a guardian's `?studentId=` flow would look like a self-delete,
  // and this form's submit is irreversible. The form is withheld until then.
  const [subjectId, setSubjectId] = useState<string | null | undefined>(undefined);
  const [confirmation, setConfirmation] = useState("");
  const [errorCode, setErrorCode] = useState<AccountErasureErrorCode | null>(null);
  const [receipt, setReceipt] = useState<AccountErasureReceipt | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSubjectId(new URLSearchParams(window.location.search).get("studentId"));
  }, []);

  const isSelf = !subjectId || subjectId === currentUser?.id;
  const phraseMatches = confirmation.trim() === ACCOUNT_ERASURE_CONFIRMATION_PHRASE;

  const backHref = useMemo(() => {
    if (!isSelf && subjectId) return `/parent/children/${subjectId}`;
    if (currentUser?.role === "teacher" || currentUser?.role === "admin") return "/teacher/dashboard";
    if (currentUser?.role === "parent") return "/parent";
    return "/dashboard";
  }, [currentUser?.role, isSelf, subjectId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorCode(null);
    if (!phraseMatches) {
      setErrorCode("confirmation-required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: ACCOUNT_ERASURE_CONFIRMATION_PHRASE,
          ...(isSelf ? {} : { subjectId })
        })
      });
      const payload = (await response.json().catch(() => null)) as
        | { receipt?: AccountErasureReceipt; code?: string }
        | null;

      if (!response.ok) {
        const code = response.status === 429 ? "rate-limited" : payload?.code;
        setErrorCode((code as AccountErasureErrorCode) in errorCopy ? (code as AccountErasureErrorCode) : "unknown");
        return;
      }

      const erasedId = payload?.receipt?.subjectId ?? subjectId ?? currentUser?.id ?? "";
      // Server-side erasure cannot reach the browser's own caches.
      clearLocalDataForErasedUser(erasedId);
      setReceipt(payload?.receipt ?? null);
      // Tracked separately from the receipt: a 200 means the account is gone,
      // and the confirmation must not hinge on the payload's shape. Signing out
      // clears `currentUser`, so without this the page would fall back to its
      // signed-out prompt and leave the requester unsure it worked.
      setIsDone(true);

      if (isSelf) await logout();
    } catch {
      setErrorCode("network");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (subjectId === undefined) {
    return (
      <div className="page-container py-10 sm:py-14">
        <section className="glass-panel mx-auto max-w-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{t(copy.titleSelf)}</h1>
        </section>
      </div>
    );
  }

  if (!currentUser && !isDone) {
    return (
      <div className="page-container py-10 sm:py-14">
        <section className="glass-panel mx-auto max-w-2xl p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{t(copy.titleSelf)}</h1>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{t(copy.needsSignIn)}</p>
          <Link
            href="/login?next=%2Faccount%2Fdelete"
            className="focus-ring mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
          >
            {t(copy.signIn)}
          </Link>
        </section>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="page-container py-10 sm:py-14">
        <section className="glass-panel mx-auto max-w-2xl p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(copy.eyebrow)}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {t(copy.doneTitle)}
          </h1>
          <p role="status" className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
            {isSelf ? t(copy.doneSelf) : t(copy.doneOther)}
          </p>

          {receipt ? (
            <dl className="mt-6 grid gap-3 sm:grid-cols-3">
              <ReceiptStat label={t(copy.doneRecords)} value={sumCounts(receipt.deleted)} />
              <ReceiptStat label={t(copy.doneUnlinked)} value={sumCounts(receipt.anonymised)} />
              <ReceiptStat label={t(copy.doneMedia)} value={receipt.mediaObjectsDeleted} />
            </dl>
          ) : null}

          <Link
            href={isSelf ? "/" : backHref}
            className="focus-ring mt-8 inline-flex rounded-full bg-slate-950 px-5 py-3 font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950"
          >
            {t(copy.doneHome)}
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-rose-500 dark:text-rose-300">{t(copy.eyebrow)}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {isSelf ? t(copy.titleSelf) : t(copy.titleOther)}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-700 dark:text-slate-200">
            {isSelf ? t(copy.leadSelf) : t(copy.leadOther)}
          </p>

          <ConsequenceList title={t(copy.removedTitle)} items={copy.removed.map((item) => t(item))} tone="removed" />
          <ConsequenceList title={t(copy.keptTitle)} items={copy.kept.map((item) => t(item))} tone="kept" />
          <ConsequenceList title={t(copy.limitsTitle)} items={copy.limits.map((item) => t(item))} tone="limit" />

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(copy.confirmLabel)}</span>
              <code className="rounded-xl border border-rose-300/60 bg-rose-50/80 px-4 py-2 font-mono text-base font-black tracking-wider text-rose-700 dark:border-rose-300/25 dark:bg-rose-400/10 dark:text-rose-100">
                {ACCOUNT_ERASURE_CONFIRMATION_PHRASE}
              </code>
              <input
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                aria-describedby="account-delete-confirm-hint"
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
              <span id="account-delete-confirm-hint" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t(copy.confirmHint)}
              </span>
            </label>

            {errorCode ? (
              <p
                role="alert"
                className="rounded-2xl border border-rose-300/60 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-300/25 dark:text-rose-100"
              >
                {t(errorCopy[errorCode])}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !phraseMatches}
                className="focus-ring inline-flex justify-center rounded-full bg-rose-600 px-5 py-3 font-black text-white shadow-lg shadow-rose-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmitting ? t(copy.submitting) : isSelf ? t(copy.submitSelf) : t(copy.submitOther)}
              </button>
              <Link
                href={backHref}
                className="focus-ring inline-flex items-center rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
              >
                {t(copy.cancel)}
              </Link>
            </div>
          </form>
        </section>

        <aside className="glass-panel h-fit p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t(copy.signedInAs)}
          </h2>
          <p className="mt-3 text-lg font-black text-slate-950 dark:text-white">
            {currentUser?.name ?? currentUser?.username ?? ""}
          </p>
          {!isSelf && subjectId ? (
            <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
              {t({ en: "Deleting learner", zh: "正在刪除學生", zhHans: "正在删除学生" })}: {subjectId}
            </p>
          ) : null}
          <Link
            href="/privacy#your-rights"
            className="focus-ring mt-6 inline-flex rounded-full border border-slate-200/80 bg-white/75 px-4 py-2 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200"
          >
            {t(copy.privacyLink)}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function ConsequenceList({
  items,
  title,
  tone
}: {
  items: string[];
  title: string;
  tone: "removed" | "kept" | "limit";
}) {
  const toneClassName =
    tone === "removed"
      ? "border-rose-300/60 bg-rose-50/60 dark:border-rose-300/20 dark:bg-rose-400/[0.07]"
      : tone === "kept"
        ? "border-slate-200/80 bg-white/70 dark:border-white/10 dark:bg-white/[0.05]"
        : "border-amber-300/60 bg-amber-50/60 dark:border-amber-300/20 dark:bg-amber-400/[0.07]";

  return (
    <section className={`mt-6 rounded-2xl border px-4 py-4 ${toneClassName}`}>
      <h2 className="text-sm font-black text-slate-900 dark:text-white">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-500">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReceiptStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.05]">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{value}</dd>
    </div>
  );
}
