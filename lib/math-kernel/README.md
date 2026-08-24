# @mais/math-kernel

Installable TypeScript mathematics runtime for MAIS. It contains the migrated
EduLab body topology, conic-domain models, solid-geometry kernels, and bounded
analytic-geometry kernels. It does not contain React, Three.js, R3F, DOM code,
the MAIS `MathSceneSpec` adapter, or the old Python HTML generators.

## Runtime boundary

Use fine-grained client-safe imports for browser interaction:

```ts
import { cube } from "@mais/math-kernel/bodies";
import { ellipseNumeric } from "@mais/math-kernel/conics/numeric";
import * as geometryNumeric from "@mais/math-kernel/geometry/numeric";
```

Use the explicit `.server` exports only in a Node or React Server environment:

```ts
import { ellipseExact } from "@mais/math-kernel/conics/exact.server";
import { solveCubeLinePlaneAngle } from "@mais/math-kernel/geometry/solvers.server";
import { rangeOverLineFamily } from "@mais/math-kernel/analytic/analytic-kernel.server";
```

The root export is client-safe and namespace based. It never re-exports a CAS
or `.server` module. Server subpaths have no browser or default export
condition, so browser bundlers must fail closed if they are imported directly.

## Exact inputs and DTOs

Exact APIs accept application-constructed, validated MathJSON. Raw JavaScript
numbers in exact expressions must be safe integers; represent fractions with
explicit MathJSON such as `["Rational", 3, 2]`. Results cross application
boundaries as JSON-safe MAIS DTOs, never as Compute Engine objects.

## Package and release status

`npm pack` creates an installable tarball containing compiled ESM, CommonJS,
declarations, source maps, legal notices, and a SHA-256 runtime file manifest at
`dist/RUNTIME_INTEGRITY.json`. A local tarball proves package installability; it
does not prove that the `@mais` scope is registered, that the package was
published to a registry, or that the MAIS application was deployed.

## Provenance

This package contains modified TypeScript rewrites derived from
[wy51ai/edulab](https://github.com/wy51ai/edulab) at commit
`cf0bc1d68b4ea64307f57d7fac64667e6a3148cc`. See `LICENSE`, `NOTICE`, and
`THIRD_PARTY_NOTICES.md`.
