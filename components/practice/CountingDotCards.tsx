import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/types";

type CountingDotCardsProps = {
  quantities: number[];
  t: (localized: LocalizedText) => string;
};

// Warm, distinct counter colours so multiple frames read as separate groups.
const tenFrameCounterClasses = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500"
] as const;

function TenFrame({ quantity, colorClassName }: { quantity: number; colorClassName: string }) {
  const frameCount = Math.max(1, Math.ceil(quantity / 10));

  return (
    <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
      {Array.from({ length: frameCount }, (_, frameIndex) => {
        const filledInFrame = Math.min(10, Math.max(0, quantity - frameIndex * 10));
        return (
          <div
            key={frameIndex}
            className="grid grid-cols-5 grid-rows-2 gap-1 rounded-xl border-2 border-sky-200 bg-sky-50/50 p-1.5 dark:border-sky-300/30 dark:bg-sky-950/30"
          >
            {Array.from({ length: 10 }, (_, cellIndex) => (
              <span
                key={cellIndex}
                className={cn(
                  "size-4 rounded-full transition",
                  cellIndex < filledInFrame
                    ? cn(colorClassName, "shadow-sm ring-2 ring-white/70 dark:ring-white/20")
                    : "border border-dashed border-sky-300/70 dark:border-sky-300/25"
                )}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function CountingDotCards({ quantities, t }: CountingDotCardsProps) {
  if (!quantities.length) return null;

  return (
    <div
      data-testid="counting-dot-cards"
      role="img"
      aria-label={t({
        en: `Ten frames showing ${quantities.join(", ")} counters`,
        zh: `十格陣顯示 ${quantities.join("、")} 個`,
        zhHans: `十格阵显示 ${quantities.join("、")} 个`
      })}
      className="mt-4 flex flex-wrap items-start gap-3"
    >
      {quantities.map((quantity, cardIndex) => (
        <div
          key={`${cardIndex}-${quantity}`}
          data-counting-dot-card
          className="min-w-0 max-w-full rounded-2xl border border-sky-200/80 bg-white p-3 shadow-sm dark:border-sky-300/25 dark:bg-slate-950/40"
        >
          <TenFrame quantity={quantity} colorClassName={tenFrameCounterClasses[cardIndex % tenFrameCounterClasses.length]} />
        </div>
      ))}
    </div>
  );
}
