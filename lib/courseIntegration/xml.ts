import { SaxesParser, type SaxesAttributeNS } from "saxes";

import { CourseImportError, isCourseImportError } from "./errors";

export interface StaticXmlAttribute {
  readonly name: string;
  readonly prefix: string;
  readonly local: string;
  readonly uri: string;
  readonly value: string;
}

export interface StaticXmlElement {
  readonly name: string;
  readonly prefix: string;
  readonly local: string;
  readonly uri: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly attributeMetadata: Readonly<Record<string, StaticXmlAttribute>>;
  readonly children: readonly StaticXmlElement[];
  readonly text: string;
}

interface MutableXmlElement {
  readonly name: string;
  readonly prefix: string;
  readonly local: string;
  readonly uri: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly attributeMetadata: Readonly<Record<string, StaticXmlAttribute>>;
  readonly children: MutableXmlElement[];
  readonly textParts: string[];
}

export const SCORM_CONTENT_PACKAGE_NAMESPACES = Object.freeze([
  "http://www.imsproject.org/xsd/imscp_rootv1p1p2",
  "http://www.imsglobal.org/xsd/imscp_v1p1"
] as const);

export const SCORM_ADLCP_NAMESPACES = Object.freeze({
  "http://www.adlnet.org/xsd/adlcp_rootv1p2": "1.2",
  "http://www.adlnet.org/xsd/adlcp_v1p3": "2004"
} as const);

export const XML_NAMESPACE_DECLARATION_URI = "http://www.w3.org/2000/xmlns/";
export const XML_NAMESPACE_URI = "http://www.w3.org/XML/1998/namespace";
const XML_ENTITY_DECLARATION = /<!\s*ENTITY\b/iu;
const MAX_XML_INPUT_LENGTH = 1024 * 1024;
const MAX_XML_DEPTH = 128;
const MAX_XML_ELEMENTS = 20_000;
const MAX_ATTRIBUTES_PER_ELEMENT = 100;
const MAX_CUMULATIVE_TEXT_LENGTH = 1024 * 1024;
const MAX_XML_WORK_UNITS = 4 * 1024 * 1024;

function invalidXml(): never {
  throw new CourseImportError(
    "MANIFEST_XML_INVALID",
    "The SCORM manifest is not valid safe XML.",
    422
  );
}

function dtdForbidden(): never {
  throw new CourseImportError(
    "MANIFEST_XML_DTD_FORBIDDEN",
    "DOCTYPE and ENTITY declarations are forbidden in SCORM manifests.",
    422
  );
}

function freezeAttribute(attribute: SaxesAttributeNS): StaticXmlAttribute {
  return Object.freeze({
    name: attribute.name,
    prefix: attribute.prefix,
    local: attribute.local,
    uri: attribute.uri,
    value: attribute.value
  });
}

function freezeElement(element: MutableXmlElement): StaticXmlElement {
  return Object.freeze({
    name: element.name,
    prefix: element.prefix,
    local: element.local,
    uri: element.uri,
    attributes: element.attributes,
    attributeMetadata: element.attributeMetadata,
    children: Object.freeze(element.children.map(freezeElement)),
    text: element.textParts.join("")
  });
}

export function parseStaticXml(xml: string): StaticXmlElement {
  if (xml.length > MAX_XML_INPUT_LENGTH) invalidXml();

  const roots: MutableXmlElement[] = [];
  const stack: MutableXmlElement[] = [];
  let elementCount = 0;
  let cumulativeTextLength = 0;
  let workUnits = xml.length;

  const addWork = (amount: number) => {
    workUnits += amount;
    if (!Number.isSafeInteger(workUnits) || workUnits > MAX_XML_WORK_UNITS) invalidXml();
  };
  const appendText = (text: string) => {
    cumulativeTextLength += text.length;
    if (
      !Number.isSafeInteger(cumulativeTextLength) ||
      cumulativeTextLength > MAX_CUMULATIVE_TEXT_LENGTH
    ) invalidXml();
    addWork(text.length);
    if (stack.length > 0) stack.at(-1)!.textParts.push(text);
  };

  try {
    const parser = new SaxesParser({ xmlns: true, fragment: false });
    parser.on("xmldecl", (declaration) => {
      if (
        declaration.version !== "1.0" ||
        (declaration.encoding !== undefined && declaration.encoding.toLowerCase() !== "utf-8")
      ) invalidXml();
    });
    parser.on("doctype", () => dtdForbidden());
    parser.on("opentag", (tag) => {
      elementCount += 1;
      if (elementCount > MAX_XML_ELEMENTS) invalidXml();
      if (stack.length + 1 > MAX_XML_DEPTH) invalidXml();

      const sourceAttributes = Object.values(tag.attributes);
      if (sourceAttributes.length > MAX_ATTRIBUTES_PER_ELEMENT) invalidXml();
      const frozenAttributes = sourceAttributes.map(freezeAttribute);
      const attributes = Object.freeze(Object.fromEntries(
        frozenAttributes.map((attribute) => [attribute.name, attribute.value])
      ));
      const attributeMetadata = Object.freeze(Object.fromEntries(
        frozenAttributes.map((attribute) => [attribute.name, attribute])
      ));
      addWork(tag.name.length + sourceAttributes.reduce(
        (sum, attribute) => sum + attribute.name.length + attribute.value.length,
        0
      ));

      const element: MutableXmlElement = {
        name: tag.name,
        prefix: tag.prefix,
        local: tag.local,
        uri: tag.uri,
        attributes,
        attributeMetadata,
        children: [],
        textParts: []
      };
      if (stack.length > 0) stack.at(-1)!.children.push(element);
      else roots.push(element);
      stack.push(element);
    });
    parser.on("text", appendText);
    parser.on("cdata", appendText);
    parser.on("closetag", (tag) => {
      addWork(tag.name.length);
      const open = stack.pop();
      if (!open || open.name !== tag.name) invalidXml();
    });
    parser.write(xml).close();
  } catch (error) {
    roots.length = 0;
    stack.length = 0;
    if (isCourseImportError(error)) throw error;
    if (XML_ENTITY_DECLARATION.test(xml)) dtdForbidden();
    invalidXml();
  }

  if (stack.length !== 0 || roots.length !== 1) invalidXml();
  return freezeElement(roots[0]!);
}

export function xmlLocalName(name: string) {
  return name.includes(":") ? name.slice(name.lastIndexOf(":") + 1) : name;
}

export function isSupportedScormStructuralElement(
  element: StaticXmlElement,
  localName: string
) {
  return element.local === localName && (
    element.uri === "" ||
    SCORM_CONTENT_PACKAGE_NAMESPACES.includes(
      element.uri as (typeof SCORM_CONTENT_PACKAGE_NAMESPACES)[number]
    )
  );
}

export function xmlChildren(element: StaticXmlElement, localName: string) {
  return element.children.filter((child) => isSupportedScormStructuralElement(child, localName));
}

export function xmlFirstChild(element: StaticXmlElement, localName: string) {
  return xmlChildren(element, localName)[0] ?? null;
}

export function xmlAttribute(element: StaticXmlElement, localName: string) {
  const attribute = element.attributeMetadata[localName];
  return attribute?.prefix === "" && attribute.local === localName && attribute.uri === ""
    ? attribute.value
    : null;
}

export function xmlScormTypeAttribute(element: StaticXmlElement) {
  for (const attribute of Object.values(element.attributeMetadata)) {
    if (attribute.local !== "scormType" && attribute.local !== "scormtype") continue;
    if (attribute.uri === "" && attribute.prefix === "") return attribute.value;
    if (Object.prototype.hasOwnProperty.call(SCORM_ADLCP_NAMESPACES, attribute.uri)) {
      return attribute.value;
    }
  }
  return null;
}

export function xmlBaseAttribute(element: StaticXmlElement) {
  return Object.values(element.attributeMetadata).find(
    (attribute) => attribute.local === "base" && attribute.uri === XML_NAMESPACE_URI
  )?.value ?? null;
}

export function xmlNamespaceVersions(element: StaticXmlElement) {
  const versions = new Set<"1.2" | "2004">();
  for (const attribute of Object.values(element.attributeMetadata)) {
    if (attribute.uri !== XML_NAMESPACE_DECLARATION_URI) continue;
    const version = SCORM_ADLCP_NAMESPACES[
      attribute.value as keyof typeof SCORM_ADLCP_NAMESPACES
    ];
    if (version) versions.add(version);
  }
  return versions;
}

export function xmlText(element: StaticXmlElement | null) {
  return element?.text.trim() || null;
}
