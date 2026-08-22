import type { Metadata } from "next";
import Link from "next/link";
import { PedaNovaHomeHero } from "@/components/home/PedaNovaHomeHero";
import { PUBLIC_SITE_URLS } from "@/lib/publicSiteIdentity";

export const metadata: Metadata = {
  title: "MAIS | Mathematics Adaptive Interactive System",
  description: "A personalised K–12 mathematics learning platform with lessons, visualisations, practice, progress tracking, family and classroom tools, and AI-supported tutoring.",
  alternates: { canonical: PUBLIC_SITE_URLS.homepage }
};

export default function HomePage() {
  return (
    <>
      <PedaNovaHomeHero />
      <section aria-labelledby="public-app-description" className="page-container py-10 sm:py-14">
        <div className="glass-panel mx-auto max-w-4xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
            Mathematics Adaptive Interactive System
          </p>
          <h2 id="public-app-description" className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
            Personalised K–12 mathematics learning for students, families, teachers, and schools
          </h2>
          <p className="mt-4 leading-7 text-slate-600 dark:text-slate-300">
            MAIS provides curriculum-aligned lessons, interactive visualisations, practice, saved progress,
            classroom and family tools, and AI-supported tutoring. Users can create and use a MAIS password account;
            Google Sign-In is an optional authentication method.
          </p>
          <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
            Optional Google Sign-In uses a verified Google email address, stable Google account identifier, and display
            name only to create an eligible account, sign in, or securely link an existing MAIS account. MAIS never
            receives a Google password and does not retain Google access or refresh tokens.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/privacy" className="focus-ring inline-flex min-h-11 items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950">
              Read the Privacy Policy
            </Link>
            <Link href="/terms" className="focus-ring inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 dark:border-white/15 dark:bg-white/[0.06] dark:text-white">
              Read the Terms of Service
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
