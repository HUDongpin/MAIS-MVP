import Image from "next/image";
import Link from "next/link";
import textbookPackJson from "@/data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json";
import type { LocalizedText } from "@/types";

type TextbookProblem = {
  prompt: string;
  answer?: string;
  explanation?: string;
  solution?: string;
  check?: string;
  title?: string;
};

type TextbookStudentText = {
  assessmentStyleTasks: TextbookProblem[];
  chapterTitle: string;
  conceptExplanation: string;
  exitTicket: string;
  glossary: string[];
  guidedPractice: TextbookProblem[];
  independentPractice: TextbookProblem[];
  learningGoals: string[];
  misconceptionClinic: string[];
  workedExamples: TextbookProblem[];
};

type TextbookChapter = {
  chapterNumber: number;
  chapterTitle: LocalizedText;
  clusterTags: string[];
  competencyTags: string[];
  conceptIds: string[];
  domainTags: string[];
  id: string;
  standardIds: string[];
  studentText: {
    en: TextbookStudentText;
    zh: TextbookStudentText;
    zhHans: TextbookStudentText;
  };
};

type TextbookBook = {
  chapters: TextbookChapter[];
  courseLabel: LocalizedText;
  grade: "P6" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";
  id: string;
  sequencingNote: LocalizedText;
  standardsName: string;
  standardsVersion: string;
  usGradeLabel: string;
};

type TextbookPack = {
  books: TextbookBook[];
  generatedAt: string;
  packageId: string;
  sourcePolicy: {
    safeUse: string;
  };
};

type TextbookProblemListKey = "workedExamples" | "guidedPractice" | "independentPractice" | "assessmentStyleTasks";
type TextbookSurface = "student" | "review";

const textbookPack = textbookPackJson as TextbookPack;
const middleSchoolGrades = new Set(["P6", "S1", "S2"]);
const middleSchoolBooks = textbookPack.books.filter((book) => middleSchoolGrades.has(book.grade));

function assetKeyForChapter(chapterId: string) {
  return chapterId.replace(/^us-ca-math-/, "");
}

function conceptImageSrc(chapter: TextbookChapter) {
  return `/lesson-illustrations/us-ca-middle-school/candidates/${assetKeyForChapter(chapter.id)}-concept.png`;
}

function exactLayerImageSrc(chapter: TextbookChapter) {
  return `/lesson-illustrations/us-ca-middle-school/exact-layer-renders/${assetKeyForChapter(chapter.id)}-exact-layer.png`;
}

function chapterAnchor(book: TextbookBook, chapter: TextbookChapter) {
  return `${book.grade.toLowerCase()}-chapter-${String(chapter.chapterNumber).padStart(2, "0")}`;
}

function conceptAlt(book: TextbookBook, chapter: TextbookChapter) {
  return `Concept opener for ${book.usGradeLabel} ${chapter.chapterTitle.en}.`;
}

function exactLayerAlt(book: TextbookBook, chapter: TextbookChapter) {
  return `Deterministic exact math layer for ${book.usGradeLabel} ${chapter.chapterTitle.en}.`;
}

function TextBlock({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">{label}</p>
      <p className="border-l-2 border-cyan-300/70 pl-3 text-sm leading-7 text-slate-700 dark:border-cyan-300/35 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

function problemReasoning(problem: TextbookProblem) {
  return problem.solution ?? problem.explanation ?? problem.check;
}

function ProblemBlock({
  label,
  problem
}: {
  label: string;
  problem: TextbookProblem;
}) {
  const reasoning = problemReasoning(problem);

  return (
    <section className="space-y-3 border-t border-slate-200/80 pt-5 dark:border-white/10">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-fuchsia-700 dark:text-fuchsia-200">{label}</p>
      <div className="border-l-2 border-fuchsia-300/70 pl-3 dark:border-fuchsia-300/35">
        <div className="space-y-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
          {problem.title ? <p className="font-black text-slate-950 dark:text-white">{problem.title}</p> : null}
          <p>{problem.prompt}</p>
          {problem.answer ? (
            <p>
              <span className="font-black text-slate-950 dark:text-white">Answer:</span> {problem.answer}
            </p>
          ) : null}
          {reasoning ? (
            <p>
              <span className="font-black text-slate-950 dark:text-white">Reasoning:</span> {reasoning}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ChapterProblemSection({
  chapter,
  field,
  label
}: {
  chapter: TextbookChapter;
  field: TextbookProblemListKey;
  label: string;
}) {
  return <ProblemBlock label={label} problem={chapter.studentText.en[field][0]} />;
}

function ChapterSection({
  book,
  chapter,
  surface
}: {
  book: TextbookBook;
  chapter: TextbookChapter;
  surface: TextbookSurface;
}) {
  const anchor = chapterAnchor(book, chapter);
  const showExactLayer = surface === "review";

  return (
    <article
      id={anchor}
      data-testid={`california-textbook-chapter-${book.grade}-${chapter.chapterNumber}`}
      className="scroll-mt-28 rounded-lg border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-950/5 dark:border-white/10 dark:bg-white/[0.055] sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">
            {book.usGradeLabel} · Chapter {chapter.chapterNumber}
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {chapter.chapterTitle.en}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {chapter.standardIds.map((standardId) => (
            <span key={standardId} className="rounded-md border border-cyan-200/80 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-100">
              {standardId}
            </span>
          ))}
        </div>
      </div>

      <div className={`mt-5 grid gap-4 ${showExactLayer ? "lg:grid-cols-[1.05fr_0.95fr]" : ""}`}>
        <figure className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-slate-950/45">
          <Image
            src={conceptImageSrc(chapter)}
            alt={conceptAlt(book, chapter)}
            width={1672}
            height={941}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="h-auto w-full"
          />
          <figcaption className="px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            Concept opener: {chapter.chapterTitle.en}
          </figcaption>
        </figure>

        {showExactLayer ? (
          <figure className="overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50 dark:border-white/10 dark:bg-slate-950/45">
            <Image
              src={exactLayerImageSrc(chapter)}
              alt={exactLayerAlt(book, chapter)}
              width={960}
              height={540}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="h-auto w-full"
            />
            <figcaption className="px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              Internal deterministic exact layer
            </figcaption>
          </figure>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <TextBlock
            label="Concept"
            value={chapter.studentText.en.conceptExplanation}
          />
          <ChapterProblemSection chapter={chapter} field="workedExamples" label="Worked example" />
          <ChapterProblemSection chapter={chapter} field="guidedPractice" label="Guided practice" />
          <ChapterProblemSection chapter={chapter} field="independentPractice" label="Independent practice" />
          <ChapterProblemSection chapter={chapter} field="assessmentStyleTasks" label="Check for understanding" />
        </div>

        <aside className="space-y-5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/35">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Learning goals</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {chapter.studentText.en.learningGoals.map((goal, index) => (
                <li key={goal}>
                  <span className="font-black text-slate-950 dark:text-white">{index + 1}.</span> {goal}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Misconception clinic</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
              {chapter.studentText.en.misconceptionClinic.slice(0, 3).map((item) => (
                <li key={item}>{item.replace(/^Watch for:\s*/i, "")}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-200">Glossary</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {chapter.studentText.en.glossary.slice(0, 8).map((term) => (
                <span key={term} className="rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm shadow-slate-950/5 dark:bg-white/10 dark:text-slate-200">
                  {term}
                </span>
              ))}
            </div>
          </div>

          <TextBlock
            label="Exit ticket"
            value={chapter.studentText.en.exitTicket}
          />
        </aside>
      </div>
    </article>
  );
}

function ReviewNotice() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-7 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100">
      <p className="text-xs font-black uppercase tracking-[0.12em]">QA review copy</p>
      <p className="mt-2">
        This noindex review route keeps internal exact-layer PNGs visible for S18/S24 inspection. The student route omits those internal layers and uses the repaired English-only textbook content.
      </p>
    </div>
  );
}

export function CaliforniaMiddleSchoolTextbookPage({ surface = "student" }: { surface?: TextbookSurface }) {
  const totalChapters = middleSchoolBooks.reduce((count, book) => count + book.chapters.length, 0);
  const isReview = surface === "review";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200/70 bg-white/80 dark:border-white/10 dark:bg-slate-950/80">
        <div className="page-container py-10 sm:py-12">
          <div className="grid gap-7 lg:grid-cols-[1fr_20rem] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-200">
                {isReview ? "California Middle School Mathematics · QA Review" : "California Middle School Mathematics · Student Textbook"}
              </p>
              <h1 className="mt-3 text-4xl font-black text-slate-950 dark:text-white sm:text-5xl">
                California Middle School Mathematics
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-slate-600 dark:text-slate-300">
                {isReview
                  ? "This review copy shows the repaired Grade 6-8 textbook structure, chapter concept art, internal exact-layer PNGs, and validated worked examples for QA inspection."
                  : "This student textbook sequence presents the repaired Grade 6-8 chapter structure with English-only concepts, chapter-specific worked examples, guided practice, independent practice, and checks for understanding."}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.055]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Package</p>
              <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">{textbookPack.packageId}</p>
              <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {totalChapters} chapters · G6-G8 · generated {new Date(textbookPack.generatedAt).toISOString().slice(0, 10)}
              </p>
            </div>
          </div>

          {isReview ? (
            <div className="mt-6">
              <ReviewNotice />
            </div>
          ) : null}

          <nav aria-label="California middle school textbook chapters" className="mt-8 flex flex-wrap gap-2">
            {middleSchoolBooks.map((book) => (
              <div key={book.id} className="flex flex-wrap gap-2">
                {book.chapters.map((chapter) => (
                  <Link
                    key={chapter.id}
                    href={`#${chapterAnchor(book, chapter)}`}
                    className="focus-ring rounded-md border border-slate-200/80 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-700 dark:border-white/10 dark:bg-white/[0.055] dark:text-slate-200 dark:hover:border-cyan-300/50 dark:hover:text-cyan-100"
                  >
                    {book.usGradeLabel} · {chapter.chapterNumber}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </section>

      <div className="page-container space-y-10 py-10 sm:py-12">
        {middleSchoolBooks.map((book) => (
          <section key={book.id} data-testid={`california-textbook-book-${book.grade}`} className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-fuchsia-700 dark:text-fuchsia-200">{book.usGradeLabel}</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{book.courseLabel.en}</h2>
                <p className="mt-2 text-base font-semibold text-slate-600 dark:text-slate-300">
                  {book.sequencingNote.en}
                </p>
              </div>
              <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                {book.standardsName} · {book.standardsVersion}
              </p>
            </div>

            <div className="space-y-6">
              {book.chapters.map((chapter) => (
                <ChapterSection key={chapter.id} book={book} chapter={chapter} surface={surface} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
