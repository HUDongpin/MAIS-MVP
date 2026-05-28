export default function PracticeLoading() {
  return (
    <div className="min-h-full bg-[linear-gradient(115deg,#eefaff_0%,#f8fbff_46%,#f7f4ff_100%)] text-slate-950 dark:bg-none dark:bg-slate-950 dark:text-slate-100">
      <div className="page-container py-10 sm:py-12">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-500 dark:text-cyan-300">Practice Arena</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">Loading practice set...</h1>
        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="h-80 animate-pulse rounded-[1.5rem] border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/[0.055]" />
          <div className="h-80 animate-pulse rounded-[1.5rem] border border-cyan-200/70 bg-cyan-50/70 dark:border-cyan-300/20 dark:bg-cyan-300/10" />
        </div>
      </div>
    </div>
  );
}
