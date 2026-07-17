"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type PasswordInputWithRevealProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  showLabel: string;
  hideLabel: string;
};

function EyeIcon({ hidden }: { hidden?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      <path d="M2.1 12s3.2-6 9.9-6 9.9 6 9.9 6-3.2 6-9.9 6-9.9-6-9.9-6Z" />
      <circle cx="12" cy="12" r="3" />
      {hidden ? <path d="M4 4l16 16" /> : null}
    </svg>
  );
}

export const PasswordInputWithReveal = forwardRef<HTMLInputElement, PasswordInputWithRevealProps>(function PasswordInputWithReveal(
  { className, disabled, hideLabel, showLabel, ...props },
  ref
) {
  const [revealed, setRevealed] = useState(false);
  const buttonLabel = revealed ? hideLabel : showLabel;

  return (
    <span className="relative block w-full">
      <input
        {...props}
        ref={ref}
        type={revealed ? "text" : "password"}
        disabled={disabled}
        className={cn("block w-full pr-12", className)}
      />
      <button
        type="button"
        aria-label={buttonLabel}
        title={buttonLabel}
        disabled={disabled}
        onClick={() => setRevealed((current) => !current)}
        className="focus-ring absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <EyeIcon hidden={revealed} />
      </button>
    </span>
  );
});
