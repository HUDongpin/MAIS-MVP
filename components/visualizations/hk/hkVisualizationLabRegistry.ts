/**
 * Immutable Hong Kong Visualization Lab routing boundary.
 *
 * Keep this module data-only: the lightweight dispatcher may import it without
 * pulling either dedicated visualization implementation into the route chunk.
 */

export const HK_PRIMARY_DEDICATED_LAB_IDS = Object.freeze([
  "p1-counting-number-bonds",
  "p1-addition-subtraction",
  "p1-shapes-patterns",
  "p1-measurement-time",
  "p2-place-value",
  "p2-money-time",
  "p2-length-data",
  "p3-multiplication-division",
  "p3-measurement",
  "p3-geometry-patterns",
  "p4-large-numbers",
  "p4-decimals",
  "p4-angles",
  "p4-perimeter-area",
  "p5-fractions-operations",
  "p5-volume",
  "p5-rates",
  "p5-charts-averages",
  "p6-percentages",
  "p6-ratio-proportion",
  "p6-speed",
  "p6-pre-secondary-problem-solving"
] as const);

export const HK_SECONDARY_DEDICATED_LAB_IDS = Object.freeze([
  "integers",
  "algebra-basics",
  "angles",
  "ratios",
  "linear-equations",
  "coordinates",
  "transformations",
  "probability-s2",
  "polynomials",
  "quadratic-patterns",
  "identities-square-patterns",
  "trigonometry-basics",
  "circles",
  "arc-length-sector-area",
  "functions",
  "coordinate-geometry",
  "more-algebra",
  "trigonometry-s5",
  "probability-s5",
  "statistics-s6",
  "exam-revision",
  "mixed-problem-solving"
] as const);

export const HK_PASS_THROUGH_LAB_IDS = Object.freeze([
  "p2-multiplication-foundations",
  "p3-fractions-intro",
  "statistics-s1",
  "data-handling",
  "advanced-functions",
  "differentiation-intro",
  "calculus"
] as const);

export const HK_DEDICATED_LAB_IDS = Object.freeze([
  ...HK_PRIMARY_DEDICATED_LAB_IDS,
  ...HK_SECONDARY_DEDICATED_LAB_IDS
] as const);

export const HK_VISUALIZATION_LAB_IDS = Object.freeze([
  ...HK_DEDICATED_LAB_IDS,
  ...HK_PASS_THROUGH_LAB_IDS
] as const);

export type HKPrimaryDedicatedLabId = (typeof HK_PRIMARY_DEDICATED_LAB_IDS)[number];
export type HKSecondaryDedicatedLabId = (typeof HK_SECONDARY_DEDICATED_LAB_IDS)[number];
export type HKPassThroughLabId = (typeof HK_PASS_THROUGH_LAB_IDS)[number];
export type HKDedicatedLabId = (typeof HK_DEDICATED_LAB_IDS)[number];
export type HKVisualizationLabId = (typeof HK_VISUALIZATION_LAB_IDS)[number];
export type HKVisualizationLabRegistryKind = "primary-dedicated" | "secondary-dedicated" | "pass-through";

/**
 * A ReadonlySet facade with no public mutator and a private backing Set.
 * Unlike `Object.freeze(new Set(...))`, callers cannot still invoke `.add()`.
 */
class ImmutableReadonlySet<T> implements ReadonlySet<T> {
  readonly #values: Set<T>;
  readonly [Symbol.toStringTag] = "ImmutableReadonlySet";

  constructor(values: readonly T[]) {
    this.#values = new Set(values);
    Object.freeze(this);
  }

  get size() {
    return this.#values.size;
  }

  has(value: T) {
    return this.#values.has(value);
  }

  union<U>(other: ReadonlySetLike<U>): Set<T | U> {
    const result = new Set<T | U>(this.#values);
    const iterator = other.keys();
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) result.add(entry.value);
    return result;
  }

  intersection<U>(other: ReadonlySetLike<U>): Set<T & U> {
    const result = new Set<T & U>();
    const setLike = other as ReadonlySetLike<unknown>;
    for (const value of this.#values) {
      if (setLike.has(value)) result.add(value as T & U);
    }
    return result;
  }

  difference<U>(other: ReadonlySetLike<U>): Set<T> {
    const result = new Set<T>();
    const setLike = other as ReadonlySetLike<unknown>;
    for (const value of this.#values) {
      if (!setLike.has(value)) result.add(value);
    }
    return result;
  }

  symmetricDifference<U>(other: ReadonlySetLike<U>): Set<T | U> {
    const result = new Set<T | U>(this.#values);
    const iterator = other.keys();
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
      if (result.has(entry.value)) result.delete(entry.value);
      else result.add(entry.value);
    }
    return result;
  }

  isSubsetOf(other: ReadonlySetLike<unknown>): boolean {
    for (const value of this.#values) {
      if (!other.has(value)) return false;
    }
    return true;
  }

  isSupersetOf(other: ReadonlySetLike<unknown>): boolean {
    const iterator = other.keys();
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
      if (!this.#values.has(entry.value as T)) return false;
    }
    return true;
  }

  isDisjointFrom(other: ReadonlySetLike<unknown>): boolean {
    const iterator = other.keys();
    for (let entry = iterator.next(); !entry.done; entry = iterator.next()) {
      if (this.#values.has(entry.value as T)) return false;
    }
    return true;
  }

  entries(): ReturnType<Set<T>["entries"]> {
    return this.#values.entries();
  }

  keys(): ReturnType<Set<T>["keys"]> {
    return this.#values.keys();
  }

  values(): ReturnType<Set<T>["values"]> {
    return this.#values.values();
  }

  forEach(
    callback: (value: T, valueAgain: T, set: ReadonlySet<T>) => void,
    thisArg?: unknown
  ) {
    for (const value of this.#values) callback.call(thisArg, value, value, this);
  }

  [Symbol.iterator](): ReturnType<Set<T>[typeof Symbol.iterator]> {
    return this.#values[Symbol.iterator]();
  }
}

Object.freeze(ImmutableReadonlySet.prototype);

function immutableReadonlySet<const T extends string>(values: readonly T[]): ReadonlySet<T> {
  return new ImmutableReadonlySet(values);
}

export const HK_PRIMARY_DEDICATED_LAB_ID_SET = immutableReadonlySet(HK_PRIMARY_DEDICATED_LAB_IDS);
export const HK_SECONDARY_DEDICATED_LAB_ID_SET = immutableReadonlySet(HK_SECONDARY_DEDICATED_LAB_IDS);
export const HK_PASS_THROUGH_LAB_ID_SET = immutableReadonlySet(HK_PASS_THROUGH_LAB_IDS);
export const HK_DEDICATED_LAB_ID_SET = immutableReadonlySet(HK_DEDICATED_LAB_IDS);
export const HK_VISUALIZATION_LAB_ID_SET = immutableReadonlySet(HK_VISUALIZATION_LAB_IDS);

export const HK_VISUALIZATION_LAB_REGISTRY_COUNTS = Object.freeze({
  primaryDedicated: 22,
  secondaryDedicated: 22,
  dedicated: 44,
  passThrough: 7,
  total: 51
} as const);

export function isHKPrimaryDedicatedLabId(labId: string): labId is HKPrimaryDedicatedLabId {
  return HK_PRIMARY_DEDICATED_LAB_ID_SET.has(labId as HKPrimaryDedicatedLabId);
}

export function isHKSecondaryDedicatedLabId(labId: string): labId is HKSecondaryDedicatedLabId {
  return HK_SECONDARY_DEDICATED_LAB_ID_SET.has(labId as HKSecondaryDedicatedLabId);
}

export function isHKPassThroughLabId(labId: string): labId is HKPassThroughLabId {
  return HK_PASS_THROUGH_LAB_ID_SET.has(labId as HKPassThroughLabId);
}

export function isHKDedicatedLabId(labId: string): labId is HKDedicatedLabId {
  return HK_DEDICATED_LAB_ID_SET.has(labId as HKDedicatedLabId);
}

export function isHKVisualizationLabId(labId: string): labId is HKVisualizationLabId {
  return HK_VISUALIZATION_LAB_ID_SET.has(labId as HKVisualizationLabId);
}

export function hkVisualizationLabRegistryKind(
  labId: string
): HKVisualizationLabRegistryKind | null {
  if (isHKPrimaryDedicatedLabId(labId)) return "primary-dedicated";
  if (isHKSecondaryDedicatedLabId(labId)) return "secondary-dedicated";
  if (isHKPassThroughLabId(labId)) return "pass-through";
  return null;
}

function assertExactRegistryPartition() {
  const partitions = [
    ["primary dedicated", HK_PRIMARY_DEDICATED_LAB_IDS, HK_VISUALIZATION_LAB_REGISTRY_COUNTS.primaryDedicated],
    ["secondary dedicated", HK_SECONDARY_DEDICATED_LAB_IDS, HK_VISUALIZATION_LAB_REGISTRY_COUNTS.secondaryDedicated],
    ["pass-through", HK_PASS_THROUGH_LAB_IDS, HK_VISUALIZATION_LAB_REGISTRY_COUNTS.passThrough]
  ] as const;

  for (const [label, ids, expectedCount] of partitions) {
    if (!Object.isFrozen(ids)) throw new Error(`HK Visualization ${label} ID tuple must be frozen.`);
    if (ids.length !== expectedCount) {
      throw new Error(`HK Visualization ${label} registry expected ${expectedCount} IDs; received ${ids.length}.`);
    }
  }

  const counts = new Map<string, number>();
  for (const labId of HK_VISUALIZATION_LAB_IDS) {
    counts.set(labId, (counts.get(labId) ?? 0) + 1);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(labId)) {
      throw new Error(`HK Visualization registry contains an unsafe lab ID: ${JSON.stringify(labId)}.`);
    }
  }
  const duplicateIds = [...counts.entries()]
    .filter(([, count]) => count !== 1)
    .map(([labId]) => labId);
  if (duplicateIds.length > 0) {
    throw new Error(`HK Visualization registry partitions overlap: ${duplicateIds.join(", ")}.`);
  }
  if (HK_DEDICATED_LAB_IDS.length !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.dedicated) {
    throw new Error(
      `HK Visualization dedicated registry expected ${HK_VISUALIZATION_LAB_REGISTRY_COUNTS.dedicated} IDs; received ${HK_DEDICATED_LAB_IDS.length}.`
    );
  }
  if (HK_VISUALIZATION_LAB_IDS.length !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.total) {
    throw new Error(
      `HK Visualization full registry expected ${HK_VISUALIZATION_LAB_REGISTRY_COUNTS.total} IDs; received ${HK_VISUALIZATION_LAB_IDS.length}.`
    );
  }
  if (
    HK_PRIMARY_DEDICATED_LAB_ID_SET.size !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.primaryDedicated
    || HK_SECONDARY_DEDICATED_LAB_ID_SET.size !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.secondaryDedicated
    || HK_PASS_THROUGH_LAB_ID_SET.size !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.passThrough
    || HK_DEDICATED_LAB_ID_SET.size !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.dedicated
    || HK_VISUALIZATION_LAB_ID_SET.size !== HK_VISUALIZATION_LAB_REGISTRY_COUNTS.total
  ) {
    throw new Error("HK Visualization immutable set boundary drifted from its frozen ID tuples.");
  }
}

assertExactRegistryPartition();
