import Image from "next/image";
import islandMap from "./assets/math-adventure-island-map.png";

const grades = ["Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

const topicMissions = [
  { title: "Ratios & Rates", meta: "6 Missions", progress: "75%", tone: "green", icon: "pie", stars: 2 },
  { title: "Expressions & Equations", meta: "8 Missions", progress: "100%", tone: "blue", icon: "plus", stars: 3 },
  { title: "Geometry Basics", meta: "7 Missions", progress: "60%", tone: "yellow", icon: "triangle", stars: 2 },
  { title: "Fractions & Decimals", meta: "6 Missions", progress: "40%", tone: "violet", icon: "fraction", stars: 2 }
];

const mapLabels = [
  { label: "Algebra Peaks", className: "left-[24%] top-[23%]" },
  { label: "Geometry Garden", className: "left-[68%] top-[22%]" },
  { label: "Number Forest", className: "left-[17%] top-[57%]" },
  { label: "Question Cavern", className: "left-[50%] top-[53%]" },
  { label: "Master's Keep", className: "left-[78%] top-[57%]" },
  { label: "Challenge Shore", className: "left-[57%] top-[79%]" }
];

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
      <path d="M4 10.8 12 4l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.2Z" fill="currentColor" />
    </svg>
  );
}

function PracticeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
      <path d="M5 19 19 5M7 5l12 12M4 20l4-1-3-3-1 4ZM17 3l4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function BarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
      <path d="M5 20V9M12 20V4M19 20v-7" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="2" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 12v4M9 20h6M10 16h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
      <path d="M6 8h12l-1 12H7L6 8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      <path d="M9 8a3 3 0 0 1 6 0" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function StarIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none">
      <path d="m12 3 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.2 6-.8L12 3Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none">
      <path d="m4 8 4-4h8l4 4-8 12L4 8Z" fill="currentColor" opacity="0.9" />
      <path d="M4 8h16M8 4l4 16 4-16" stroke="white" strokeOpacity="0.55" strokeWidth="1.5" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none">
      <path d="M5 21V5M6 5h10l-1.2 3L16 11H6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
    </svg>
  );
}

function TopicIcon({ icon }: { icon: string }) {
  if (icon === "plus") {
    return <span className="grid size-11 place-items-center rounded-2xl bg-cyan-400 text-lg font-black text-white shadow-lg shadow-cyan-700/20">x+3</span>;
  }
  if (icon === "triangle") {
    return <span className="block size-0 border-x-[22px] border-b-[38px] border-x-transparent border-b-amber-400 drop-shadow-lg" aria-hidden="true" />;
  }
  if (icon === "fraction") {
    return <span className="grid size-11 place-items-center rounded-full bg-violet-400 text-base font-black text-white shadow-lg shadow-violet-700/20">1/2</span>;
  }
  return (
    <span className="relative grid size-12 place-items-center rounded-full bg-emerald-400 shadow-lg shadow-emerald-700/20" aria-hidden="true">
      <span className="absolute inset-2 rounded-full border-[10px] border-emerald-600 border-r-white/70" />
    </span>
  );
}

function MiniDiagram() {
  return (
    <svg aria-label="Parallelogram diagram" viewBox="0 0 250 130" className="h-full w-full">
      <path d="M55 96h143L220 32H78Z" fill="#f8fbff" stroke="#172554" strokeLinejoin="round" strokeWidth="3" />
      <path d="M78 32 126 96" stroke="#2563eb" strokeLinecap="round" strokeWidth="3" />
      <text x="72" y="24" fill="#172554" fontSize="18" fontWeight="700">A</text>
      <text x="220" y="28" fill="#172554" fontSize="18" fontWeight="700">B</text>
      <text x="198" y="118" fill="#172554" fontSize="18" fontWeight="700">C</text>
      <text x="38" y="116" fill="#172554" fontSize="18" fontWeight="700">D</text>
      <text x="121" y="118" fill="#172554" fontSize="18" fontWeight="700">E</text>
    </svg>
  );
}

export default function PracticeAdventureUiPreviewPage() {
  return (
    <div data-practice-adventure-ui-preview className="relative isolate min-h-screen overflow-hidden bg-[#55cfff] px-3 py-2 text-slate-900 sm:px-5 lg:px-8">
      <style>{`
        body:has([data-practice-adventure-ui-preview]) header.sticky,
        body:has([data-practice-adventure-ui-preview]) footer,
        body:has([data-practice-adventure-ui-preview]) button[aria-label*="AI Tutor"],
        body:has([data-practice-adventure-ui-preview]) button[aria-label="Back to top"],
        body:has([data-practice-adventure-ui-preview]) button[aria-label="返回頂部"] {
          display: none !important;
        }

        body:has([data-practice-adventure-ui-preview]) {
          background: #55cfff;
        }

        body:has([data-practice-adventure-ui-preview]) main.flex-1 {
          padding-bottom: 0 !important;
        }
      `}</style>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.34),transparent_15%),radial-gradient(circle_at_86%_12%,rgba(255,255,255,0.28),transparent_18%),linear-gradient(180deg,#44c5f2_0%,#58d0f7_52%,#74ddfb_100%)]"
      />
      <div className="relative mx-auto max-w-[1500px]">
        <header className="flex min-h-20 items-center justify-between gap-5 rounded-[22px] border border-white/70 bg-white/95 px-6 py-2 shadow-[0_18px_40px_rgba(8,47,73,0.16)]">
          <div className="flex items-center gap-3">
            <div className="grid size-[52px] place-items-center rounded-2xl bg-sky-100 text-3xl shadow-inner">
              <Image src={islandMap} alt="" width={46} height={46} className="size-11 rounded-xl object-cover object-left" priority />
            </div>
            <div className="leading-none">
              <p className="text-lg font-black text-blue-700">Math</p>
              <p className="text-lg font-black text-blue-700">Adventure</p>
              <p className="text-lg font-black text-emerald-600">Island</p>
            </div>
          </div>
          <nav aria-label="Adventure preview navigation" className="hidden items-center gap-8 text-base font-bold text-slate-600 lg:flex">
            <a href="#hero" className="flex items-center gap-2 border-b-4 border-blue-500 px-2 py-3 text-blue-600"><HomeIcon />Home</a>
            <a href="#practice-preview" className="flex items-center gap-2 px-2 py-3"><PracticeIcon />Practice Arena</a>
            <a href="#practice-preview" className="flex items-center gap-2 px-2 py-3"><BarIcon />Progress</a>
            <a href="#topic-missions" className="flex items-center gap-2 px-2 py-3"><TrophyIcon />Leaderboard</a>
            <a href="#rewards" className="flex items-center gap-2 px-2 py-3"><StoreIcon />Store</a>
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 font-black text-slate-700 sm:flex">
              <span className="text-amber-400"><StarIcon /></span>
              <span>320</span>
            </div>
            <div className="hidden items-center gap-2 font-black text-slate-700 sm:flex">
              <span className="text-emerald-500"><GemIcon /></span>
              <span>42</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid size-12 place-items-center rounded-full bg-sky-100 text-sky-900 shadow-inner">
                <span className="size-7 rounded-full bg-[linear-gradient(#fbd38d_0_40%,#2563eb_41%_100%)]" />
              </div>
              <span className="hidden font-black text-slate-700 sm:inline">Alex</span>
            </div>
          </div>
        </header>

        <section id="hero" className="mt-9 grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
          <div className="relative min-h-[405px] rounded-[16px] border border-white/70 bg-white p-6 shadow-[0_22px_46px_rgba(15,23,42,0.14)] sm:p-9">
            <div className="flex items-start justify-between gap-4 sm:gap-5">
              <h1 className="min-w-0 max-w-[9ch] text-4xl font-black leading-[0.98] tracking-normal text-blue-950 sm:max-w-[11ch] sm:text-6xl lg:text-[3.9rem]">Practice Arena</h1>
              <div className="grid size-14 shrink-0 rotate-12 place-items-center rounded-3xl border-4 border-white bg-yellow-300 text-amber-500 shadow-xl sm:size-16">
                <StarIcon className="size-9 sm:size-10" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black leading-tight text-emerald-600">練習競技場</p>
            <p className="mt-6 max-w-[34rem] text-lg font-semibold leading-7 text-slate-700">Embark on math missions, solve challenges, and collect stars as you level up your skills.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a href="#topic-missions" className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#ff5a4f] px-8 text-xl font-black text-white shadow-[0_10px_0_#dc3f37,0_18px_32px_rgba(220,63,55,0.25)] transition hover:-translate-y-0.5 active:translate-y-0">
                <PracticeIcon />Start Mission
              </a>
              <a href="#grades" className="focus-ring inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-blue-500 bg-white px-8 text-xl font-black text-blue-600 shadow-[0_8px_20px_rgba(37,99,235,0.12)] transition hover:-translate-y-0.5 active:translate-y-0">
                <HomeIcon />Choose Topic
              </a>
            </div>
          </div>

          <div className="relative min-h-[405px] overflow-hidden rounded-[18px]">
            <Image src={islandMap} alt="Adventure island map with math mission landmarks" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" priority />
            {mapLabels.map((item) => (
              <div key={item.label} className={`absolute ${item.className} hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-lg lg:block`}>
                {item.label}
                <div className="mt-1 flex justify-center gap-0.5 text-amber-400">
                  <StarIcon className="size-4" />
                  <StarIcon className="size-4" />
                  <StarIcon className="size-4 opacity-45" />
                </div>
              </div>
            ))}
            <div className="absolute bottom-6 right-6 rounded-2xl border border-sky-200 bg-white/95 px-6 py-4 shadow-xl backdrop-blur">
              <p className="text-sm font-black text-blue-950">Island Progress</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="flex items-center gap-2 text-2xl font-black text-slate-800"><span className="text-amber-400"><StarIcon /></span>15 / 30</span>
                <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-1/2 rounded-full bg-yellow-400" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-white/80 bg-white/95 p-4 shadow-[0_22px_46px_rgba(15,23,42,0.12)] sm:p-5">
          <div id="grades" className="flex gap-2 overflow-x-auto pb-2">
            <span className="shrink-0 px-5 py-3 text-sm font-black text-blue-950">Select Grade</span>
            {grades.map((grade) => (
              <button key={grade} type="button" className={`focus-ring min-h-11 shrink-0 rounded-xl border px-5 text-sm font-bold shadow-sm ${grade === "Grade 6" ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
                {grade}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.9fr_0.42fr]">
            <div id="topic-missions" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <h2 className="flex items-center gap-2 text-2xl font-black text-blue-950"><span className="text-[#ff5a4f]"><FlagIcon /></span>Topic Missions</h2>
                <a href="#topic-missions" className="text-sm font-bold text-blue-600">View all</a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {topicMissions.map((topic) => (
                  <article
                    key={topic.title}
                    className={`min-h-[210px] rounded-2xl border p-5 shadow-[0_12px_24px_rgba(15,23,42,0.08)] ${
                      topic.tone === "green"
                        ? "border-emerald-200 bg-emerald-50"
                        : topic.tone === "blue"
                          ? "border-sky-200 bg-sky-50"
                          : topic.tone === "yellow"
                            ? "border-amber-200 bg-amber-50"
                            : "border-violet-200 bg-violet-50"
                    }`}
                  >
                    <TopicIcon icon={topic.icon} />
                    <h3 className="mt-5 min-h-[3rem] text-lg font-black leading-snug text-blue-950">{topic.title}</h3>
                    <p className="mt-3 text-sm font-semibold text-slate-600">{topic.meta}</p>
                    <div className="mt-4 flex gap-1 text-amber-400">
                      {Array.from({ length: 3 }, (_, index) => (
                        <StarIcon key={index} className={`size-5 ${index < topic.stars ? "" : "text-slate-300"}`} />
                      ))}
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: topic.progress }} />
                    </div>
                    <p className="mt-2 text-right text-sm font-black text-slate-600">{topic.progress}</p>
                  </article>
                ))}
              </div>
            </div>

            <div id="practice-preview" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-2xl font-black text-blue-950">
                <span className="grid size-8 place-items-center rounded-full bg-blue-500 text-base text-white">?</span>
                Practice Question Preview
              </h2>
              <div className="mt-5 grid gap-5 md:grid-cols-[1fr_0.9fr]">
                <div>
                  <p className="text-base font-semibold leading-7 text-slate-700">In the figure, ABCD is a parallelogram.</p>
                  <p className="mt-2 text-base font-semibold leading-7 text-slate-700">If AE = 3x - 1 and EC = 2x + 5, what is the length of AE?</p>
                </div>
                <div className="min-h-40 rounded-2xl bg-sky-50 p-3">
                  <MiniDiagram />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["7", "8", "9", "10"].map((answer, index) => (
                  <button key={answer} type="button" className="focus-ring min-h-12 rounded-xl border border-blue-200 bg-blue-50 text-base font-black text-blue-700">
                    <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-blue-600 text-xs text-white">{String.fromCharCode(65 + index)}</span>
                    {answer}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" className="focus-ring min-h-12 rounded-xl border border-blue-200 bg-white px-5 text-base font-black text-blue-600">Hint</button>
                <button type="button" className="focus-ring min-h-12 rounded-xl bg-blue-600 px-7 text-base font-black text-white shadow-[0_8px_0_#1d4ed8]">Try This Question</button>
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-base font-black text-emerald-800">Current Streak</p>
                <p className="mt-3 text-5xl font-black text-emerald-700">12 <span className="text-xl">days</span></p>
                <p className="mt-2 font-semibold text-emerald-800">Keep it going!</p>
              </div>
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-base font-black text-orange-700">Accuracy</p>
                <p className="mt-3 text-5xl font-black text-slate-700">86%</p>
                <p className="mt-2 font-semibold text-emerald-700">Nice work!</p>
                <svg aria-hidden="true" viewBox="0 0 120 54" className="mt-2 h-12 w-full text-emerald-500">
                  <path d="M8 42 34 29l18 8 22-25 13 12 25-18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
                </svg>
              </div>
            </aside>
          </div>

          <div id="rewards" className="mt-5 grid gap-4 rounded-3xl border border-sky-100 bg-sky-50/80 p-5 md:grid-cols-3">
            {[
              ["New missions every week!", "Come back on Monday for fresh challenges."],
              ["Collect Gems", "Earn gems by completing missions and use them in the store."],
              ["Earn Stars", "Collect stars to unlock new areas and rewards."]
            ].map(([title, body], index) => (
              <div key={title} className="flex items-center gap-4 border-sky-200 md:border-r md:last:border-r-0">
                <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${index === 0 ? "bg-blue-100 text-blue-600" : index === 1 ? "bg-emerald-100 text-emerald-600" : "bg-yellow-100 text-yellow-500"}`}>
                  {index === 1 ? <GemIcon /> : <StarIcon />}
                </span>
                <div>
                  <h3 className="font-black text-blue-700">{title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
