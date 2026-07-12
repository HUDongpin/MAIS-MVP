"use client";

import Image from "next/image";
import { WorkedExampleIllustration } from "@/components/lesson/WorkedExampleIllustration";
import { californiaHighSchoolTextbookChapters, californiaHighSchoolTextbookDraft } from "@/data/usCaliforniaHighSchoolLessonIllustrations";

export function CaliforniaHighSchoolTextbookPage() {
  return (
    <div data-testid="california-high-school-textbook-review-page" className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200/70 bg-white/85 dark:border-white/10 dark:bg-slate-950/85">
        <div className="page-container py-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
            California High School Mathematics · QA Review
          </p>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">California High School Mathematics Preview</h1>
          <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">
            Internal noindex review page for S05 placement, S18/S09/S24 content review, and S11/S22 browser QA. This is not a student-facing production route.
          </p>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
            Review only · {californiaHighSchoolTextbookDraft.routePolicy.productionApproval} · final release gates still required.
          </div>
        </div>
      </section>

      <section className="page-container py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {californiaHighSchoolTextbookChapters.map((chapter) => (
            <a
              key={chapter.chapterId}
              href={`#${chapter.chapterId}`}
              className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-black text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200"
            >
              {chapter.usGradeLabel} · {chapter.title.en}
            </a>
          ))}
        </div>

        <div className="mt-8 space-y-8" data-testid="california-high-school-textbook-chapters">
          {californiaHighSchoolTextbookChapters.map((chapter) => (
            <article
              key={chapter.chapterId}
              id={chapter.chapterId}
              data-testid="california-high-school-textbook-chapter"
              className="scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.055] sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-200">
                    {chapter.usGradeLabel} · {chapter.pathwayLabel}
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{chapter.title.en}</h2>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
                    {chapter.conceptualCategory} · {chapter.domainCode}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapter.standards.map((standard) => (
                    <span key={standard} className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
                      {standard}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <p>
                  <span className="font-black text-slate-950 dark:text-white">Prerequisites:</span> {chapter.prerequisiteDomains.join(", ")}
                </p>
                <p>
                  <span className="font-black text-slate-950 dark:text-white">Modeling:</span> {chapter.modelingOpportunities[0]}
                </p>
              </div>

              <figure className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40">
                <Image src={chapter.concept.src} alt={chapter.concept.alt.en} width={1600} height={900} sizes="100vw" className="h-auto w-full" />
                <figcaption className="px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  Non-authoritative concept background · {chapter.concept.s09Decision}
                </figcaption>
              </figure>

              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {chapter.workedExamples.map((example, index) => (
                  <section key={example.exampleId} data-testid="california-high-school-worked-example" className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/35">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-fuchsia-700 dark:text-fuchsia-200">
                      Worked example {index + 1} · {example.kind}
                    </p>
                    <h3 className="mt-2 text-lg font-black">{example.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-700 dark:text-slate-200">{example.prompt.en}</p>
                    <WorkedExampleIllustration
                      className="max-w-full rounded-lg shadow-none"
                      content={`${example.prompt.en} ${example.answer.en} ${example.solutionSteps.en.join(" ")}`}
                      grade={chapter.grade}
                      publisher="US_CA_MATH"
                      title={`${chapter.title.en} ${example.title}`}
                      topicId={example.exampleId}
                    />
                    <p className="mt-3 text-sm font-black text-emerald-700 dark:text-emerald-200">Answer: {example.answer.en}</p>
                    <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      {example.solutionSteps.en.map((step) => <li key={step}>{step}</li>)}
                    </ol>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
