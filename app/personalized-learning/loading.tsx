export default function PersonalizedLearningLoading() {
  return (
    <div className="min-h-full bg-[linear-gradient(115deg,#eefaff_0%,#f8fbff_46%,#f7f4ff_100%)] text-slate-950 dark:bg-none dark:bg-slate-950 dark:text-slate-100">
      <div className="page-container py-10 sm:py-12">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">Personalized Learning</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Loading personalized plan...</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-36 animate-pulse rounded-[1.5rem] border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.055]" />
          ))}
        </div>
      </div>
    </div>
  );
}
