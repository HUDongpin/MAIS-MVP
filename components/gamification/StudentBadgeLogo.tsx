import { cn } from "@/lib/utils";

type StudentBadgeLogoProps = {
  badgeId: string;
  earned: boolean;
};

type BadgePalette = {
  shell: string;
  ring: string;
  primary: string;
  secondary: string;
  accent: string;
  sparkle: string;
};

const earnedPalettes: Record<string, BadgePalette> = {
  "first-lesson": {
    shell: "#ecfeff",
    ring: "#22d3ee",
    primary: "#0891b2",
    secondary: "#34d399",
    accent: "#facc15",
    sparkle: "#f59e0b"
  },
  "accuracy-builder": {
    shell: "#eff6ff",
    ring: "#38bdf8",
    primary: "#2563eb",
    secondary: "#22c55e",
    accent: "#14b8a6",
    sparkle: "#a7f3d0"
  },
  "three-day-rhythm": {
    shell: "#fff7ed",
    ring: "#fb923c",
    primary: "#ea580c",
    secondary: "#f97316",
    accent: "#facc15",
    sparkle: "#fb7185"
  },
  "visual-thinker": {
    shell: "#f0fdfa",
    ring: "#2dd4bf",
    primary: "#0f766e",
    secondary: "#8b5cf6",
    accent: "#22d3ee",
    sparkle: "#f0abfc"
  },
  "mistake-repair": {
    shell: "#fff1f2",
    ring: "#fb7185",
    primary: "#be123c",
    secondary: "#f59e0b",
    accent: "#10b981",
    sparkle: "#fde68a"
  },
  "level-three": {
    shell: "#fefce8",
    ring: "#facc15",
    primary: "#ca8a04",
    secondary: "#06b6d4",
    accent: "#f97316",
    sparkle: "#fde047"
  },
  "adventure-island-clear": {
    shell: "#ecfdf5",
    ring: "#34d399",
    primary: "#047857",
    secondary: "#2563eb",
    accent: "#facc15",
    sparkle: "#38bdf8"
  }
};

const lockedPalette: BadgePalette = {
  shell: "#f8fafc",
  ring: "#cbd5e1",
  primary: "#64748b",
  secondary: "#94a3b8",
  accent: "#cbd5e1",
  sparkle: "#e2e8f0"
};

function BadgeGlyph({ badgeId, colors }: { badgeId: string; colors: BadgePalette }) {
  switch (badgeId) {
    case "accuracy-builder":
      return (
        <>
          <circle cx="32" cy="32" r="18" fill="none" stroke={colors.secondary} strokeWidth="5" />
          <circle cx="32" cy="32" r="11" fill="none" stroke={colors.primary} strokeWidth="4" />
          <circle cx="32" cy="32" r="4.8" fill={colors.secondary} />
          <path d="M43 20l3.2-3.2M48 24l3.5-1.2" stroke={colors.accent} strokeLinecap="round" strokeWidth="4" />
          <path d="M24.5 33.5l5 5 11-13" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.2" />
        </>
      );
    case "three-day-rhythm":
      return (
        <>
          <path d="M15 37c7-12 14 11 21-1s14 7 15-6" fill="none" stroke={colors.primary} strokeLinecap="round" strokeWidth="4" />
          <circle cx="18" cy="39" r="5.2" fill={colors.secondary} />
          <circle cx="32" cy="30" r="5.2" fill={colors.accent} />
          <circle cx="46" cy="35" r="5.2" fill={colors.secondary} />
          <path d="M20 18h24" stroke={colors.primary} strokeLinecap="round" strokeWidth="4" />
          <path d="M24 15v6M32 15v6M40 15v6" stroke={colors.accent} strokeLinecap="round" strokeWidth="3" />
        </>
      );
    case "visual-thinker":
      return (
        <>
          <path d="M16 33l16-14 16 14-16 14-16-14z" fill={colors.accent} opacity="0.45" />
          <path d="M18 33l14-11 14 11-14 11-14-11z" fill="none" stroke={colors.primary} strokeLinejoin="round" strokeWidth="4" />
          <circle cx="32" cy="33" r="6.2" fill={colors.secondary} />
          <circle cx="32" cy="33" r="2.6" fill="#ffffff" />
          <path d="M47 18l1.7 3.5 3.8 1.5-3.8 1.5L47 28l-1.7-3.5-3.8-1.5 3.8-1.5L47 18z" fill={colors.sparkle} />
          <path d="M16 18l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1 1-2.2z" fill={colors.secondary} />
        </>
      );
    case "mistake-repair":
      return (
        <>
          <path d="M19 42l4-12 17-17 8 8-17 17-12 4z" fill={colors.secondary} />
          <path d="M23 30l8 8M40 13l8 8" stroke="#ffffff" strokeLinecap="round" strokeWidth="3.5" />
          <path d="M15 24l5 5 9-11" fill="none" stroke={colors.accent} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5" />
          <path d="M37 42h12" stroke={colors.primary} strokeLinecap="round" strokeWidth="4" />
          <circle cx="48" cy="17" r="3" fill={colors.sparkle} />
        </>
      );
    case "level-three":
      return (
        <>
          <path d="M21 19h22v7c0 8-5 13-11 13s-11-5-11-13v-7z" fill={colors.accent} />
          <path d="M21 22h-6c1 8 5 11 10 11M43 22h6c-1 8-5 11-10 11" fill="none" stroke={colors.secondary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d="M27 45h10M24 51h16" stroke={colors.primary} strokeLinecap="round" strokeWidth="4" />
          <path d="M27 25h10l-5.5 5H35c3 0 5 2 5 5s-2.8 5.5-7.2 5.5c-2.5 0-4.8-.8-6.4-2.3" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d="M49 13l1.4 3 3.1 1.2-3.1 1.2-1.4 3-1.4-3-3.1-1.2 3.1-1.2L49 13z" fill={colors.sparkle} />
        </>
      );
    case "adventure-island-clear":
      return (
        <>
          <path d="M16 40c5-15 11-22 16-22s11 7 16 22" fill="none" stroke={colors.primary} strokeLinecap="round" strokeWidth="4" />
          <path d="M18 43h28" stroke={colors.secondary} strokeLinecap="round" strokeWidth="4" />
          <circle cx="32" cy="18" r="4.8" fill={colors.accent} />
          <path d="M23 34h18M28 27h8" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
          <path d="M48 17l1.6 3.4 3.7 1.4-3.7 1.4L48 27l-1.6-3.8-3.7-1.4 3.7-1.4L48 17z" fill={colors.sparkle} />
          <path d="M15 20l3 3 5-7" fill="none" stroke={colors.secondary} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        </>
      );
    case "first-lesson":
    default:
      return (
        <>
          <path d="M15 21c7-3 12-2 17 2v26c-5-4-10-5-17-2V21z" fill="#ffffff" stroke={colors.primary} strokeLinejoin="round" strokeWidth="3.5" />
          <path d="M49 21c-7-3-12-2-17 2v26c5-4 10-5 17-2V21z" fill="#ffffff" stroke={colors.secondary} strokeLinejoin="round" strokeWidth="3.5" />
          <path d="M32 23v26" stroke={colors.ring} strokeLinecap="round" strokeWidth="3" />
          <path d="M45 13l1.8 3.8 4.2 1.6-4.2 1.6L45 25l-1.8-4-4.2-1.6 4.2-1.6L45 13z" fill={colors.accent} />
          <path d="M20 29h6M20 36h5M39 29h5M38 36h6" stroke={colors.primary} strokeLinecap="round" strokeWidth="2.5" opacity="0.65" />
        </>
      );
  }
}

export function StudentBadgeLogo({ badgeId, earned }: StudentBadgeLogoProps) {
  const colors = earned ? (earnedPalettes[badgeId] ?? earnedPalettes["first-lesson"]) : lockedPalette;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl border shadow-sm",
        earned
          ? "border-white/80 shadow-cyan-500/15"
          : "border-slate-200/80 opacity-80 dark:border-white/10 dark:opacity-70"
      )}
      style={{ background: colors.shell }}
    >
      <span
        className={cn(
          "absolute inset-1 rounded-[1rem] border",
          earned ? "border-white/75 bg-white/35" : "border-white/70 bg-white/20"
        )}
      />
      <svg viewBox="0 0 64 64" className="relative h-14 w-14" role="img" focusable="false">
        <circle cx="32" cy="32" r="27" fill={colors.shell} stroke={colors.ring} strokeWidth="3" />
        <BadgeGlyph badgeId={badgeId} colors={colors} />
        {earned ? (
          <g>
            <circle cx="50" cy="50" r="9" fill={colors.secondary} stroke="#ffffff" strokeWidth="3" />
            <path d="M46.2 50.2l2.5 2.5 5-6" fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8" />
          </g>
        ) : null}
      </svg>
    </span>
  );
}
