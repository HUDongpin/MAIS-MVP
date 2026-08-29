import { CourseImportError } from "./errors";

export interface StaticXmlElement {
  readonly name: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly children: readonly StaticXmlElement[];
  readonly text: string;
}

interface MutableXmlElement {
  name: string;
  attributes: Record<string, string>;
  children: MutableXmlElement[];
  textParts: string[];
}

const XML_NAME = /^[A-Za-z_][A-Za-z0-9_.:-]*/;
const XML_S = /[ \t\r\n]/;
const XML_DECLARATION_SURFACE = /<!\s*(?:DOCTYPE|ENTITY)\b/i;
const XML_DECLARATION = /^xml[\t\n\r ]+version[\t\n\r ]*=[\t\n\r ]*(?:"1\.0"|'1\.0')(?:[\t\n\r ]+encoding[\t\n\r ]*=[\t\n\r ]*(?:"[Uu][Tt][Ff]-8"|'[Uu][Tt][Ff]-8'))?(?:[\t\n\r ]+standalone[\t\n\r ]*=[\t\n\r ]*(?:"(?:yes|no)"|'(?:yes|no)'))?[\t\n\r ]*$/;
const MAX_XML_DEPTH = 128;
const MAX_XML_ELEMENTS = 20_000;
const MAX_ATTRIBUTES_PER_ELEMENT = 100;

function invalidXml(): never {
  throw new CourseImportError(
    "MANIFEST_XML_INVALID",
    "The SCORM manifest is not valid safe XML.",
    422
  );
}

function isValidXmlCodePoint(codePoint: number) {
  return codePoint === 0x9 || codePoint === 0xa || codePoint === 0xd ||
    (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
    (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
    (codePoint >= 0x10000 && codePoint <= 0x10ffff);
}

function assertValidXmlCodePoints(xml: string) {
  for (let index = 0; index < xml.length;) {
    const codePoint = xml.codePointAt(index);
    if (codePoint === undefined || !isValidXmlCodePoint(codePoint)) invalidXml();
    index += codePoint > 0xffff ? 2 : 1;
  }
}

function decodeXmlEntities(value: string) {
  let decoded = "";
  let cursor = 0;
  while (cursor < value.length) {
    const entityStart = value.indexOf("&", cursor);
    if (entityStart < 0) {
      decoded += value.slice(cursor);
      break;
    }
    decoded += value.slice(cursor, entityStart);
    const entityEnd = value.indexOf(";", entityStart + 1);
    if (entityEnd < 0) invalidXml();
    const entity = value.slice(entityStart + 1, entityEnd);
    let replacement: string;
    switch (entity) {
      case "amp": replacement = "&"; break;
      case "lt": replacement = "<"; break;
      case "gt": replacement = ">"; break;
      case "quot": replacement = "\""; break;
      case "apos": replacement = "'"; break;
      default: {
        const decimal = /^#([0-9]+)$/.exec(entity);
        const hexadecimal = /^#x([0-9a-f]+)$/i.exec(entity);
        const codePoint = decimal
          ? Number.parseInt(decimal[1]!, 10)
          : hexadecimal
            ? Number.parseInt(hexadecimal[1]!, 16)
            : Number.NaN;
        if (!Number.isSafeInteger(codePoint) || !isValidXmlCodePoint(codePoint)) invalidXml();
        replacement = String.fromCodePoint(codePoint);
      }
    }
    decoded += replacement;
    cursor = entityEnd + 1;
  }
  return decoded;
}

function findTagEnd(xml: string, start: number) {
  let quote: "\"" | "'" | null = null;
  for (let index = start; index < xml.length; index += 1) {
    const character = xml[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  invalidXml();
}

function parseStartTag(content: string) {
  let cursor = 0;
  const skipXmlS = () => {
    const start = cursor;
    while (XML_S.test(content[cursor] ?? "")) cursor += 1;
    return cursor > start;
  };
  const nameMatch = XML_NAME.exec(content.slice(cursor));
  if (!nameMatch) invalidXml();
  const name = nameMatch[0];
  cursor += name.length;
  const attributes: Record<string, string> = {};

  while (cursor < content.length) {
    const hasAttributeSeparator = skipXmlS();
    if (cursor >= content.length) break;
    if (!hasAttributeSeparator) invalidXml();
    const attributeMatch = XML_NAME.exec(content.slice(cursor));
    if (!attributeMatch) invalidXml();
    const attributeName = attributeMatch[0];
    cursor += attributeName.length;
    skipXmlS();
    if (content[cursor] !== "=") invalidXml();
    cursor += 1;
    skipXmlS();
    const quote = content[cursor];
    if (quote !== "\"" && quote !== "'") invalidXml();
    cursor += 1;
    const valueEnd = content.indexOf(quote, cursor);
    if (valueEnd < 0) invalidXml();
    if (Object.prototype.hasOwnProperty.call(attributes, attributeName)) invalidXml();
    const rawAttributeValue = content.slice(cursor, valueEnd);
    if (rawAttributeValue.includes("<")) invalidXml();
    attributes[attributeName] = decodeXmlEntities(rawAttributeValue);
    if (Object.keys(attributes).length > MAX_ATTRIBUTES_PER_ELEMENT) invalidXml();
    cursor = valueEnd + 1;
    if (cursor < content.length && !XML_S.test(content[cursor] ?? "")) invalidXml();
  }
  return { name, attributes };
}

function assertProcessingInstruction(content: string, offset: number) {
  const targetMatch = XML_NAME.exec(content);
  if (!targetMatch) invalidXml();
  const target = targetMatch[0];
  const remainder = content.slice(target.length);

  if (target === "xml") {
    if (offset !== 0 || !XML_DECLARATION.test(content)) invalidXml();
    return;
  }
  if (target.toLowerCase() === "xml") invalidXml();
  if (remainder.length > 0 && !/^[\t\n\r ]/.test(remainder)) invalidXml();
}

function freezeElement(element: MutableXmlElement): StaticXmlElement {
  return Object.freeze({
    name: element.name,
    attributes: Object.freeze({ ...element.attributes }),
    children: Object.freeze(element.children.map(freezeElement)),
    text: element.textParts.join("")
  });
}

export function parseStaticXml(xml: string): StaticXmlElement {
  assertValidXmlCodePoints(xml);
  if (XML_DECLARATION_SURFACE.test(xml)) {
    throw new CourseImportError(
      "MANIFEST_XML_DTD_FORBIDDEN",
      "DOCTYPE and ENTITY declarations are forbidden in SCORM manifests.",
      422
    );
  }

  const roots: MutableXmlElement[] = [];
  const stack: MutableXmlElement[] = [];
  let elementCount = 0;
  let cursor = 0;

  while (cursor < xml.length) {
    if (xml[cursor] !== "<") {
      const nextTag = xml.indexOf("<", cursor);
      const end = nextTag < 0 ? xml.length : nextTag;
      const rawText = xml.slice(cursor, end);
      if (rawText.includes("]]>")) invalidXml();
      if (stack.length > 0) {
        stack.at(-1)!.textParts.push(decodeXmlEntities(rawText));
      } else {
        for (const character of rawText) {
          if (!XML_S.test(character)) invalidXml();
        }
      }
      cursor = end;
      continue;
    }
    if (xml.startsWith("<!--", cursor)) {
      const end = xml.indexOf("-->", cursor + 4);
      if (end < 0) invalidXml();
      if (xml.slice(cursor + 4, end).includes("--")) invalidXml();
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith("<?", cursor)) {
      const end = xml.indexOf("?>", cursor + 2);
      if (end < 0) invalidXml();
      assertProcessingInstruction(xml.slice(cursor + 2, end), cursor);
      cursor = end + 2;
      continue;
    }
    if (xml.startsWith("<![CDATA[", cursor)) {
      const end = xml.indexOf("]]>", cursor + 9);
      if (end < 0 || stack.length === 0) invalidXml();
      stack.at(-1)!.textParts.push(xml.slice(cursor + 9, end));
      cursor = end + 3;
      continue;
    }
    if (xml.startsWith("<!", cursor)) invalidXml();

    const tagEnd = findTagEnd(xml, cursor + 1);
    let content = xml.slice(cursor + 1, tagEnd);
    if (content.startsWith("/")) {
      const rawClosingName = content.slice(1);
      if (XML_S.test(rawClosingName[0] ?? "")) invalidXml();
      const closingName = rawClosingName.replace(/[ \t\r\n]+$/, "");
      if (!XML_NAME.test(closingName) || XML_NAME.exec(closingName)?.[0] !== closingName) invalidXml();
      const open = stack.pop();
      if (!open || open.name !== closingName) invalidXml();
      cursor = tagEnd + 1;
      continue;
    }

    const selfClosing = content.endsWith("/");
    if (selfClosing) content = content.slice(0, -1);
    const parsed = parseStartTag(content);
    const element: MutableXmlElement = {
      name: parsed.name,
      attributes: parsed.attributes,
      children: [],
      textParts: []
    };
    elementCount += 1;
    if (elementCount > MAX_XML_ELEMENTS) invalidXml();
    if (stack.length > 0) stack.at(-1)!.children.push(element);
    else roots.push(element);
    if (!selfClosing) {
      stack.push(element);
      if (stack.length > MAX_XML_DEPTH) invalidXml();
    }
    cursor = tagEnd + 1;
  }

  if (stack.length !== 0 || roots.length !== 1) invalidXml();
  return freezeElement(roots[0]!);
}

export function xmlLocalName(name: string) {
  return (name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name).toLowerCase();
}

export function xmlChildren(element: StaticXmlElement, localName: string) {
  const expected = localName.toLowerCase();
  return element.children.filter((child) => xmlLocalName(child.name) === expected);
}

export function xmlFirstChild(element: StaticXmlElement, localName: string) {
  return xmlChildren(element, localName)[0] ?? null;
}

export function xmlAttribute(element: StaticXmlElement, localName: string) {
  const expected = localName.toLowerCase();
  let matched: string | null = null;
  for (const [name, value] of Object.entries(element.attributes)) {
    if (xmlLocalName(name) !== expected) continue;
    if (matched !== null) return null;
    matched = value;
  }
  return matched;
}

export function xmlText(element: StaticXmlElement | null) {
  return element?.text.trim() || null;
}
