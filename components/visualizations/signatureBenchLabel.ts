import type { SignatureLabId } from "@/data/signatureLabAssignments";
import type { Language } from "@/types";

function humanizeSignatureBenchId(benchId: SignatureLabId): string {
  return benchId
    .replace(/Lab$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

export function signatureBenchLabel(
  benchId: SignatureLabId,
  language: Language,
  ordinal: number
): string {
  switch (language) {
    case "en":
      return humanizeSignatureBenchId(benchId);
    case "zh":
      return `實驗 ${ordinal}`;
    case "zh-Hans":
      return `实验 ${ordinal}`;
    default: {
      const unsupportedLanguage: never = language;
      throw new Error(`Unsupported signature bench label language: ${unsupportedLanguage}`);
    }
  }
}
