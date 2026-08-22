import { createElement, Fragment } from "react";

import type { QuestionDiagramSemanticSummary } from "@/lib/questionFigure";

/**
 * Shared semantic descendants for QuestionFigure. Keeping this small renderer
 * in a `.ts` module lets the canonical CommonJS question-bank gate exercise
 * the exact visible caption and screen-reader table without evaluating the
 * surrounding TSX/SVG implementation under `jsx: preserve`.
 */
export function questionFigureSemanticElements(semantics: QuestionDiagramSemanticSummary) {
  const caption = createElement(
    "figcaption",
    { className: "mt-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300" },
    semantics.caption
  );
  if (!semantics.table) return caption;

  const table = createElement(
    "table",
    { className: "sr-only" },
    createElement("caption", null, semantics.table.caption),
    createElement(
      "thead",
      null,
      createElement(
        "tr",
        null,
        ...semantics.table.headers.map((header, index) =>
          createElement("th", { key: `${index}-${header}`, scope: "col" }, header)
        )
      )
    ),
    createElement(
      "tbody",
      null,
      ...semantics.table.rows.map((row) =>
        createElement(
          "tr",
          { key: row.key },
          ...row.cells.map((cell, index) =>
            index === 0
              ? createElement("th", { key: `${row.key}-${index}`, scope: "row" }, cell)
              : createElement("td", { key: `${row.key}-${index}` }, cell)
          )
        )
      )
    )
  );
  return createElement(Fragment, null, caption, table);
}
