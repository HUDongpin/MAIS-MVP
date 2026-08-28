"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { dictionary, useSettings } from "@/components/providers/AppProviders";

export default function JoinClassPage() {
  const { t } = useSettings();
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function joinClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    const response = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode })
    });
    const payload = await response.json().catch(() => null) as { status?: string; class?: { name?: string } } | null;
    setIsSaving(false);
    if (!response.ok) {
      setMessage(t({ en: "No class was found for this invite code.", zh: "找不到此邀請碼對應的班級。", zhHans: "找不到此邀请码对应的班级。" }));
      return;
    }
    setMessage(
      payload?.status === "duplicate"
        ? t({ en: "You are already in this class.", zh: "你已加入此班級。", zhHans: "你已加入此班级。" })
        : t({ en: `Joined ${payload?.class?.name ?? "class"}.`, zh: `已加入 ${payload?.class?.name ?? "班級"}。`, zhHans: `已加入 ${payload?.class?.name ?? "班级"}。` })
    );
  }

  return (
    <div className="page-container py-10 sm:py-12">
      <section className="glass-panel mx-auto max-w-3xl p-6 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">{t({ en: "Class invite", zh: "班級邀請", zhHans: "班级邀请" })}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">{t({ en: "Join a teacher class", zh: "加入教師班級", zhHans: "加入教师班级" })}</h1>
        <form onSubmit={joinClass} className="mt-7 grid gap-4 sm:grid-cols-[1fr_auto]">
          <input
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            required
            placeholder={t({ en: "Invite code", zh: "邀請碼", zhHans: "邀请码" })}
            className="focus-ring min-h-12 rounded-2xl border border-slate-200/80 bg-white/80 px-4 text-lg font-black uppercase tracking-[0.12em] dark:border-white/10 dark:bg-white/[0.06]"
          />
          <button disabled={isSaving} className="focus-ring rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:opacity-50 dark:bg-white dark:text-slate-950">
            {isSaving ? t({ en: "Joining", zh: "加入中", zhHans: "加入中" }) : t({ en: "Join", zh: "加入", zhHans: "加入" })}
          </button>
        </form>
        {message ? <p className="mt-4 text-sm font-bold text-cyan-700 dark:text-cyan-200">{message}</p> : null}
        <Link href="/dashboard" className="focus-ring mt-6 inline-flex rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-black dark:border-white/10 dark:bg-white/[0.07]">
          {t(dictionary.nav.dashboard)}
        </Link>
      </section>
    </div>
  );
}
