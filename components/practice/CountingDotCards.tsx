import type { LocalizedText } from "@/types";

type CountingDotCardsProps = {
  quantities: number[];
  t: (localized: LocalizedText) => string;
};

export function CountingDotCards({ quantities, t }: CountingDotCardsProps) {
  if (!quantities.length) return null;

  return (
    <div
      data-testid="counting-dot-cards"
      role="img"
      aria-label={t({
        en: `Dot cards showing ${quantities.join(", ")} dots`,
        zh: `點卡顯示 ${quantities.join("、")} 點`,
        zhHans: `点卡显示 ${quantities.join("、")} 点`
      })}
      className="mt-4 flex flex-wrap items-start gap-3"
    >
      {quantities.map((quantity, cardIndex) => (
        <div
          key={`${cardIndex}-${quantity}`}
          className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3 shadow-sm dark:border-sky-300/25 dark:bg-sky-950/30"
        >
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: quantity }, (_, dotIndex) => (
              <span key={dotIndex} aria-hidden="true" className="size-3.5 rounded-full bg-sky-500 dark:bg-sky-300" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
