import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./credential-loader-v2.mjs");
}

test("extracts one DeepSeek key from split WordprocessingML text without exposing other provider keys", async () => {
  const { extractDeepSeekCredentialFromDocxXml } = await subject();
  const xml = `<?xml version="1.0"?><w:document xmlns:w="urn:test"><w:body>
    <w:p><w:r><w:t>OpenAI</w:t></w:r></w:p><w:p><w:r><w:t>sk-openai-not-the-target-1234567890</w:t></w:r></w:p>
    <w:p><w:r><w:t>Deep</w:t></w:r><w:r><w:t>Seek API Key</w:t></w:r></w:p>
    <w:p><w:r><w:t>sk-deepseek-</w:t></w:r><w:r><w:t>target-1234567890abcdef</w:t></w:r></w:p>
    <w:p><w:r><w:t>Another Provider</w:t></w:r></w:p>
  </w:body></w:document>`;
  assert.equal(extractDeepSeekCredentialFromDocxXml(xml), "sk-deepseek-target-1234567890abcdef");
});

test("fails closed when the DeepSeek marker or a unique nearby key is absent", async () => {
  const { extractDeepSeekCredentialFromDocxXml } = await subject();
  assert.throws(() => extractDeepSeekCredentialFromDocxXml("<w:document><w:p><w:t>sk-x-12345678901234567890</w:t></w:p></w:document>"), /DeepSeek credential/);
  assert.throws(() => extractDeepSeekCredentialFromDocxXml("<w:document><w:p><w:t>DeepSeek API Key</w:t></w:p><w:p><w:t>missing</w:t></w:p></w:document>"), /DeepSeek credential/);
});
