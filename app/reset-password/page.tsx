"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";
import { PasswordInputWithReveal } from "@/components/ui/PasswordInputWithReveal";
import type { StudentSession } from "@/types";

const resetPasswordCopy = {
  eyebrow: { en: "Secure reset", zh: "安全重設" },
  title: { en: "Set New Password", zh: "設定新密碼" },
  subtitle: {
    en: "Choose a new password for the student account linked to this reset token.",
    zh: "為這個重設連結對應的學生帳戶設定新密碼。"
  },
  password: { en: "New password", zh: "新密碼" },
  confirmPassword: { en: "Confirm new password", zh: "確認新密碼" },
  submit: { en: "Update password", zh: "更新密碼" },
  submitting: { en: "Updating...", zh: "正在更新..." },
  mismatch: { en: "Passwords must match before continuing.", zh: "兩次輸入的密碼必須相同，才可繼續。" },
  missingToken: { en: "This reset link is missing a token. Request a fresh link.", zh: "這個重設連結缺少權杖，請重新索取連結。" },
  invalid: { en: "This reset link is invalid or expired.", zh: "這個重設連結無效或已過期。" },
  error: { en: "Could not update the password yet. Try again in a moment.", zh: "暫時未能更新密碼，請稍後再試。" },
  sessionSetup: {
    en: "Login sessions are not configured yet. Set AUTH_SESSION_SECRET or NEXTAUTH_SECRET before signing in after a reset.",
    zh: "登入工作階段尚未設定。請先設定 AUTH_SESSION_SECRET 或 NEXTAUTH_SECRET，才可重設後登入。"
  },
  success: { en: "Password updated. Opening the dashboard...", zh: "密碼已更新，正在開啟儀表板..." },
  requestAgain: { en: "Request another reset link", zh: "重新索取重設連結" },
  backToLogin: { en: "Back to log in", zh: "返回登入" },
  detailsTitle: { en: "What happens next", zh: "下一步" },
  details: {
    en: "After a successful reset, this device signs in with the new password so the learner can continue immediately.",
    zh: "成功重設後，此裝置會用新密碼登入，學生可立即繼續學習。"
  }
} as const;

function workspaceForRole(role?: StudentSession["role"]) {
  if (role === "teacher" || role === "admin") return "/teacher/dashboard";
  if (role === "parent") return "/parent";
  return "/dashboard";
}

export default function ResetPasswordPage() {
  const { completePasswordReset, t } = useSettings();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const tokenFromUrl = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(tokenFromUrl);
    if (!tokenFromUrl) setMessage(t(resetPasswordCopy.missingToken));
  }, [t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setMessage(t(resetPasswordCopy.missingToken));
      return;
    }
    if (password !== confirmPassword) {
      setMessage(t(resetPasswordCopy.mismatch));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completePasswordReset(token, password);
      if (result.ok) {
        setMessage(t(resetPasswordCopy.success));
        window.location.replace(workspaceForRole(result.role));
        return;
      }

      setMessage(
        result.reason === "invalid"
          ? t(resetPasswordCopy.invalid)
          : result.reason === "setup"
            ? t(resetPasswordCopy.sessionSetup)
            : t(resetPasswordCopy.error)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(resetPasswordCopy.eyebrow)}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(resetPasswordCopy.title)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t(resetPasswordCopy.subtitle)}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(resetPasswordCopy.password)}</span>
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
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(resetPasswordCopy.confirmPassword)}</span>
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
              disabled={isSubmitting || !token}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 font-black text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? t(resetPasswordCopy.submitting) : t(resetPasswordCopy.submit)}
            </button>

            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/forgot-password" className="focus-ring rounded-full px-2 py-1 font-black text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(resetPasswordCopy.requestAgain)}
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/login" className="focus-ring rounded-full px-2 py-1 font-black text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(resetPasswordCopy.backToLogin)}
              </Link>
            </div>
          </form>
        </section>

        <aside className="glass-panel p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t(dictionary.common.siteName)}
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{t(resetPasswordCopy.detailsTitle)}</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{t(resetPasswordCopy.details)}</p>
        </aside>
      </div>
    </div>
  );
}
