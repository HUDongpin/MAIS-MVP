# CortexJS Compute Engine attribution

MAIS uses `@cortex-js/compute-engine` version `0.118.1`, pinned exactly in
`package.json` and `package-lock.json`, for server-only exact arithmetic and
MathJSON serialization in `lib/math-kernel/cas/**`.

- Upstream: https://github.com/cortex-js/compute-engine
- Package: https://www.npmjs.com/package/@cortex-js/compute-engine/v/0.118.1
- License: MIT
- Runtime boundary: Next.js server/build only; learner browser chunks are
  checked separately and must not contain this package.

The upstream license text is preserved in [LICENSE](./LICENSE).
