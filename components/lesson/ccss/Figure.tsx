import type { ReactNode } from "react";

/** Wraps an interactive visualization in a bordered stage with a caption. */
export function Figure({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <figure className="my-6">
      <div className="card overflow-hidden p-4 sm:p-6">{children}</div>
      {caption ? (
        <figcaption className="mt-2 px-1 text-sm text-[var(--ink-faint)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
