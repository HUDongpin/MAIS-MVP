import { cn } from "@/lib/utils";

export type NovaCompanionMood = "happy" | "cheer" | "encourage";

type NovaCompanionProps = {
  mood?: NovaCompanionMood;
  className?: string;
  title?: string;
};

/**
 * Nova, the practice star companion. A friendly face on the star that already
 * powers the Practice Arena reward economy, so young learners get a character
 * to bond with without shipping a heavy illustration. Purely decorative: the
 * meaningful label always lives on the surrounding control.
 */
export function NovaCompanion({ mood = "happy", className, title }: NovaCompanionProps) {
  const gradientId = `nova-body-${mood}`;

  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("h-10 w-10 shrink-0", className)}
      role="img"
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <path
        d="M24 3.5c1.4 0 2.7.85 3.24 2.16l3.63 8.78 9.47.79c3.1.26 4.35 4.12 1.98 6.16l-7.2 6.2 2.17 9.26c.71 3.03-2.57 5.42-5.24 3.8L24 39.7l-8.03 4.9c-2.67 1.62-5.95-.77-5.24-3.8l2.17-9.26-7.2-6.2c-2.37-2.04-1.12-5.9 1.98-6.16l9.47-.79 3.63-8.78A3.5 3.5 0 0 1 24 3.5Z"
        fill={`url(#${gradientId})`}
        stroke="#f59e0b"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* cheeks */}
      <circle cx="17" cy="27" r="2.4" fill="#fb7185" opacity="0.55" />
      <circle cx="31" cy="27" r="2.4" fill="#fb7185" opacity="0.55" />
      {/* eyes */}
      {mood === "cheer" ? (
        <>
          <path d="M15.6 22.5c1.1-1.6 3.5-1.6 4.6 0" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
          <path d="M27.8 22.5c1.1-1.6 3.5-1.6 4.6 0" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="18" cy="22.5" r="2.1" fill="#7c2d12" />
          <circle cx="30" cy="22.5" r="2.1" fill="#7c2d12" />
          <circle cx="18.8" cy="21.8" r="0.7" fill="#fff" />
          <circle cx="30.8" cy="21.8" r="0.7" fill="#fff" />
        </>
      )}
      {/* mouth */}
      {mood === "encourage" ? (
        <path d="M20 29.5c1.4 1 6.6 1 8 0" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
      ) : mood === "cheer" ? (
        <path d="M19 28.5c1.6 3.4 8.4 3.4 10 0a5 5 0 0 1-10 0Z" fill="#7c2d12" />
      ) : (
        <path d="M19.5 28.8c1.5 2.2 7.5 2.2 9 0" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
