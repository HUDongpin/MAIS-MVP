import type { ReactNode } from "react";

export type TeacherNavIconName =
  | "overview"
  | "assignments"
  | "inbox"
  | "live"
  | "lessonKits"
  | "assessments"
  | "resources"
  | "classes"
  | "analytics"
  | "rewards"
  | "reports"
  | "operations"
  | "safety";

const iconPaths: Record<TeacherNavIconName, ReactNode> = {
  overview: (
    <>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5.5 9v11.5h13V9" />
      <path d="M10 20.5v-5h4v5" />
    </>
  ),
  assignments: (
    <>
      <path d="M9 4.5H5.5v16h13v-16H15" />
      <rect x="9" y="3" width="6" height="3.5" rx="1" />
      <path d="m9 13.5 2 2 4-4.5" />
    </>
  ),
  inbox: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="m4.5 6.5 7.5 6 7.5-6" />
    </>
  ),
  live: (
    <>
      <path d="M3 4.5h18" />
      <path d="M5 4.5h14V15H5z" />
      <path d="M12 15v3" />
      <path d="m8 21 4-3 4 3" />
    </>
  ),
  lessonKits: (
    <>
      <path d="M12 6.5C10 5 7.5 4.5 4 4.5v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-14c-3.5 0-6 .5-8 2z" />
      <path d="M12 6.5v14" />
    </>
  ),
  assessments: (
    <>
      <path d="M6 3.5h8.5l4 4V20.5H6z" />
      <path d="M14 3.5V8h4.5" />
      <path d="m9 14.5 2 2 4-4.5" />
    </>
  ),
  resources: (
    <>
      <path d="M3.5 6.5h6l2 2h9v11h-17z" />
    </>
  ),
  classes: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20.5v-1a5.5 5.5 0 0 1 11 0v1" />
      <path d="M15.5 5.4a3 3 0 1 1 1.3 5.8" />
      <path d="M20.5 20.5v-1a5.5 5.5 0 0 0-3.2-5" />
    </>
  ),
  analytics: (
    <>
      <path d="M5 20v-6" />
      <path d="M11 20V8" />
      <path d="M17 20v-9" />
      <path d="M3 20h18" />
    </>
  ),
  rewards: (
    <>
      <rect x="4" y="8.5" width="16" height="4" rx="1" />
      <path d="M6 12.5v8h12v-8" />
      <path d="M12 8.5v12" />
      <path d="M12 8.5c-3.5 0-4.8-4.5-1.8-4.5 1.8 0 1.8 2.7 1.8 4.5zm0 0c3.5 0 4.8-4.5 1.8-4.5-1.8 0-1.8 2.7-1.8 4.5z" />
    </>
  ),
  reports: (
    <>
      <path d="M6 3.5h8.5l4 4V20.5H6z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 17v-3" />
      <path d="M12 17v-5" />
      <path d="M15 17v-2" />
    </>
  ),
  operations: (
    <>
      <path d="M4 20.5v-15l8-2.5v17.5" />
      <path d="M12 20.5h8V9.5h-8" />
      <path d="M3 20.5h18" />
      <path d="M7.5 9h1M7.5 13h1M15.5 13h1M15.5 16.5h1" />
    </>
  ),
  safety: (
    <>
      <path d="M12 3 5 6v5.5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" />
      <path d="M12 8.5v4" />
      <path d="M12 15.5h.01" />
    </>
  )
};

export function TeacherNavIcon({ name, className }: { name: TeacherNavIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {iconPaths[name]}
    </svg>
  );
}
