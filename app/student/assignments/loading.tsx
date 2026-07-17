export default function StudentAssignmentsLoading() {
  return (
    <div className="page-container py-10 sm:py-12">
      {/* Visual-only skeleton: the hydrated StudentAssignmentsView owns the
          single role="status" live region so the loading state is announced
          once, not twice, during the SSR→client handoff. */}
      <section className="glass-panel min-h-72 p-6 sm:p-8" aria-hidden="true">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">Student assignments</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white">My assignments</h1>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
          Loading assignments
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-cyan-100/80 dark:bg-white/10">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400 dark:bg-cyan-300" />
        </div>
      </section>
    </div>
  );
}
