import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "./next.config";

test("isolated evidence builds can opt out of the disposable webpack filesystem cache", () => {
  assert.equal(typeof nextConfig.webpack, "function");
  const prior = process.env.MAIS_DISABLE_WEBPACK_CACHE;
  try {
    process.env.MAIS_DISABLE_WEBPACK_CACHE = "1";
    const applyWebpack = nextConfig.webpack!;
    const config = { cache: { type: "filesystem" } } as Parameters<typeof applyWebpack>[0];
    const result = applyWebpack(config, {} as Parameters<typeof applyWebpack>[1]);
    assert.equal(result, config);
    assert.equal(result.cache, false);
  } finally {
    if (prior === undefined) delete process.env.MAIS_DISABLE_WEBPACK_CACHE;
    else process.env.MAIS_DISABLE_WEBPACK_CACHE = prior;
  }
});

test("ordinary builds keep the cache selected by Next", () => {
  assert.equal(typeof nextConfig.webpack, "function");
  const prior = process.env.MAIS_DISABLE_WEBPACK_CACHE;
  try {
    delete process.env.MAIS_DISABLE_WEBPACK_CACHE;
    const cache = { type: "filesystem" as const };
    const applyWebpack = nextConfig.webpack!;
    const config = { cache } as Parameters<typeof applyWebpack>[0];
    const result = applyWebpack(config, {} as Parameters<typeof applyWebpack>[1]);
    assert.equal(result.cache, cache);
  } finally {
    if (prior === undefined) delete process.env.MAIS_DISABLE_WEBPACK_CACHE;
    else process.env.MAIS_DISABLE_WEBPACK_CACHE = prior;
  }
});
