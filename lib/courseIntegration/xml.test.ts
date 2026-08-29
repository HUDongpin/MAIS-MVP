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
