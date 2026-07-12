export const illustrationTextMatchStandardForRag = [
  "Illustration-textbook text match gate for US, Hong Kong, and Mainland China mathematics RAG:",
  "A: 强匹配，可用于教材页。Use only when the illustration directly matches the lesson/question text, visible mathematical objects, labels, values, caption or alt text, and has no math or source-distance risk.",
  "B: 方法/概念支持匹配，可用于教材插图，但不能说是精确题图。Use for concept or method support only; caption must not claim it is the exact example, exercise, or worked-problem figure.",
  "C: 弱匹配，需改 caption 或重绘。Hold before release until the caption/alt text is narrowed or the illustration is redrawn.",
  "D: 错配，不批准。Do not use the illustration for this textbook text.",
  "E: 拒绝，含数学错误、解题结果泄漏、版权/原教材复刻风险、水印/不当内容等。Reject and block release.",
  "Only A or B can be used in approved student-facing RAG output. C requires remediation; D and E are release blockers.",
  "For exact step-model visuals, solution-critical diagrams, graphs, tables, or geometric figures, use deterministic math rendering layers and verify labels, values, units, and non-leakage before approval.",
  "Never copy or reconstruct original textbook full layouts, publisher marks, hidden extraction byproducts, or recognisable protected visual expression."
] as const;
