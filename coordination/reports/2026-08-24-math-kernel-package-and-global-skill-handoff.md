# 2026-08-24 math-kernel package and global skill handoff — LOCAL_READY

## 1. Outcome and evidence boundary

The renderer-neutral MAIS runtime is now an installable TypeScript package:

```text
@mais/math-kernel@0.1.0
```

The global Codex skill is installed at:

```text
/Users/dongpinhu/.codex/skills/edulab-for-mais
```

The skill's canonical machine name is `edulab-for-mais`. Its user-facing
display name and document title are exactly `EduLab-for-MAIS.md`. The skill
system entry file remains `SKILL.md`, as required by the global skill protocol.

This handoff proves a local installable tarball, local package consumers, and a
working global skill on this machine. It does not claim npm registry publication,
GitHub push, PR or remote CI, merge, deployment, or same-SHA production behavior.

## 2. Package boundary

The package source is `lib/math-kernel`. The existing mathematics implementation
remains renderer-neutral and is compiled into:

```text
dist/esm/**       ESM runtime
dist/cjs/**       CommonJS runtime
dist/types/**     TypeScript declarations
```

The manifest exposes 26 explicit subpaths with no wildcard. Twenty-five are
runtime entry points; `./package.json` is the remaining metadata export.

Client entry points contain only bodies, conic models/numeric operations,
geometry core/numeric/coordinates/solids, analytic types/numeric/expressions,
and shared DTO/error utilities. Exact and CAS entry points are exported only
under Node and React Server conditions. The following all fail closed in a
browser bundle:

```text
@mais/math-kernel/geometry/exact.server
@mais/math-kernel/server
@mais/math-kernel/server/cas
```

The package declares the exact runtime dependency
`@cortex-js/compute-engine@0.118.1`. It does not ship Python, SymPy, old HTML
generators, tests, fixtures, demos, React, Three.js, R3F, or a MAIS checkout.

## 3. TypeScript consumer and portability corrections

Independent review found and closed three package defects before this handoff:

- Emitted ESM declarations originally retained extensionless relative imports.
  The build now emits NodeNext-compatible `.js` specifiers, strips the source-only
  `server-only` marker from declarations, disables stale declaration maps, and
  tests a strict NodeNext consumer without `skipLibCheck`.
- The transitive client dependency test now explicitly rejects the bare
  `@mais/math-kernel/server` namespace in addition to `.server` files and CAS
  packages.
- Build root detection now uses cross-platform `path.basename()`, and package
  smoke consumes `npm pack --json` rather than an external `tar` executable.

## 4. Immutable package artifact

The package artifact bundled with the skill is:

```text
filename: mais-math-kernel-0.1.0.tgz
packed files: 131
packed size: 978,063 bytes
unpacked size: 5,304,275 bytes
SHA-256: 15d34839ab7d341313574f64756b33611b752a5781f48df4fa5947e4e913d3ff
npm integrity: sha512-rM5f3IEzuEOBD3LA9D86AI7pYlJPvj3FDrrgmBUBXXj4BIDJkEf6aF1+RoQQvfw2DCL5JqZ/zmo8EGMbd8Q7Rg==
```

The build also generates `dist/RUNTIME_INTEGRITY.json`. Its SHA-256 is:

```text
66b45b29ee7e95d1849d041cd2ea61aaf1d53f6a3704f9ccee1747d978a85925
```

The manifest hashes 130 installed files: package metadata, legal and provenance
files, both runtime formats, declarations, and source maps. Distribution
verification rejects a missing, added, or digest-mismatched runtime file.

The tarball contains Apache-2.0 `LICENSE` and `NOTICE`, the fixed EduLab source
revision, and MIT notices for Compute Engine and its relevant transitive
dependency. It contains no active worktree path.

## 5. Global skill execution contract

The skill contains the immutable tarball, relative `file:` dependency, npm
lockfile, operation documentation, DTO/client-server guidance, three curriculum
adapter notes, provenance, and executable tests. Its installed `node_modules`
is a real directory inside the skill root, not a symlink to `/Volumes/Starship`
or to an active MAIS worktree.

Before listing or executing an operation, the runner now verifies:

1. Node.js is at least 22.3.0.
2. `node_modules` is a real skill-local directory.
3. the installed package is exactly `@mais/math-kernel@0.1.0`;
4. the bundled tarball matches both SHA-256 and npm SHA-512 integrity;
5. the installed runtime manifest matches its pinned SHA-256;
6. all 130 package files match the manifest, with no additional package file,
   nested dependency, or package-directory symlink;
7. all 422 files across Compute Engine, `complex-esm`, and `@arnog/colors`
   match a separately pinned dependency manifest and the npm lockfile.

Only after those checks does the runner return `runtime.verified: true` and
artifact provenance. A tampered tarball or installed runtime file fails with
`RUNTIME_UNAVAILABLE` before mathematical execution.

The runner exposes 49 fixed operations across bodies, numeric/exact conics,
numeric/exact geometry, coordinate/solid builders, teaching solvers, and
numeric/exact analytic geometry. Requests can choose only an own property of
that fixed table. Prototype names such as `toString`, `constructor`, and
`__proto__` are rejected. Callers cannot supply a module path or export name.

The runner enforces a 128 KiB request cap, exact argument arity, fixed request
fields, JSON-safe finite output, and the package's MathJSON/operator/resource
limits. A package-level `KernelResult.ok: false` remains distinct from a runner
or runtime failure. The skill never falls back to Python, SymPy, `eval()`,
`new Function()`, or a nearby source checkout.

## 6. Verification ledger

Repository gates on the package candidate:

| Gate | Result |
|---|---|
| `npm run test:math-kernel-package` | PASS: build, dist verification, isolated pack/install, strict NodeNext types, ESM, CJS, browser numeric bundle, three server-import rejections |
| Package exports | 26 explicit exports; all 25 runtime subpaths loaded in ESM and CJS during independent review |
| Runtime integrity | 130/130 package files plus the manifest itself and 422/422 exact dependency files verified |
| `npm run test:math-kernel` | 217/217 passed |
| `npm run type-check` | exit 0 |
| Independent package review | APPROVED; P0/P1/P2 = 0 |

Global skill gates:

| Gate | Result |
|---|---|
| `node scripts/check-runtime.mjs` | PASS; local installed package and all integrity layers verified |
| `node scripts/run-kernel.mjs --list` | PASS; 49 fixed operations |
| `npm run validate` | 15/15 passed, including conic/numeric/exact paths, inherited operation rejection, request limits, package error semantics and tamper detection |
| `skill-creator` validator | PASS (`Skill is valid!`) before final source-revision recording; rerun is required after that metadata update |

The already-completed application build, visualization suite, learner bundle
CAS scan, and browser matrix belong to the underlying math-kernel candidate and
are recorded in `2026-08-24-math-kernel-local-candidate-review.md`. Package and
skill work did not rewrite the renderer or visualization behavior.

## 7. Source and release state

The package source is committed locally as part of the containing Git commit.
After that commit is created, the global skill's `runtime-lock.json` must record
the exact local MAIS package source SHA and its validation suite must be rerun.
The global skill lives outside the Git worktree and is therefore not part of
the repository commit.

No package was published. `publishConfig.access` is `restricted`, but npm scope
ownership, authentication, registry contents, remote integrity and a release
tag remain unproved and unauthorised. No branch push, PR creation, merge or
deployment is included in this handoff.
