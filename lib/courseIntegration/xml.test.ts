import assert from "node:assert/strict";
import test from "node:test";

import { parseStaticXml } from "./xml";

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
