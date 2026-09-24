import {
  canonicalCourseNodes,
  type CanonicalCourseNode,
  type CanonicalCourseNodeKind,
  type CanonicalCourseVersion
} from "./model";

export interface CanonicalDiffIdentity {
  readonly kind: CanonicalCourseNodeKind;
  readonly id: string;
}

export interface CanonicalDiffPlacement {
  readonly parentId: string | null;
  readonly order: number;
}

export interface CanonicalMovedDiff extends CanonicalDiffIdentity {
  readonly from: CanonicalDiffPlacement;
  readonly to: CanonicalDiffPlacement;
}

export interface CanonicalCourseVersionDiff {
  readonly added: readonly CanonicalDiffIdentity[];
  readonly removed: readonly CanonicalDiffIdentity[];
  readonly changed: readonly CanonicalDiffIdentity[];
  readonly moved: readonly CanonicalMovedDiff[];
}

const kindOrder: Record<CanonicalCourseNodeKind, number> = {
  course: 0,
  module: 1,
  unit: 2,
  activity: 3,
  resource: 4,
  assessment: 5
};

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareIdentity(left: CanonicalDiffIdentity, right: CanonicalDiffIdentity) {
  return kindOrder[left.kind] - kindOrder[right.kind] || compareText(left.id, right.id);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  const entries = Object.keys(object)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`);
  return `{${entries.join(",")}}`;
}

function semanticProjection(node: CanonicalCourseNode) {
  const base = {
    kind: node.kind,
    sourceId: node.sourceId,
    title: node.title,
    extensions: node.extensions ?? null
  };

  switch (node.kind) {
    case "unit":
    case "activity":
      return {
        ...base,
        resourceIds: node.resourceIds,
        assessmentIds: node.assessmentIds
      };
    case "resource":
      return {
        ...base,
        href: node.href,
        filePaths: node.filePaths,
        dependencyResourceIds: node.dependencyResourceIds,
        referencedByIds: node.referencedByIds
      };
    case "assessment":
      return {
        ...base,
        assessmentType: node.assessmentType,
        resourceIds: node.resourceIds
      };
    case "course":
    case "module":
      return base;
  }
}

function placement(node: CanonicalCourseNode): CanonicalDiffPlacement {
  return { parentId: node.parentId, order: node.order };
}

function placementsMatch(left: CanonicalCourseNode, right: CanonicalCourseNode) {
  return left.parentId === right.parentId && left.order === right.order;
}

export function diffCanonicalCourseVersions(
  before: CanonicalCourseVersion,
  after: CanonicalCourseVersion
): CanonicalCourseVersionDiff {
  const beforeById = new Map(canonicalCourseNodes(before).map((node) => [node.id, node]));
  const afterById = new Map(canonicalCourseNodes(after).map((node) => [node.id, node]));

  const added: CanonicalDiffIdentity[] = [];
  const removed: CanonicalDiffIdentity[] = [];
  const changed: CanonicalDiffIdentity[] = [];
  const moved: CanonicalMovedDiff[] = [];

  for (const node of afterById.values()) {
    const previous = beforeById.get(node.id);
    if (!previous) {
      added.push({ kind: node.kind, id: node.id });
      continue;
    }
    if (stableJson(semanticProjection(previous)) !== stableJson(semanticProjection(node))) {
      changed.push({ kind: node.kind, id: node.id });
    }
    if (!placementsMatch(previous, node)) {
      moved.push({
        kind: node.kind,
        id: node.id,
        from: placement(previous),
        to: placement(node)
      });
    }
  }

  for (const node of beforeById.values()) {
    if (!afterById.has(node.id)) removed.push({ kind: node.kind, id: node.id });
  }

  added.sort(compareIdentity);
  removed.sort(compareIdentity);
  changed.sort(compareIdentity);
  moved.sort(compareIdentity);

  return Object.freeze({
    added: Object.freeze(added.map((entry): CanonicalDiffIdentity => Object.freeze({ ...entry }))),
    removed: Object.freeze(removed.map((entry): CanonicalDiffIdentity => Object.freeze({ ...entry }))),
    changed: Object.freeze(changed.map((entry): CanonicalDiffIdentity => Object.freeze({ ...entry }))),
    moved: Object.freeze(moved.map((entry) => Object.freeze({
      ...entry,
      from: Object.freeze(entry.from),
      to: Object.freeze(entry.to)
    })))
  });
}
