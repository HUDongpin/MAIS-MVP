"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";

const forgotPasswordCopy = {
  eyebrow: { en: "Account recovery", zh: "帳戶協助" },
  title: { en: "Forgot Password", zh: "忘記密碼" },
  subtitle: {
    en: "Enter the email or username connected to the account.",
    zh: "輸入帳戶連繫的電郵或用戶名稱。",
    zhHans: "输入账户关联的邮箱或用户名。"
  },
  identifier: { en: "Email or username", zh: "電郵或用戶名稱", zhHans: "邮箱或用户名" },
  submit: { en: "Send reset instructions", zh: "發送重設指示" },
  submitting: { en: "Sending...", zh: "正在發送..." },
  success: {
    en: "If an account exists, password reset instructions are ready.",
    zh: "如帳戶存在，重設密碼指示已準備好。"
  },
  devLink: {
    en: "Open local reset link",
    zh: "開啟本機重設連結"
  },
  error: {
    en: "Could not start password reset yet. Try again in a moment.",
    zh: "暫時未能開始重設密碼，請稍後再試。"
  },
  backToLogin: { en: "Back to log in", zh: "返回登入" },
  needAccount: { en: "Need a student account?", zh: "需要學生帳戶？" },
  register: { en: "Register", zh: "註冊" },
  nextStepsTitle: { en: "Recovery flow", zh: "重設流程" },
  nextSteps: [
    { en: "Find the learner profile.", zh: "尋找學生帳戶。" },
    { en: "Send a secure reset link.", zh: "發送安全重設連結。" },
    { en: "Let the student set a new password.", zh: "讓學生設定新密碼。" }
  ]
} as const;

export default function ForgotPasswordPage() {
  const { t } = useSettings();
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setResetUrl("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ identifier })
      });

      if (!response.ok) {
        setMessage(t(forgotPasswordCopy.error));
        return;
      }

      const body = await response.json() as { resetUrl?: unknown };
      setMessage(t(forgotPasswordCopy.success));
      setResetUrl(typeof body.resetUrl === "string" ? body.resetUrl : "");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">{t(forgotPasswordCopy.eyebrow)}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(forgotPasswordCopy.title)}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {t(forgotPasswordCopy.subtitle)}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t(forgotPasswordCopy.identifier)}</span>
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
                required
                className="focus-ring rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              />
            </label>

            {message ? (
              <p role="status" className="rounded-2xl border border-cyan-300/50 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-800 dark:border-cyan-300/20 dark:text-cyan-100">
                {message}
              </p>
            ) : null}

            {resetUrl ? (
              <a
                href={resetUrl}
                className="focus-ring inline-flex justify-center rounded-full border border-cyan-300/45 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-800 transition hover:-translate-y-0.5 hover:bg-cyan-400/15 dark:border-cyan-300/25 dark:text-cyan-100"
              >
                {t(forgotPasswordCopy.devLink)}
              </a>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="focus-ring inline-flex w-full justify-center rounded-full bg-slate-950 px-5 py-3 font-black text-white shadow-lg shadow-slate-900/10 transition enabled:hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-white dark:text-slate-950"
            >
              {isSubmitting ? t(forgotPasswordCopy.submitting) : t(forgotPasswordCopy.submit)}
            </button>

            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/login" className="focus-ring rounded-full px-2 py-1 font-black text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(forgotPasswordCopy.backToLogin)}
              </Link>
              <span aria-hidden="true">·</span>
              <span>{t(forgotPasswordCopy.needAccount)}</span>
              <Link href="/register" className="focus-ring rounded-full px-2 py-1 font-black text-cyan-700 underline-offset-4 transition hover:bg-cyan-400/10 hover:underline dark:text-cyan-200">
                {t(forgotPasswordCopy.register)}
              </Link>
            </div>
          </form>
        </section>

        <aside className="glass-panel p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
            {t(dictionary.common.siteName)}
          </p>
          <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{t(forgotPasswordCopy.nextStepsTitle)}</h2>
          <ol className="mt-5 grid gap-3">
            {forgotPasswordCopy.nextSteps.map((step, index) => (
              <li key={step.en} className="flex gap-3 rounded-2xl border border-slate-200/70 bg-white/60 p-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <span>{t(step)}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
