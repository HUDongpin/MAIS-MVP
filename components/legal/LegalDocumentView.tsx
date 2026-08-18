"use client";

import Link from "next/link";
import { useSettings } from "@/components/providers/AppProviders";
import type { LegalDocument } from "@/lib/legal/documents";
import { legalDocumentsAwaitingCounselReview } from "@/lib/legal/policyVersion";

const legalCopy = {
  eyebrow: { en: "Legal", zh: "法律資訊", zhHans: "法律信息" },
  version: { en: "Version", zh: "版本", zhHans: "版本" },
  draftNotice: {
    en: "Draft pending legal review. This describes how the product actually handles data today, but it has not yet been reviewed by counsel.",
    zh: "草稿，待法律審閱。本文說明產品目前實際處理資料的方式，但尚未經法律顧問審閱。",
    zhHans: "草稿，待法律审阅。本文说明产品目前实际处理资料的方式，但尚未经法律顾问审阅。"
  },
  onThisPage: { en: "On this page", zh: "本頁內容", zhHans: "本页内容" },
  otherDocument: {
    privacy: { en: "Read the Privacy Policy", zh: "閱讀私隱政策", zhHans: "阅读隐私政策" },
    terms: { en: "Read the Terms of Service", zh: "閱讀服務條款", zhHans: "阅读服务条款" }
  },
  backToLogin: { en: "Back to log in", zh: "返回登入", zhHans: "返回登录" }
} as const;

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  const { t } = useSettings();
  const otherSlug = document.slug === "privacy" ? "terms" : "privacy";

  return (
    <div className="page-container py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="glass-panel p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">
            {t(legalCopy.eyebrow)}
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            {t(document.title)}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {t(legalCopy.version)} {document.version}
          </p>

          {legalDocumentsAwaitingCounselReview ? (
            <p
              role="note"
              className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-300/20 dark:text-amber-100"
            >
              {t(legalCopy.draftNotice)}
            </p>
          ) : null}

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{t(document.intro)}</p>

          <div className="mt-10 grid gap-10">
            {document.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t(section.heading)}</h2>
                {section.paragraphs.map((paragraph, index) => (
                  <p key={index} className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                    {t(paragraph)}
                  </p>
                ))}
                {section.bullets?.length ? (
                  <ul className="mt-4 grid gap-2">
                    {section.bullets.map((bullet, index) => (
                      <li
                        key={index}
                        className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
                      >
                        {t(bullet)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>

        <aside className="glass-panel h-fit p-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {t(legalCopy.onThisPage)}
          </p>
          <nav className="mt-4 grid gap-2">
            {document.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/70 dark:text-slate-200 dark:hover:bg-white/[0.06]"
              >
                {t(section.heading)}
              </a>
            ))}
          </nav>
          <div className="mt-6 grid gap-2 border-t border-slate-200/70 pt-6 dark:border-white/10">
            <Link
              href={`/${otherSlug}`}
              className="focus-ring rounded-xl px-3 py-2 text-sm font-black text-cyan-700 transition hover:bg-cyan-400/10 dark:text-cyan-200"
            >
              {t(legalCopy.otherDocument[otherSlug])}
            </Link>
            <Link
              href="/login"
              className="focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/[0.06]"
            >
              {t(legalCopy.backToLogin)}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
