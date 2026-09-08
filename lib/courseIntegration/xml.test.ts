import assert from "node:assert/strict";
import test from "node:test";

import { parseStaticXml } from "./xml";

function assertManifestXmlInvalid(xml: string) {
  assert.throws(
    () => parseStaticXml(xml),
    (error: unknown) => {
      assert.deepEqual(
        error && typeof error === "object"
          ? {
              code: Reflect.get(error, "code"),
              status: Reflect.get(error, "status"),
              message: Reflect.get(error, "message")
            }
          : null,
        {
          code: "MANIFEST_XML_INVALID",
          status: 422,
          message: "The SCORM manifest is not valid safe XML."
        }
      );
      return true;
    }
  );
}

test("accepts one exact XML declaration and legal non-reserved processing instructions", () => {
  const root = parseStaticXml(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    "<?audit pre-root?>" +
    "<root><?inside?></root>"
  );

  assert.equal(root.name, "root");
});

test("accepts ordinary XML-S-separated attributes and valid self-closing tags", () => {
  const root = parseStaticXml(
    '<manifest identifier="course" version="1.0"><resource href="lesson.html" /></manifest>'
  );

  assert.deepEqual(root.attributes, { identifier: "course", version: "1.0" });
  assert.deepEqual(root.children[0]?.attributes, { href: "lesson.html" });
});

test("accepts empty-element tags with XML S before the slash or no separator", () => {
  assert.equal(parseStaticXml("<root/>").name, "root");
  assert.equal(parseStaticXml("<root />").name, "root");
});

test("accepts literal XML S, comments, and processing instructions around the root", () => {
  const root = parseStaticXml(
    " \t\r\n<!--before--><?audit before?><root/><?audit after?><!--after-->\n\r\t "
  );

  assert.equal(root.name, "root");
});

test("accepts lowercase hexadecimal references and inert ENTITY text in comments and CDATA", () => {
  const root = parseStaticXml(
    "<root><!-- inert <!ENTITY comment text -->&#x41;<![CDATA[<!ENTITY cdata text]]></root>"
  );

  assert.equal(root.text, "A<!ENTITY cdata text");
});

test("preserves raw QNames and exposes deeply frozen namespace metadata", () => {
  const root = parseStaticXml(
    '<cp:root xmlns:cp="http://www.imsproject.org/xsd/imscp_rootv1p1p2" ' +
    'xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" plain="value" ' +
    'adlcp:scormtype="asset"><cp:child/></cp:root>'
  );

  assert.deepEqual(
    { name: root.name, prefix: root.prefix, local: root.local, uri: root.uri },
    {
      name: "cp:root",
      prefix: "cp",
      local: "root",
      uri: "http://www.imsproject.org/xsd/imscp_rootv1p1p2"
    }
  );
  assert.equal(root.attributes["adlcp:scormtype"], "asset");
  assert.deepEqual(root.attributeMetadata["adlcp:scormtype"], {
    name: "adlcp:scormtype",
    prefix: "adlcp",
    local: "scormtype",
    uri: "http://www.adlnet.org/xsd/adlcp_rootv1p2",
    value: "asset"
  });
  assert.deepEqual(
    {
      name: root.children[0]?.name,
      prefix: root.children[0]?.prefix,
      local: root.children[0]?.local,
      uri: root.children[0]?.uri
    },
    {
      name: "cp:child",
      prefix: "cp",
      local: "child",
      uri: "http://www.imsproject.org/xsd/imscp_rootv1p1p2"
    }
  );
  assert.equal(Object.isFrozen(root), true);
  assert.equal(Object.isFrozen(root.attributes), true);
  assert.equal(Object.isFrozen(root.attributeMetadata), true);
  assert.equal(Object.isFrozen(root.attributeMetadata["adlcp:scormtype"]), true);
  assert.equal(Object.isFrozen(root.children), true);
  assert.equal(Object.isFrozen(root.children[0]), true);
});

for (const [name, xml] of [
  ["a leading non-breaking space outside the root", "\u00a0<root/>"],
  ["a trailing non-breaking space outside the root", "<root/>\u00a0"],
  ["an encoded space outside the root", "&#32;<root/>"]
] as const) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => parseStaticXml(xml),
      (error: unknown) => Reflect.get(Object(error), "code") === "MANIFEST_XML_INVALID" &&
        Reflect.get(Object(error), "status") === 422
    );
  });
}

for (const [name, xml] of [
  ["an uppercase hexadecimal character reference", "<root>&#X41;</root>"],
  ["a comment body ending in a hyphen", "<root><!--ends-with-hyphen---></root>"],
  ["an undeclared element prefix", "<unbound:root/>"],
  ["an undeclared attribute prefix", '<root unbound:attribute="value"/>'],
  ["a leading-colon element QName", "<:root/>"],
  ["a multiple-colon element QName", "<bound::root xmlns:bound=\"urn:test\"/>"],
  ["a trailing-colon element QName", "<bound: xmlns:bound=\"urn:test\"/>"],
  ["a leading-colon attribute QName", '<root :attribute="value"/>'],
  [
    "a multiple-colon attribute QName",
    '<root xmlns:bound="urn:test" bound::attribute="value"/>'
  ],
  [
    "a trailing-colon attribute QName",
    '<root xmlns:bound="urn:test" bound:="value"/>'
  ],
  [
    "duplicate attributes with the same expanded name",
    '<root xmlns:a="urn:duplicate" xmlns:b="urn:duplicate" a:id="one" b:id="two"/>'
  ],
  ["an XML 1.1 declaration", '<?xml version="1.1"?><root/>'],
  [
    "a non-UTF-8 XML declaration encoding",
    '<?xml version="1.0" encoding="ISO-8859-1"?><root/>'
  ]
] as const) {
  test(`rejects ${name} with the stable redacted parser error`, () => {
    assertManifestXmlInvalid(xml);
  });
}

for (const [name, xml] of [
  ["a space after an empty-element slash", "<root/ >"],
  ["a tab after an empty-element slash", "<root/\t>"],
  ["a newline after an empty-element slash", "<root/\n>"]
] as const) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => parseStaticXml(xml),
      (error: unknown) => Reflect.get(Object(error), "code") === "MANIFEST_XML_INVALID" &&
        Reflect.get(Object(error), "status") === 422
    );
  });
}

for (const [name, xml] of [
  ["adjacent attributes without XML S", '<manifest a="1"b="2"></manifest>'],
  ["attributes separated by a non-breaking space", '<manifest a="1"\u00a0b="2"></manifest>']
] as const) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => parseStaticXml(xml),
      (error: unknown) => Reflect.get(Object(error), "code") === "MANIFEST_XML_INVALID" &&
        Reflect.get(Object(error), "status") === 422
    );
  });
}

for (const [name, xml] of [
  ["a processing instruction without a legal target", "<? target data?><root/>"],
  ["a processing instruction target beginning with a digit", "<?1target data?><root/>"],
  ["a reserved case-variant XML processing instruction target", "<?XML data?><root/>"],
  [
    "an XML declaration with an unsupported attribute",
    '<?xml version="1.0" unsupported="value"?><root/>'
  ],
  [
    "an XML declaration after another prolog processing instruction",
    '<?audit pre-root?><?xml version="1.0"?><root/>'
  ]
] as const) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => parseStaticXml(xml),
      (error: unknown) => Reflect.get(Object(error), "code") === "MANIFEST_XML_INVALID" &&
        Reflect.get(Object(error), "status") === 422
    );
  });
}
