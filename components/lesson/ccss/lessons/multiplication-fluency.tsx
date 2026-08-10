"use client";

import { useState } from "react";
import { MathCheck } from "@/components/lesson/ccss/MathCheck";
import { Figure } from "@/components/lesson/ccss/Figure";
import { FigureScroll } from "@/components/lesson/ccss/FigureScroll";

const N = 10;
const SEL = "var(--band-upper)";
const LINE = "color-mix(in oklab, var(--band-upper) 18%, var(--surface))";

export function isOneDigitMultiplicationFact(left: number, right: number) {
  return left >= 1 && left <= 9 && right >= 1 && right <= 9;
}

export default function Lesson() {
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 6, c: 7 });
  const product = sel.r * sel.c;
  const isCoreOneDigitFact = isOneDigitMultiplicationFact(sel.r, sel.c);

  return (
    <div className="prose-lesson max-w-none">
      <p>
        The <strong>multiplication table</strong>{" "}holds every fact from 1×1 to
        10×10. Tap a square to see the product — and its matching{" "}
        <strong>division</strong>{" "}fact. Patterns in the table make the facts easier
        to remember. The 1×1 through 9×9 cells are the one-digit facts; the 10
        row and column are a place-value pattern extension.
      </p>

      <Figure caption="Tap any square. Its row and column light up, and the fact family appears.">
        <div className="flex flex-col items-center gap-6">
          <FigureScroll>
            <table className="mx-auto border-collapse font-mono text-xs sm:text-sm">
              <tbody>
                <tr>
                  <th className="p-1 text-[var(--band-upper)]">×</th>
                  {Array.from({ length: N }, (_, c) => (
                    <th key={c} className="w-7 p-1 text-center" style={{ color: c + 1 === sel.c ? SEL : "var(--ink-faint)" }}>{c + 1}</th>
                  ))}
                </tr>
                {Array.from({ length: N }, (_, r) => (
                  <tr key={r}>
                    <th className="p-1 text-center" style={{ color: r + 1 === sel.r ? SEL : "var(--ink-faint)" }}>{r + 1}</th>
                    {Array.from({ length: N }, (_, c) => {
                      const isSel = r + 1 === sel.r && c + 1 === sel.c;
                      const inLine = r + 1 === sel.r || c + 1 === sel.c;
                      return (
                        <td key={c} className="p-0">
                          <button type="button" onClick={() => setSel({ r: r + 1, c: c + 1 })} aria-pressed={isSel} className="grid h-7 w-7 place-items-center rounded font-bold" style={{ background: isSel ? SEL : inLine ? LINE : "transparent", color: isSel ? "white" : "var(--ink-soft)" }} aria-label={`${r + 1} times ${c + 1} equals ${(r + 1) * (c + 1)}`}>
                            {(r + 1) * (c + 1)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </FigureScroll>

          <output className="text-center" aria-label="Selected multiplication fact" aria-live="polite" aria-atomic="true">
            <div className="font-mono text-2xl font-black" style={{ color: SEL }}>{sel.r} × {sel.c} = {product}</div>
            {/* On the diagonal the two "different" division facts are identical. */}
            <div className="mt-1 font-mono text-sm text-[var(--ink-soft)]">{sel.r === sel.c ? `so ${product} ÷ ${sel.r} = ${sel.c} — a square fact, so it gives just one division` : `so ${product} ÷ ${sel.r} = ${sel.c} and ${product} ÷ ${sel.c} = ${sel.r}`}</div>
          </output>
        </div>
      </Figure>

      <h2>{sel.r === sel.c ? "A square fact has two distinct equations" : "One fact, four ways"}</h2>
      <p>
        {sel.r === sel.c ? (
          <>
            On the table&apos;s diagonal, both factors are {sel.r}. Swapping them
            repeats the same multiplication, and both inverse divisions repeat
            the same division. So this square fact has two distinct equations:{" "}
            <strong>{sel.r} × {sel.r} = {product}</strong>{" "}and{" "}
            <strong>{product} ÷ {sel.r} = {sel.r}</strong>.
          </>
        ) : (
          <>
            Each off-diagonal square gives a whole <strong>fact family</strong>:{" "}
            {sel.r} × {sel.c} = {product}, {sel.c} × {sel.r} = {product},{" "}
            {product} ÷ {sel.r} = {sel.c}, and {product} ÷ {sel.c} = {sel.r}.
            Learn one and you know all four.
          </>
        )}
      </p>

      <MathCheck>
        <p>
          {isCoreOneDigitFact
            ? <>Fluently multiplying and dividing within 100 (3.OA.C.7) includes knowing the products of two one-digit numbers from memory and using the link between multiplication and division.</>
            : <>The selected ×10 fact is a place-value pattern extension within 100, not one of the standard&apos;s products of two one-digit factors to memorize.</>} Because {sel.r} × {sel.c} = {product}, the division {product} ÷ {sel.r} must equal {sel.c} — the same fact family seen from the other side.
        </p>
      </MathCheck>
    </div>
  );
}
