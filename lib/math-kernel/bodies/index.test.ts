import assert from "node:assert/strict";
import { test } from "node:test";

import { KERNEL_ERROR_CODES } from "../shared/errors";
import {
  cuboid,
  cube,
  prism,
  quadPyramid,
  triPyramid,
  validateBodyTopology,
} from "./index";

function unwrap<T>(result: { ok: true; value: T } | { ok: false }): T {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected a successful kernel result.");
  return result.value;
}

function expectError(
  result: { ok: true } | { ok: false; error: { code: string } },
  code: string,
): void {
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, code);
}

test("quadPyramid preserves the Edulab vertex and edge order", () => {
  const topology = unwrap(quadPyramid());

  assert.deepEqual(topology.vertices, ["P", "A", "B", "C", "D"]);
  assert.deepEqual(topology.edges, [
    { a: "A", b: "B" },
    { a: "B", b: "C" },
    { a: "C", b: "D" },
    { a: "D", b: "A" },
    { a: "P", b: "A" },
    { a: "P", b: "B" },
    { a: "P", b: "C" },
    { a: "P", b: "D" },
  ]);
});

test("triPyramid preserves the Edulab vertex and edge order", () => {
  const topology = unwrap(triPyramid());

  assert.deepEqual(topology.vertices, ["P", "A", "B", "C"]);
  assert.deepEqual(topology.edges, [
    { a: "A", b: "B" },
    { a: "B", b: "C" },
    { a: "C", b: "A" },
    { a: "P", b: "A" },
    { a: "P", b: "B" },
    { a: "P", b: "C" },
  ]);
});

test("cuboid and cube have stable 8-vertex, 12-edge topology", () => {
  const expectedEdges = [
    { a: "A", b: "B" },
    { a: "B", b: "C" },
    { a: "C", b: "D" },
    { a: "D", b: "A" },
    { a: "A1", b: "B1" },
    { a: "B1", b: "C1" },
    { a: "C1", b: "D1" },
    { a: "D1", b: "A1" },
    { a: "A", b: "A1" },
    { a: "B", b: "B1" },
    { a: "C", b: "C1" },
    { a: "D", b: "D1" },
  ];
  const box = unwrap(cuboid());
  const equalBox = unwrap(cube());

  assert.deepEqual(box.vertices, [
    "A",
    "B",
    "C",
    "D",
    "A1",
    "B1",
    "C1",
    "D1",
  ]);
  assert.deepEqual(box.edges, expectedEdges);
  assert.deepEqual(equalBox, box);
  assert.notEqual(equalBox, box);
  assert.notEqual(equalBox.vertices, box.vertices);
  assert.notEqual(equalBox.edges, box.edges);
});

test("an n-prism has 2n vertices and 3n edges in Edulab loop order", () => {
  const result = unwrap(
    prism({
      bottom: ["A", "B", "C", "D", "E"],
      top: ["A1", "B1", "C1", "D1", "E1"],
    }),
  );

  assert.equal(result.vertices.length, 10);
  assert.equal(result.edges.length, 15);
  assert.deepEqual(result.edges.slice(0, 6), [
    { a: "A", b: "B" },
    { a: "A1", b: "B1" },
    { a: "A", b: "A1" },
    { a: "B", b: "C" },
    { a: "B1", b: "C1" },
    { a: "B", b: "B1" },
  ]);
  assert.deepEqual(result.edges.slice(-3), [
    { a: "E", b: "A" },
    { a: "E1", b: "A1" },
    { a: "E", b: "E1" },
  ]);
});

test("custom valid identifiers are preserved rather than trimmed", () => {
  const result = unwrap(
    triPyramid({ apex: " P ", base: ["A", "B", "C"] }),
  );
  assert.equal(result.vertices[0], " P ");
});

test("constructors reject empty and duplicate vertex identifiers", () => {
  expectError(
    triPyramid({ apex: "  ", base: ["A", "B", "C"] }),
    KERNEL_ERROR_CODES.invalidVertexId,
  );
  expectError(
    quadPyramid({ apex: "A", base: ["A", "B", "C", "D"] }),
    KERNEL_ERROR_CODES.duplicateVertex,
  );
});

test("fixed bodies and prisms reject invalid arity", () => {
  expectError(
    quadPyramid({ base: ["A", "B", "C"] as unknown as readonly [string, string, string, string] }),
    KERNEL_ERROR_CODES.invalidArity,
  );
  expectError(
    cuboid({
      bottom: ["A", "B", "C", "D"],
      top: ["A1", "B1", "C1"] as unknown as readonly [string, string, string, string],
    }),
    KERNEL_ERROR_CODES.invalidArity,
  );
  expectError(
    prism({ bottom: ["A", "B"], top: ["A1", "B1"] }),
    KERNEL_ERROR_CODES.invalidArity,
  );
  expectError(
    prism({ bottom: ["A", "B", "C"], top: ["A1", "B1", "C1", "D1"] }),
    KERNEL_ERROR_CODES.invalidArity,
  );
});

test("topology validation rejects self-loops, duplicate undirected edges, and unknown endpoints", () => {
  expectError(
    validateBodyTopology({
      vertices: ["A", "B"],
      edges: [{ a: "A", b: "A" }],
    }),
    KERNEL_ERROR_CODES.selfLoopEdge,
  );
  expectError(
    validateBodyTopology({
      vertices: ["A", "B"],
      edges: [
        { a: "A", b: "B" },
        { a: "B", b: "A" },
      ],
    }),
    KERNEL_ERROR_CODES.duplicateEdge,
  );
  expectError(
    validateBodyTopology({
      vertices: ["A", "B"],
      edges: [{ a: "A", b: "C" }],
    }),
    KERNEL_ERROR_CODES.unknownVertex,
  );
});

test("successful topologies are newly allocated and deeply frozen", () => {
  const first = unwrap(quadPyramid());
  const second = unwrap(quadPyramid());

  assert.notEqual(first, second);
  assert.notEqual(first.vertices, second.vertices);
  assert.notEqual(first.edges, second.edges);
  assert.notEqual(first.edges[0], second.edges[0]);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.vertices), true);
  assert.equal(Object.isFrozen(first.edges), true);
  assert.equal(Object.isFrozen(first.edges[0]), true);
});
