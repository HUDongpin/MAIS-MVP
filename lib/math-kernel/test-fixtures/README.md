# Edulab one-shot migration oracle

`edulab-cf0bc1d-sympy-1.14.0.golden.json` is a curated, JSON-only record
generated while porting four Edulab Python modules to the MAIS TypeScript
kernel. The source checkout was fixed at
`cf0bc1d68b4ea64307f57d7fac64667e6a3148cc`; the isolated oracle used Python
3.14.6, SymPy 1.14.0, and mpmath 1.3.0.

The fixture deliberately separates:

- `sourceObservedSemantics`: values and behavior actually produced by the
  pinned Python/SymPy source;
- `maisRequiredSemantics`: stricter validation, corrected equations, complete
  range proofs, and browser/server boundaries required by MAIS.

The full temporary oracle contained 25 assertions. Six additional requested
goldens were then evaluated directly with the same pinned modules and
environment before the Python environment was discarded. The hashes recorded
in the fixture are fixed provenance pins for that one-time oracle and its
generator. Those two full temporary artifacts are not committed, so the
repository can pin but cannot independently recompute their hashes. A future
reproducibility slice would need a path-neutral generator plus a normalized,
committed full oracle. Python is not used by the repository test, build,
server, or learner-browser runtime.

This directory is test-only. Production code must never import it.
