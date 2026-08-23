/**
 * Modified TypeScript rewrite of Edulab bodies.py at
 * cf0bc1d68b4ea64307f57d7fac64667e6a3148cc (Apache-2.0).
 * See third_party/edulab for the upstream license and modification notice.
 */

import { KERNEL_ERROR_CODES, type MathKernelErrorCode } from "../shared/errors";
import type { KernelResult } from "../shared/types";

export interface TopologyEdge<VertexId extends string = string> {
  readonly a: VertexId;
  readonly b: VertexId;
}

export interface BodyTopology<VertexId extends string = string> {
  readonly vertices: readonly VertexId[];
  readonly edges: readonly TopologyEdge<VertexId>[];
}

export interface PyramidOptions<VertexId extends string = string> {
  readonly apex?: VertexId;
  readonly base?: readonly VertexId[];
}

export interface CuboidOptions<VertexId extends string = string> {
  readonly bottom?: readonly VertexId[];
  readonly top?: readonly VertexId[];
}

export interface PrismOptions<VertexId extends string = string> {
  readonly bottom?: readonly VertexId[];
  readonly top?: readonly VertexId[];
}

function fail<T>(
  code: MathKernelErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): KernelResult<T> {
  return { ok: false, error: { code, message, details } };
}

function edge<VertexId extends string>(
  a: VertexId,
  b: VertexId,
): TopologyEdge<VertexId> {
  return { a, b };
}

function requireArity<T>(
  values: readonly unknown[],
  expected: number,
  label: string,
): KernelResult<T> | null {
  return values.length === expected
    ? null
    : fail(
        KERNEL_ERROR_CODES.invalidArity,
        `${label} must contain exactly ${expected} vertices.`,
        { actual: values.length, expected, label },
      );
}

/**
 * Validate, clone, and deeply freeze a topology at the public boundary.
 * Undirected edges are unique: A-B and B-A describe the same edge.
 */
export function validateBodyTopology<VertexId extends string>(
  topology: BodyTopology<VertexId>,
): KernelResult<BodyTopology<VertexId>>;
export function validateBodyTopology(
  topology: unknown,
): KernelResult<BodyTopology<string>>;
export function validateBodyTopology(
  topology: unknown,
): KernelResult<BodyTopology<string>> {
  try {
    if (!isPlainRecord(topology)) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "A body topology must be a plain object.",
      );
    }
    const vertices = ownDataProperty(topology, "vertices");
    const edges = ownDataProperty(topology, "edges");
    if (!Array.isArray(vertices) || !Array.isArray(edges)) {
      return fail(
        KERNEL_ERROR_CODES.invalidInput,
        "A body topology must contain vertices and edges arrays.",
      );
    }

    const vertexIndex = new Map<string, number>();
    for (let index = 0; index < vertices.length; index += 1) {
      const vertex = vertices[index];
      if (typeof vertex !== "string" || vertex.trim().length === 0) {
        return fail(
          KERNEL_ERROR_CODES.invalidVertexId,
          "Vertex identifiers must be non-empty strings.",
          { index },
        );
      }
      if (vertexIndex.has(vertex)) {
        return fail(
          KERNEL_ERROR_CODES.duplicateVertex,
          `Vertex identifier ${JSON.stringify(vertex)} occurs more than once.`,
          { index, vertex },
        );
      }
      vertexIndex.set(vertex, index);
    }

    const seenEdges = new Set<string>();
    const frozenEdges: TopologyEdge<string>[] = [];
    for (let index = 0; index < edges.length; index += 1) {
      const current = edges[index];
      if (!isPlainRecord(current)) {
        return fail(
          KERNEL_ERROR_CODES.invalidInput,
          "Every topology edge must be a plain object.",
          { edgeIndex: index },
        );
      }
      const a = ownDataProperty(current, "a");
      const b = ownDataProperty(current, "b");
      if (
        typeof a !== "string" ||
        typeof b !== "string" ||
        a.trim().length === 0 ||
        b.trim().length === 0
      ) {
        return fail(
          KERNEL_ERROR_CODES.invalidVertexId,
          "Edge endpoints must be non-empty vertex identifiers.",
          { edgeIndex: index },
        );
      }
      const aIndex = vertexIndex.get(a);
      const bIndex = vertexIndex.get(b);
      if (aIndex === undefined || bIndex === undefined) {
        return fail(
          KERNEL_ERROR_CODES.unknownVertex,
          "Every edge endpoint must identify a topology vertex.",
          { edgeIndex: index, a, b },
        );
      }
      if (a === b) {
        return fail(
          KERNEL_ERROR_CODES.selfLoopEdge,
          "Topology edges must connect two different vertices.",
          { edgeIndex: index, vertex: a },
        );
      }
      const key = aIndex < bIndex ? `${aIndex}:${bIndex}` : `${bIndex}:${aIndex}`;
      if (seenEdges.has(key)) {
        return fail(
          KERNEL_ERROR_CODES.duplicateEdge,
          "A topology cannot contain the same undirected edge twice.",
          { edgeIndex: index, a, b },
        );
      }
      seenEdges.add(key);
      frozenEdges.push(Object.freeze({ a, b }));
    }

    const frozenVertices = Object.freeze([...vertexIndex.keys()]);
    const frozenEdgeArray = Object.freeze(frozenEdges);
    return {
      ok: true,
      value: Object.freeze({ vertices: frozenVertices, edges: frozenEdgeArray }),
    };
  } catch {
    return fail(
      KERNEL_ERROR_CODES.invalidInput,
      "The body topology could not be safely inspected.",
    );
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownDataProperty(
  value: Record<string, unknown>,
  key: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

export function quadPyramid<VertexId extends string = string>(
  options: PyramidOptions<VertexId> = {},
): KernelResult<BodyTopology<VertexId>> {
  const apex = options.apex ?? ("P" as VertexId);
  const base = options.base ?? (["A", "B", "C", "D"] as VertexId[]);
  const arityError = requireArity<BodyTopology<VertexId>>(base, 4, "base");
  if (arityError) return arityError;
  const [a, b, c, d] = base;
  return validateBodyTopology({
    vertices: [apex, a, b, c, d],
    edges: [
      edge(a, b),
      edge(b, c),
      edge(c, d),
      edge(d, a),
      edge(apex, a),
      edge(apex, b),
      edge(apex, c),
      edge(apex, d),
    ],
  });
}

export function triPyramid<VertexId extends string = string>(
  options: PyramidOptions<VertexId> = {},
): KernelResult<BodyTopology<VertexId>> {
  const apex = options.apex ?? ("P" as VertexId);
  const base = options.base ?? (["A", "B", "C"] as VertexId[]);
  const arityError = requireArity<BodyTopology<VertexId>>(base, 3, "base");
  if (arityError) return arityError;
  const [a, b, c] = base;
  return validateBodyTopology({
    vertices: [apex, a, b, c],
    edges: [
      edge(a, b),
      edge(b, c),
      edge(c, a),
      edge(apex, a),
      edge(apex, b),
      edge(apex, c),
    ],
  });
}

export function cuboid<VertexId extends string = string>(
  options: CuboidOptions<VertexId> = {},
): KernelResult<BodyTopology<VertexId>> {
  const bottom = options.bottom ?? (["A", "B", "C", "D"] as VertexId[]);
  const top = options.top ?? (["A1", "B1", "C1", "D1"] as VertexId[]);
  const bottomArity = requireArity<BodyTopology<VertexId>>(bottom, 4, "bottom");
  if (bottomArity) return bottomArity;
  const topArity = requireArity<BodyTopology<VertexId>>(top, 4, "top");
  if (topArity) return topArity;
  const [a, b, c, d] = bottom;
  const [a1, b1, c1, d1] = top;
  return validateBodyTopology({
    vertices: [a, b, c, d, a1, b1, c1, d1],
    edges: [
      edge(a, b),
      edge(b, c),
      edge(c, d),
      edge(d, a),
      edge(a1, b1),
      edge(b1, c1),
      edge(c1, d1),
      edge(d1, a1),
      edge(a, a1),
      edge(b, b1),
      edge(c, c1),
      edge(d, d1),
    ],
  });
}

/** A cube has the same topology as a cuboid; edge lengths live in coordinates. */
export const cube = cuboid;

export function prism<VertexId extends string = string>(
  options: PrismOptions<VertexId> = {},
): KernelResult<BodyTopology<VertexId>> {
  const bottom = options.bottom ?? (["A", "B", "C"] as VertexId[]);
  const top = options.top ?? (["A1", "B1", "C1"] as VertexId[]);
  if (bottom.length < 3 || top.length !== bottom.length) {
    return fail(
      KERNEL_ERROR_CODES.invalidArity,
      "A prism needs matching bottom and top polygons with at least three vertices.",
      { bottom: bottom.length, top: top.length },
    );
  }

  const edges: TopologyEdge<VertexId>[] = [];
  for (let index = 0; index < bottom.length; index += 1) {
    const next = (index + 1) % bottom.length;
    edges.push(edge(bottom[index], bottom[next]));
    edges.push(edge(top[index], top[next]));
    edges.push(edge(bottom[index], top[index]));
  }
  return validateBodyTopology({ vertices: [...bottom, ...top], edges });
}
