"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { getCcssLessonComponent } from "@/components/lesson/ccss/registry";
import { getCcssTextbookLesson } from "@/data/ccssTextbookRegistry";
import type {
  InteractiveTextbookChapter,
  InteractiveTextbookCheck,
  InteractiveTextbookGroup,
  InteractiveTextbookLesson
} from "./interactiveTextbookTypes";

/**
 * The California interactive textbook: every chapter opens with its
 * MAIS-authored (Claude) chapter lesson, followed by the ported interactive CCSS
 * lessons that develop the chapter's standards and a hand-checked chapter check.
 *
 * Lesson bodies mount through the same code-split routes and adapter the lesson
 * page uses, so a chapter here is byte-for-byte the lesson core a student sees on
 * `/student/lessons/<topic>`. Only the opener mounts eagerly; the ported lessons
 * mount when their disclosure is opened, which keeps a 20-chapter book light.
 */

type CcssInteractiveTextbookProps = {
  testIdPrefix: string;
  eyebrow: string;
  heading: string;
  intro: string;
  notice?: ReactNode;
  groups: InteractiveTextbookGroup[];
};

const chipClassName =
  "rounded-md border border-cyan-200/80 bg-cyan-50 px-2.5 py-1 font-mono text-xs font-black text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100";
const panelClassName =
  "rounded-lg border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.055] sm:p-6";
const sectionLabelClassName = "text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200";

function LessonBody({ slug, topicId }: { slug: string; topicId: string }) {
  const meta = getCcssTextbookLesson(slug);
  const Body = getCcssLessonComponent(slug);
  if (!meta || !Body) {
    return (
      <p className="rounded-2xl border border-amber-300/40 bg-amber-400/10 p-4 text-sm font-semibold text-amber-800 dark:text-amber-100">
        No interactive lesson is registered for {slug}.
      </p>
    );
  }
  return <Body meta={meta} topicId={topicId} />;
}

function LessonDisclosure({
  lesson,
  testIdPrefix,
  topicId
}: {
  lesson: InteractiveTextbookLesson;
  testIdPrefix: string;
  topicId: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <section
      data-testid={`${testIdPrefix}-lesson`}
      data-lesson-role="lesson"
      data-lesson-slug={lesson.slug}
      className="rounded-lg border border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-slate-950/35"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left"
      >
        <span aria-hidden="true" className="text-2xl leading-none">{lesson.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-slate-950 dark:text-white">{lesson.title}</span>
          <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{lesson.summary}</span>
        </span>
        <span className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-black text-slate-600 dark:border-white/20 dark:text-slate-300">
          {open ? "Close" : "Open lesson"}
        </span>
      </button>
      <div id={panelId} hidden={!open} className="border-t border-slate-200/80 px-4 py-4 dark:border-white/10">
        {open ? <LessonBody slug={lesson.slug} topicId={topicId} /> : null}
      </div>
    </section>
  );
}

function CheckItem({ check, index, testIdPrefix }: { check: InteractiveTextbookCheck; index: number; testIdPrefix: string }) {
  const answerId = useId();
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const isCorrect = selected !== null && selected === check.answer;

  return (
    <li data-testid={`${testIdPrefix}-check`} className="rounded-lg border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/35">
      <p className="text-sm font-black text-slate-950 dark:text-white">
        {index + 1}. {check.prompt}
      </p>
      {check.kind === "mc" && check.choices ? (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Answer choices for check ${index + 1}`}>
          {check.choices.map((choice) => {
            const chosen = selected === choice;
            return (
              <button
                key={choice}
                type="button"
                aria-pressed={chosen}
                onClick={() => setSelected(choice)}
                className={`focus-ring rounded-md border px-3 py-1.5 font-mono text-sm font-bold transition ${
                  chosen
                    ? isCorrect
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-100"
                      : "border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-400/15 dark:text-rose-100"
                    : "border-slate-300 bg-white text-slate-700 dark:border-white/20 dark:bg-white/[0.04] dark:text-slate-200"
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={revealed}
          aria-controls={answerId}
          onClick={() => setRevealed((value) => !value)}
          className="focus-ring mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-black text-slate-700 dark:border-white/20 dark:text-slate-200"
        >
          {revealed ? "Hide answer" : "Show answer"}
        </button>
      )}
      {check.kind === "mc" ? (
        selected !== null ? (
          <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200" role="status">
            <span className={`font-black ${isCorrect ? "text-emerald-700 dark:text-emerald-200" : "text-rose-700 dark:text-rose-200"}`}>
              {isCorrect ? "Correct." : "Not quite."}
            </span>{" "}
            {isCorrect ? check.explanation : `The answer is ${check.answer}. ${check.explanation}`}
          </p>
        ) : null
      ) : (
        <p id={answerId} hidden={!revealed} className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
          <span className="font-black text-slate-950 dark:text-white">Answer: {check.answer}.</span> {check.explanation}
        </p>
      )}
    </li>
  );
}

function ChapterArticle({ chapter, testIdPrefix }: { chapter: InteractiveTextbookChapter; testIdPrefix: string }) {
  const opener = chapter.lessons.find((lesson) => lesson.role === "opener");
  const portedLessons = chapter.lessons.filter((lesson) => lesson.role !== "opener");

  return (
    <article
      id={chapter.anchor}
      data-testid={`${testIdPrefix}-chapter`}
      data-topic-id={chapter.topicId}
      className={`scroll-mt-28 ${panelClassName}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">
            {chapter.gradeLabel} · Chapter {chapter.chapterNumber}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{chapter.title}</h3>
          {chapter.placement ? (
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">
              {chapter.placement.pathwayLabel} · {chapter.placement.conceptualCategory} · {chapter.placement.domainCode}
              {chapter.placement.prerequisiteDomains.length ? ` · Prerequisites: ${chapter.placement.prerequisiteDomains.join(", ")}` : ""}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {chapter.lessons.length} interactive lesson{chapter.lessons.length === 1 ? "" : "s"} ·{" "}
            <Link href={chapter.lessonHref} className="focus-ring font-black text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-200">
              Open this chapter in the lesson page
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Standards developed in this chapter">
          {chapter.standards.map((standard) => (
            <span key={standard.id} className={chipClassName} title={standard.description}>
              {standard.id}
            </span>
          ))}
        </div>
      </div>

      {opener ? (
        <section
          data-testid={`${testIdPrefix}-lesson`}
          data-lesson-role="opener"
          data-lesson-slug={opener.slug}
          className="mt-6"
        >
          <p className={sectionLabelClassName}>Chapter opener · authored by Claude, verified in every control state</p>
          <h4 className="mt-2 text-xl font-black text-slate-950 dark:text-white">
            <span aria-hidden="true">{opener.emoji}</span> {opener.title}
          </h4>
          <div className="mt-3">
            <LessonBody slug={opener.slug} topicId={chapter.topicId} />
          </div>
        </section>
      ) : null}

      {portedLessons.length ? (
        <section className="mt-6">
          <p className={sectionLabelClassName}>Lessons in this chapter</p>
          <div className="mt-3 space-y-3">
            {portedLessons.map((lesson) => (
              <LessonDisclosure key={lesson.slug} lesson={lesson} testIdPrefix={testIdPrefix} topicId={chapter.topicId} />
            ))}
          </div>
        </section>
      ) : null}

      {chapter.checks.length ? (
        <section className="mt-6" aria-label={`Chapter ${chapter.chapterNumber} check`}>
          <p className={sectionLabelClassName}>Chapter check</p>
          <ol className="mt-3 space-y-3">
            {chapter.checks.map((check, index) => (
              <CheckItem key={check.id} check={check} index={index} testIdPrefix={testIdPrefix} />
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

export function CcssInteractiveTextbook({ testIdPrefix, eyebrow, heading, intro, notice, groups }: CcssInteractiveTextbookProps) {
  const chapterCount = groups.reduce((sum, group) => sum + group.chapters.length, 0);
  const lessonCount = groups.reduce((sum, group) => sum + group.chapters.reduce((inner, chapter) => inner + chapter.lessons.length, 0), 0);

  return (
    <main data-testid={`${testIdPrefix}-page`} className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/80">
        <div className="page-container py-10 sm:py-12">
          <div className="grid gap-7 lg:grid-cols-[1fr_20rem] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">{eyebrow}</p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">{heading}</h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">{intro}</p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">In this book</p>
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                {chapterCount} chapter{chapterCount === 1 ? "" : "s"} · {lessonCount} interactive lesson{lessonCount === 1 ? "" : "s"}
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Chapter openers are MAIS-authored; the lessons inside each chapter are the interactive CCSS library the lesson page renders.
              </p>
            </div>
          </div>
          {notice ? <div className="mt-5">{notice}</div> : null}
          <nav aria-label="Chapters" className="mt-8 flex flex-wrap gap-2">
            {groups.flatMap((group) =>
              group.chapters.map((chapter) => (
                <a
                  key={chapter.topicId}
                  href={`#${chapter.anchor}`}
                  className="focus-ring rounded-md border border-slate-200/80 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:border-cyan-300/50 dark:hover:text-cyan-100"
                >
                  {group.gradeLabel} · Ch {chapter.chapterNumber}
                </a>
              ))
            )}
          </nav>
        </div>
      </section>

      <div className="page-container space-y-10 py-10 sm:py-12">
        {groups.map((group) => (
          <section key={group.grade} data-testid={`${testIdPrefix}-book-${group.grade}`} className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">{group.gradeLabel}</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{group.courseLabel}</h2>
              </div>
              <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                {group.chapters.length} chapter{group.chapters.length === 1 ? "" : "s"} · California Common Core standards, listed on each chapter
              </p>
            </div>
            <div className="space-y-6">
              {group.chapters.map((chapter) => (
                <ChapterArticle key={chapter.topicId} chapter={chapter} testIdPrefix={testIdPrefix} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
