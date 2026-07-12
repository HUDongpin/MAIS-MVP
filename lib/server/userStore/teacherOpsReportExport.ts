import type { TeacherReportPreview } from "@/types";

function escapeCsvCell(cell: string) {
  return `"${cell.replace(/"/g, "\"\"")}"`;
}

export function teacherReportPreviewToCsv(preview: TeacherReportPreview) {
  const rows = [
    ["Field", "Value"],
    ["Title", preview.title],
    ["Subtitle", preview.subtitle],
    ["Generated at", preview.generatedAt],
    ["Subject", preview.subjectName],
    ["Class", preview.className ?? ""],
    ["Learning minutes", String(preview.metrics.learningMinutes)],
    ["Mastery change", String(preview.metrics.masteryChange)],
    ["Average mastery", String(preview.metrics.averageMastery)],
    ["Accuracy", preview.metrics.accuracy === null ? "" : String(preview.metrics.accuracy)],
    ["Completion rate", preview.metrics.completionRate === null ? "" : String(preview.metrics.completionRate)],
    ["Strengths", preview.strengths.join("; ")],
    ["Weaknesses", preview.weaknesses.join("; ")],
    ["Mistake types", preview.mistakeTypes.join("; ")],
    ["Suggested practice", preview.suggestedPractice.join("; ")],
    ["Teacher remarks", preview.teacherRemarks]
  ];

  return rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, "?");
}

export function teacherReportPreviewToPdf(preview: TeacherReportPreview) {
  const lines = [
    preview.title,
    preview.subtitle,
    `Subject: ${preview.subjectName}`,
    preview.className ? `Class: ${preview.className}` : "",
    `Generated: ${new Date(preview.generatedAt).toLocaleString("en-HK")}`,
    `Learning minutes: ${preview.metrics.learningMinutes}`,
    `Average mastery: ${preview.metrics.averageMastery}%`,
    `Accuracy: ${preview.metrics.accuracy ?? "-"}%`,
    `Completion: ${preview.metrics.completionRate ?? "-"}%`,
    "",
    "Strengths:",
    ...preview.strengths.map((item) => `- ${item}`),
    "",
    "Weaknesses:",
    ...preview.weaknesses.map((item) => `- ${item}`),
    "",
    "Suggested practice:",
    ...preview.suggestedPractice.map((item) => `- ${item}`),
    preview.teacherRemarks ? "" : "",
    preview.teacherRemarks ? "Teacher remarks:" : "",
    preview.teacherRemarks
  ].filter((line) => line !== undefined).slice(0, 42);

  const content = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    `(${escapePdfText(lines[0] ?? "Learning report")}) Tj`,
    "/F1 10 Tf",
    ...lines.slice(1).flatMap((line) => ["0 -18 Td", `(${escapePdfText(line)}) Tj`]),
    "ET"
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, "utf8");
}
