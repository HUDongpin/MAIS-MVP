"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal scroller for a lesson figure that is wider than its card.
 *
 * Some ported CCSS figures have a fixed intrinsic width — the 0–20 number line
 * is 728px, because 20 legible tick labels need the room. On a Chromebook or an
 * iPad in portrait that fits and nothing here changes. On a phone it does not,
 * and the figure has to pan.
 *
 * Panning already worked; what was missing was any sign that it could. A child
 * saw a number line that appeared to stop at 8. So when — and only when — the
 * content actually overflows, the trailing edge fades and the figure is
 * announced as scrollable. Scaling the figure down instead was the obvious
 * alternative and is the wrong one: fitting 728px into a 277px card is a 0.38x
 * shrink, which renders the tick labels at about 4px.
 *
 * The fade is driven by measurement rather than a breakpoint, because whether a
 * figure overflows depends on its own width, not on the size of the screen.
 */
export function FigureScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const overflowing = node.scrollWidth > node.clientWidth + 1;
    setIsOverflowing(overflowing);
    // Once the student has panned to the end there is nothing left to hint at.
    setAtEnd(overflowing && node.scrollLeft >= node.scrollWidth - node.clientWidth - 1);
  }, []);

  useEffect(() => {
    measure();
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    // The figure's own size can change without the window resizing — these are
    // interactive lessons whose controls redraw the SVG.
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure]);

  const showFade = isOverflowing && !atEnd;

  return (
    <div
      ref={ref}
      onScroll={measure}
      data-figure-overflowing={isOverflowing ? "true" : undefined}
      // Same trailing-edge mask the visualization lab rail uses for its
      // overflowing grade rail, so "there is more this way" reads the same way
      // everywhere in the product.
      className={`w-full overflow-x-auto ${
        showFade ? "[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]" : ""
      }`}
      // A pannable figure is a scroll region, and a keyboard user needs to be
      // able to reach it; `tabIndex` only applies while there is somewhere to go.
      role={isOverflowing ? "region" : undefined}
      tabIndex={isOverflowing ? 0 : undefined}
      aria-label={isOverflowing ? "Scrollable diagram — scroll sideways to see all of it" : undefined}
    >
      {children}
    </div>
  );
}
