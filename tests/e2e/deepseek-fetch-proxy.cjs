const mockUrl = process.env.E2E_DEEPSEEK_MOCK_URL;

if (mockUrl) {
  const originalFetch = globalThis.fetch;

  if (typeof originalFetch !== "function") {
    throw new Error("E2E DeepSeek fetch proxy requires global fetch.");
  }

  globalThis.fetch = async function proxiedFetch(input, init) {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    if (url === "https://api.deepseek.com/chat/completions") {
      return originalFetch(mockUrl, init);
    }

    return originalFetch(input, init);
  };
}
