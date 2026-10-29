/**
 * Keeping figure labels off each other.
 *
 * A lesson figure computes its label positions from control state, and the
 * states where two of them land in the same place are exactly the states nobody
 * opens by hand: the identity transformation, where a triangle sits on its own
 * image; the point dragged onto an axis, where its name meets the axis numbers;
 * the two points made equal, where P is drawn under Q.
 *
 * The fix is the same shape every time. Offer the label a short list of places
 * it could sit, in the order you would prefer them, say what it must stay clear
 * of, and take the first that fits. Choosing is deterministic, so a lesson test
 * can enumerate the whole control grid and assert that a real choice was
 * available in every state — `pickSpot` reporting `fitted: false` anywhere is
 * the signal that the candidate list is too short, not something to paper over.
 *
 * Boxes are in the figure's own viewBox units, y growing downward, which is
 * what the SVG coordinates in a lesson already are.
 */

export type LabelBox = { x0: number; y0: number; x1: number; y1: number };

/**
 * The box an SVG <text> covers. `y` is the text baseline, as in the `y`
 * attribute; the box runs from `rise` above it to `drop` below, and the
 * defaults are generous enough for the ascenders and descenders of the lesson
 * faces at ordinary label sizes.
 */
export function textBox(
  x: number,
  y: number,
  width: number,
  { anchor = "middle", rise = 0.82, drop = 0.26, fontSize }: { anchor?: "start" | "middle" | "end"; rise?: number; drop?: number; fontSize: number },
): LabelBox {
  const x0 = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return { x0, y0: y - rise * fontSize, x1: x0 + width, y1: y + drop * fontSize };
}

/** True when the two boxes come within `gap` of each other in both directions. */
export function collides(a: LabelBox, b: LabelBox, gap = 0): boolean {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > -gap && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > -gap;
}

/** How much of `gap` the two boxes eat into, so a fallback can pick the least bad. */
export function encroachment(a: LabelBox, b: LabelBox, gap: number): number {
  const dx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + gap;
  const dy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + gap;
  return dx <= 0 || dy <= 0 ? 0 : dx * dy;
}

export function insideBounds(box: LabelBox, bounds: LabelBox, gap = 0): boolean {
  return box.x0 >= bounds.x0 + gap && box.x1 <= bounds.x1 - gap && box.y0 >= bounds.y0 + gap && box.y1 <= bounds.y1 - gap;
}

/**
 * The first candidate that clears every obstacle by `gap` and stays inside
 * `bounds`. When none does — which a lesson test should prove cannot happen —
 * the least crowded candidate is returned with `fitted: false` rather than
 * throwing, so a student never meets a blank figure.
 */
export function pickSpot<T extends { box: LabelBox }>(
  candidates: readonly T[],
  obstacles: readonly LabelBox[],
  { gap = 2, bounds }: { gap?: number; bounds?: LabelBox } = {},
): T & { fitted: boolean } {
  let best = candidates[0], bestCost = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (bounds && !insideBounds(candidate.box, bounds)) continue;
    let cost = 0;
    for (const obstacle of obstacles) cost += encroachment(candidate.box, obstacle, gap);
    if (cost === 0) return { ...candidate, fitted: true };
    if (cost < bestCost) { best = candidate; bestCost = cost; }
  }
  return { ...best, fitted: false };
}
