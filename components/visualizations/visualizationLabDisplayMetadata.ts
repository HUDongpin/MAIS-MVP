import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import { textForLanguage } from "@/lib/i18n";
import type { Language, LocalizedText } from "@/types";

/**
 * Catalog display metadata is intentionally structural so this consumer stays
 * compatible while the Mainland catalog adds the optional field upstream.
 * Once the field is part of FeaturedLabDefinition, the intersection collapses
 * to the same public shape without a second title registry.
 */
export type VisualizationLabDisplayMetadataSource = Pick<FeaturedLabDefinition, "title"> & {
  displayDisambiguator?: LocalizedText;
};

export type VisualizationLabDisplayCopy = {
  accessibleTitle: string;
  disambiguator: string | null;
  title: string;
};

export function resolveVisualizationLabDisplayCopy(
  lab: VisualizationLabDisplayMetadataSource,
  language: Language
): VisualizationLabDisplayCopy {
  const title = textForLanguage(lab.title, language).trim();
  const localizedDisambiguator = lab.displayDisambiguator
    ? textForLanguage(lab.displayDisambiguator, language).trim()
    : "";
  const disambiguator = localizedDisambiguator || null;

  return {
    accessibleTitle: disambiguator ? `${title} · ${disambiguator}` : title,
    disambiguator,
    title
  };
}
