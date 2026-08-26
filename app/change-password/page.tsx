"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { PasswordInputWithReveal } from "@/components/ui/PasswordInputWithReveal";
import type { StudentSession } from "@/types";

const changePasswordCopy = {
  eyebrow: { en: "Account security", zh: "帳戶安全", zhHans: "账户安全" },
  title: { en: "Change your temporary password", zh: "更改臨時密碼", zhHans: "更改临时密码" },
  subtitle: {
    en: "This account was created by an administrator. Set a private password before opening the workspace.",
    zh: "此帳戶由管理員開通。請先設定私人密碼，再進入工作區。",
    zhHans: "此帐户由管理员开通。请先设置私人密码，再进入工作区。"
  },
  currentPassword: { en: "Temporary password", zh: "臨時密碼", zhHans: "临时密码" },
  newPassword: { en: "New password", zh: "新密碼", zhHans: "新密码" },
  confirmPassword: { en: "Confirm new password", zh: "確認新密碼", zhHans: "确认新密码" },
  submit: { en: "Update password", zh: "更新密碼", zhHans: "更新密码" },
  submitting: { en: "Updating...", zh: "正在更新...", zhHans: "正在更新..." },
  mismatch: { en: "Passwords must match before continuing.", zh: "兩次輸入的密碼必須相同，才可繼續。", zhHans: "两次输入的密码必须相同，才可继续。" },
  invalid: { en: "Check the temporary password and use a new password of at least 5 characters.", zh: "請檢查臨時密碼，並使用至少 5 個字元的新密碼。", zhHans: "请检查临时密码，并使用至少 5 个字符的新密码。" },
  error: { en: "Could not update the password yet. Try again in a moment.", zh: "暫時未能更新密碼，請稍後再試。", zhHans: "暂时未能更新密码，请稍后再试。" },
  success: { en: "Password updated. Opening your workspace...", zh: "密碼已更新，正在開啟工作區...", zhHans: "密码已更新，正在打开工作区..." },
  signedInAs: { en: "Signed in account", zh: "已登入帳戶", zhHans: "已登录账户" },
  alreadyDone: { en: "Password already updated", zh: "密碼已更新", zhHans: "密码已更新" }
} as const;

function workspaceForRole(role?: StudentSession["role"]) {
  if (role === "teacher" || role === "admin") return "/teacher/dashboard";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

function safeNextPath(value: string | null, role?: StudentSession["role"]) {
  if (value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/login")) return value;
  return workspaceForRole(role);
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { changePassword, currentUser, t } = useSettings();
  const [nextPath, setNextPath] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNextPath(new URLSearchParams(window.location.search).get("next") ?? "");
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.passwordMustChange === false) {
      setMessage(t(changePasswordCopy.alreadyDone));
    }
  }, [currentUser, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage(t(changePasswordCopy.mismatch));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(currentPassword, password);
      if (result.ok) {
        setMessage(t(changePasswordCopy.success));
        router.push(safeNextPath(nextPath, result.role ?? currentUser?.role));
        return;
      }

      setMessage(result.reason === "invalid" ? t(changePasswordCopy.invalid) : t(changePasswordCopy.error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(changePasswordCopy.eyebrow)}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(changePasswordCopy.title)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t(changePasswordCopy.subtitle)}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(changePasswordCopy.currentPassword)}</span>
              <PasswordInputWithReveal
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
                showLabel={t({ en: "Show temporary password", zh: "顯示臨時密碼", zhHans: "显示临时密码" })}
                hideLabel={t({ en: "Hide temporary password", zh: "隱藏臨時密碼", zhHans: "隐藏临时密码" })}
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(changePasswordCopy.newPassword)}</span>
                <PasswordInputWithReveal
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={5}
                  showLabel={t({ en: "Show new password", zh: "顯示新密碼", zhHans: "显示新密码" })}
                  hideLabel={t({ en: "Hide new password", zh: "隱藏新密碼", zhHans: "隐藏新密码" })}
                  className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(changePasswordCopy.confirmPassword)}</span>
                <PasswordInputWithReveal
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={5}
                  showLabel={t({ en: "Show confirm new password", zh: "顯示確認新密碼", zhHans: "显示确认新密码" })}
                  hideLabel={t({ en: "Hide confirm new password", zh: "隱藏確認新密碼", zhHans: "隐藏确认新密码" })}
                  className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                />
              </label>
            </div>

            {message ? (
              <p role="status" className="rounded-2xl border border-cyan-300/50 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:border-cyan-300/20 dark:text-cyan-100">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 font-black text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? t(changePasswordCopy.submitting) : t(changePasswordCopy.submit)}
            </button>
          </form>
        </section>

        <aside className="glass-panel p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t(dictionary.common.siteName)}
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{t(changePasswordCopy.signedInAs)}</h2>
          <p className="mt-4 text-sm font-bold text-slate-600 dark:text-slate-300">
            {currentUser?.name ?? ""}
          </p>
          <Link href="/login" className="focus-ring mt-6 inline-flex rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200">
            {t({ en: "Use another account", zh: "使用其他帳戶", zhHans: "使用其他账户" })}
          </Link>
        </aside>
      </div>
    </div>
  );
}
