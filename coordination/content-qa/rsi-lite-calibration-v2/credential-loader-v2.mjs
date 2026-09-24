function decodeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_match, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([a-f0-9]+);/gi, (_match, value) => String.fromCodePoint(Number.parseInt(value, 16)));
}

function wordParagraphs(xml) {
  if (typeof xml !== "string" || xml.trim() === "") throw new Error("WordprocessingML input is absent.");
  const paragraphMatches = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
  return paragraphMatches.map((paragraph) => {
    const runs = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    return decodeXml(runs.map((match) => match[1]).join(""));
  });
}

export function extractDeepSeekCredentialFromDocxXml(xml) {
  const paragraphs = wordParagraphs(xml);
  const markerIndexes = paragraphs
    .map((text, index) => (/deep\s*seek/i.test(text) ? index : -1))
    .filter((index) => index >= 0);
  const keys = new Set();
  for (const index of markerIndexes) {
    const nearby = paragraphs.slice(index, index + 5).join("\n");
    for (const match of nearby.matchAll(/sk-[A-Za-z0-9_-]{20,}/g)) keys.add(match[0]);
  }
  if (keys.size !== 1) throw new Error("A unique DeepSeek credential was not found near its provider marker in the approved DOCX.");
  return [...keys][0];
}
