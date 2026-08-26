import type { ReactNode } from "react";

export type ParentNavIconName = "overview" | "reports" | "messages" | "notices" | "connect";

const iconPaths: Record<ParentNavIconName, ReactNode> = {
  overview: (
    <>
      <path d="m3.5 10.5 8.5-7 8.5 7" />
      <path d="M5.5 9.5v11h13v-11" />
      <path d="M9.5 20.5v-5h5v5" />
    </>
  ),
  reports: (
    <>
      <path d="M6 3.5h8.5l4 4v13H6z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M9 16.5v-3M12 16.5v-5M15 16.5v-2" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5.5h16v11H9l-5 4z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  notices: (
    <>
      <path d="M6.5 17.5h11l-1.5-2v-5a4 4 0 0 0-8 0v5z" />
      <path d="M10 20.5h4" />
      <path d="M12 3.5v1" />
    </>
  ),
  connect: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20.5v-1a5.5 5.5 0 0 1 11 0v1" />
      <path d="M18 9.5v7M14.5 13h7" />
    </>
  )
};

export function ParentNavIcon({ name, className }: { name: ParentNavIconName; className?: string }) {
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
