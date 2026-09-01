import { createHash } from "node:crypto";

export const COURSE_INTEGRATION_SCHEMA_VERSION = "mais.course-integration.v1" as const;

export type CanonicalCourseNodeKind =
  | "course"
  | "module"
  | "unit"
  | "activity"
  | "resource"
  | "assessment";

export type CanonicalExtensionValue =
  | string
  | number
  | boolean
  | null
  | readonly CanonicalExtensionValue[]
  | { readonly [key: string]: CanonicalExtensionValue };

export type CanonicalExtensions = Readonly<Record<string, CanonicalExtensionValue>>;

export interface CanonicalSourceProvenance {
  readonly packageSha256: string;
  readonly schemaVersion: typeof COURSE_INTEGRATION_SCHEMA_VERSION;
  readonly source: {
    readonly format: string;
    readonly version: string | null;
  };
  readonly adapter: {
    readonly id: string;
    readonly version: string;
  };
  readonly extensions?: CanonicalExtensions;
}

export interface ImmutableCourseVersionMetadata {
  readonly versionId: string;
  readonly predecessorVersionId: string | null;
  readonly contentSha256: string;
  readonly immutable: true;
}

interface CanonicalNodeBase<Kind extends CanonicalCourseNodeKind> {
  readonly kind: Kind;
  readonly id: string;
  readonly sourceId: string;
  readonly parentId: string | null;
  readonly order: number;
  readonly title: string | null;
  readonly extensions?: CanonicalExtensions;
}

export type CanonicalCourse = CanonicalNodeBase<"course">;
export type CanonicalModule = CanonicalNodeBase<"module">;

export interface CanonicalUnit extends CanonicalNodeBase<"unit"> {
  readonly resourceIds: readonly string[];
  readonly assessmentIds: readonly string[];
}

export interface CanonicalActivity extends CanonicalNodeBase<"activity"> {
  readonly resourceIds: readonly string[];
  readonly assessmentIds: readonly string[];
}

export interface CanonicalResource extends CanonicalNodeBase<"resource"> {
  readonly href: string | null;
  readonly filePaths: readonly string[];
  readonly dependencyResourceIds: readonly string[];
  readonly referencedByIds: readonly string[];
}

export interface CanonicalAssessment extends CanonicalNodeBase<"assessment"> {
  readonly assessmentType: string;
  readonly resourceIds: readonly string[];
}

export interface CanonicalCourseVersionInput {
  readonly sourceProvenance: CanonicalSourceProvenance;
  readonly predecessorVersionId: string | null;
  readonly course: CanonicalCourse;
  readonly modules: readonly CanonicalModule[];
  readonly units: readonly CanonicalUnit[];
  readonly activities: readonly CanonicalActivity[];
  readonly resources: readonly CanonicalResource[];
  readonly assessments: readonly CanonicalAssessment[];
}

interface CanonicalCourseContent {
  readonly sourceProvenance: CanonicalSourceProvenance;
  readonly course: CanonicalCourse;
  readonly modules: readonly CanonicalModule[];
  readonly units: readonly CanonicalUnit[];
  readonly activities: readonly CanonicalActivity[];
  readonly resources: readonly CanonicalResource[];
  readonly assessments: readonly CanonicalAssessment[];
}

export type CanonicalCourseVersion = Readonly<CanonicalCourseContent & {
  readonly versionMetadata: ImmutableCourseVersionMetadata;
}>;

export type CanonicalCourseNode =
  | CanonicalCourse
  | CanonicalModule
  | CanonicalUnit
  | CanonicalActivity
  | CanonicalResource
  | CanonicalAssessment;

const EXTENSION_NAMESPACE = /^(?:[A-Za-z][A-Za-z0-9-]*\.)+[A-Za-z][A-Za-z0-9-]*$/;
const MAX_EXTENSION_DEPTH = 16;
const MAX_EXTENSION_COLLECTION_SIZE = 1_000;

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertNonEmptyString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
}

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new TypeError(`${field} must be a lowercase SHA-256 digest.`);
  }
}

function assertUniqueStrings(values: readonly string[], field: string) {
  const seen = new Set<string>();
  for (const value of values) {
    assertNonEmptyString(value, field);
    if (seen.has(value)) throw new TypeError(`${field} must not contain duplicate stable IDs.`);
    seen.add(value);
  }
}

function assertExtensionValue(value: CanonicalExtensionValue, field: string, depth = 0): void {
  if (depth > MAX_EXTENSION_DEPTH) throw new TypeError(`${field} exceeds the extension depth limit.`);
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${field} numbers must be finite.`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_EXTENSION_COLLECTION_SIZE) {
      throw new TypeError(`${field} exceeds the extension collection limit.`);
    }
    for (const child of value) assertExtensionValue(child, field, depth + 1);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${field} contains an unsupported value.`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${field} must contain only plain JSON objects.`);
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_EXTENSION_COLLECTION_SIZE) {
    throw new TypeError(`${field} exceeds the extension collection limit.`);
  }
  for (const [key, child] of entries) {
    assertNonEmptyString(key, `${field} key`);
    assertExtensionValue(child, `${field}.${key}`, depth + 1);
  }
}

function assertExtensions(extensions: CanonicalExtensions | undefined, field: string) {
  if (extensions === undefined) return;
  const prototype = Object.getPrototypeOf(extensions);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${field} must be a plain JSON object.`);
  }
  for (const [namespace, value] of Object.entries(extensions)) {
    if (!EXTENSION_NAMESPACE.test(namespace)) {
      throw new TypeError(`${field} keys must use reverse-domain namespaces.`);
    }
    assertExtensionValue(value, `${field}.${namespace}`);
  }
}

function cloneExtensionValue(value: CanonicalExtensionValue): CanonicalExtensionValue {
  if (Array.isArray(value)) return value.map((child) => cloneExtensionValue(child));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, child]) => [key, cloneExtensionValue(child)])
    );
  }
  return value;
}

function cloneExtensions(extensions: CanonicalExtensions): CanonicalExtensions {
  return Object.fromEntries(
    Object.entries(extensions)
      .sort(([left], [right]) => compareText(left, right))
      .map(([namespace, value]) => [namespace, cloneExtensionValue(value)])
  );
}

function cloneNodeBase<Kind extends CanonicalCourseNodeKind>(
  node: CanonicalNodeBase<Kind>
): CanonicalNodeBase<Kind> {
  return {
    kind: node.kind,
    id: node.id,
    sourceId: node.sourceId,
    parentId: node.parentId,
    order: node.order,
    title: node.title,
    ...(node.extensions === undefined ? {} : { extensions: cloneExtensions(node.extensions) })
  };
}

function compareNodes(left: CanonicalCourseNode, right: CanonicalCourseNode) {
  return compareText(left.parentId ?? "", right.parentId ?? "") ||
    left.order - right.order ||
    compareText(left.id, right.id);
}

function cloneCourseContent(input: CanonicalCourseVersionInput): CanonicalCourseContent {
  const modules = input.modules.map((node) => cloneNodeBase(node));
  const units = input.units.map((node): CanonicalUnit => ({
    ...cloneNodeBase(node),
    resourceIds: [...node.resourceIds],
    assessmentIds: [...node.assessmentIds]
  }));
  const activities = input.activities.map((node): CanonicalActivity => ({
    ...cloneNodeBase(node),
    resourceIds: [...node.resourceIds],
    assessmentIds: [...node.assessmentIds]
  }));
  const resources = input.resources.map((node): CanonicalResource => ({
    ...cloneNodeBase(node),
    href: node.href,
    filePaths: [...node.filePaths],
    dependencyResourceIds: [...node.dependencyResourceIds],
    referencedByIds: [...node.referencedByIds]
  }));
  const assessments = input.assessments.map((node): CanonicalAssessment => ({
    ...cloneNodeBase(node),
    assessmentType: node.assessmentType,
    resourceIds: [...node.resourceIds]
  }));
  modules.sort(compareNodes);
  units.sort(compareNodes);
  activities.sort(compareNodes);
  resources.sort(compareNodes);
  assessments.sort(compareNodes);

  return {
    sourceProvenance: {
      packageSha256: input.sourceProvenance.packageSha256,
      schemaVersion: input.sourceProvenance.schemaVersion,
      source: { ...input.sourceProvenance.source },
      adapter: { ...input.sourceProvenance.adapter },
      ...(input.sourceProvenance.extensions === undefined
        ? {}
        : { extensions: cloneExtensions(input.sourceProvenance.extensions) })
    },
    course: cloneNodeBase(input.course),
    modules,
    units,
    activities,
    resources,
    assessments
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertNodeBase(node: CanonicalCourseNode) {
  assertNonEmptyString(node.id, `${node.kind}.id`);
  assertNonEmptyString(node.sourceId, `${node.kind}.sourceId`);
  if (!Number.isSafeInteger(node.order) || node.order < 0) {
    throw new TypeError(`${node.kind}.order must be a non-negative safe integer.`);
  }
  if (node.parentId !== null) assertNonEmptyString(node.parentId, `${node.kind}.parentId`);
  if (node.title !== null && typeof node.title !== "string") {
    throw new TypeError(`${node.kind}.title must be a string or null.`);
  }
  assertExtensions(node.extensions, `${node.kind}.extensions`);
}

function assertContiguousSiblingOrder(nodes: readonly CanonicalCourseNode[]) {
  const groups = new Map<string, number[]>();
  for (const node of nodes) {
    const key = `${node.kind}\u0000${node.parentId ?? ""}`;
    const orders = groups.get(key) ?? [];
    orders.push(node.order);
    groups.set(key, orders);
  }

  for (const orders of groups.values()) {
    orders.sort((left, right) => left - right);
    for (let index = 0; index < orders.length; index += 1) {
      if (orders[index] !== index) {
        throw new TypeError("Sibling order values must be unique and contiguous from zero.");
      }
    }
  }
}

function assertCourseVersionInput(input: CanonicalCourseVersionInput) {
  assertSha256(input.sourceProvenance.packageSha256, "sourceProvenance.packageSha256");
  if (input.sourceProvenance.schemaVersion !== COURSE_INTEGRATION_SCHEMA_VERSION) {
    throw new TypeError("Unsupported canonical course schema version.");
  }
  assertNonEmptyString(input.sourceProvenance.source.format, "sourceProvenance.source.format");
  if (input.sourceProvenance.source.version !== null) {
    assertNonEmptyString(input.sourceProvenance.source.version, "sourceProvenance.source.version");
  }
  assertNonEmptyString(input.sourceProvenance.adapter.id, "sourceProvenance.adapter.id");
  assertNonEmptyString(input.sourceProvenance.adapter.version, "sourceProvenance.adapter.version");
  assertExtensions(input.sourceProvenance.extensions, "sourceProvenance.extensions");
  if (input.predecessorVersionId !== null) {
    assertNonEmptyString(input.predecessorVersionId, "predecessorVersionId");
  }

  const nodes: CanonicalCourseNode[] = [
    input.course,
    ...input.modules,
    ...input.units,
    ...input.activities,
    ...input.resources,
    ...input.assessments
  ];
  const byId = new Map<string, CanonicalCourseNode>();
  for (const node of nodes) {
    assertNodeBase(node);
    if (byId.has(node.id)) throw new TypeError("Canonical stable IDs must be globally unique.");
    byId.set(node.id, node);
  }

  if (input.course.parentId !== null || input.course.order !== 0) {
    throw new TypeError("The canonical course must be the root node at order zero.");
  }
  for (const module of input.modules) {
    if (module.parentId !== input.course.id) throw new TypeError("Modules must belong to the canonical course.");
  }
  for (const unit of input.units) {
    if (byId.get(unit.parentId ?? "")?.kind !== "module") {
      throw new TypeError("Units must belong to a canonical module.");
    }
    assertUniqueStrings(unit.resourceIds, "unit.resourceIds");
    assertUniqueStrings(unit.assessmentIds, "unit.assessmentIds");
  }
  for (const activity of input.activities) {
    const parentKind = byId.get(activity.parentId ?? "")?.kind;
    if (parentKind !== "unit" && parentKind !== "activity") {
      throw new TypeError("Activities must belong to a unit or activity.");
    }
    assertUniqueStrings(activity.resourceIds, "activity.resourceIds");
    assertUniqueStrings(activity.assessmentIds, "activity.assessmentIds");
  }
  for (const resource of input.resources) {
    if (resource.parentId !== input.course.id) {
      throw new TypeError("Resources must belong to the canonical course.");
    }
    if (resource.href !== null && typeof resource.href !== "string") {
      throw new TypeError("resource.href must be a string or null.");
    }
    assertUniqueStrings(resource.filePaths, "resource.filePaths");
    assertUniqueStrings(resource.dependencyResourceIds, "resource.dependencyResourceIds");
    assertUniqueStrings(resource.referencedByIds, "resource.referencedByIds");
  }
  for (const assessment of input.assessments) {
    const parentKind = byId.get(assessment.parentId ?? "")?.kind;
    if (parentKind !== "unit" && parentKind !== "activity") {
      throw new TypeError("Assessments must belong to a unit or activity.");
    }
    assertNonEmptyString(assessment.assessmentType, "assessment.assessmentType");
    assertUniqueStrings(assessment.resourceIds, "assessment.resourceIds");
  }

  const resourceIds = new Set(input.resources.map((resource) => resource.id));
  const assessmentIds = new Set(input.assessments.map((assessment) => assessment.id));
  const learningNodeIds = new Set([
    ...input.units.map((unit) => unit.id),
    ...input.activities.map((activity) => activity.id)
  ]);
  for (const node of [...input.units, ...input.activities]) {
    if (node.resourceIds.some((id) => !resourceIds.has(id))) {
      throw new TypeError("Learning nodes may reference only canonical resources.");
    }
    if (node.assessmentIds.some((id) => !assessmentIds.has(id))) {
      throw new TypeError("Learning nodes may reference only canonical assessments.");
    }
    if (node.assessmentIds.some((id) => byId.get(id)?.parentId !== node.id)) {
      throw new TypeError("Assessment relationships must name their actual canonical parent.");
    }
  }
  for (const resource of input.resources) {
    if (resource.dependencyResourceIds.some((id) => !resourceIds.has(id))) {
      throw new TypeError("Resource dependencies may reference only canonical resources.");
    }
    if (resource.referencedByIds.some((id) => !learningNodeIds.has(id))) {
      throw new TypeError("Resource reverse references may name only units or activities.");
    }
    for (const referencedById of resource.referencedByIds) {
      const learningNode = byId.get(referencedById);
      if (
        (learningNode?.kind !== "unit" && learningNode?.kind !== "activity") ||
        !learningNode.resourceIds.includes(resource.id)
      ) {
        throw new TypeError("Resource relationships must be reciprocal.");
      }
    }
  }
  for (const assessment of input.assessments) {
    if (assessment.resourceIds.some((id) => !resourceIds.has(id))) {
      throw new TypeError("Assessments may reference only canonical resources.");
    }
    const parent = byId.get(assessment.parentId ?? "");
    if (
      (parent?.kind === "unit" || parent?.kind === "activity") &&
      !parent.assessmentIds.includes(assessment.id)
    ) {
      throw new TypeError("Assessment parent relationships must be reciprocal.");
    }
  }
  for (const node of [...input.units, ...input.activities]) {
    for (const resourceId of node.resourceIds) {
      const resource = byId.get(resourceId);
      if (resource?.kind !== "resource" || !resource.referencedByIds.includes(node.id)) {
        throw new TypeError("Resource relationships must be reciprocal.");
      }
    }
  }

  for (const activity of input.activities) {
    const visited = new Set<string>([activity.id]);
    let parentId = activity.parentId;
    while (parentId !== null) {
      if (visited.has(parentId)) throw new TypeError("Activity relationships must not contain cycles.");
      visited.add(parentId);
      const parent = byId.get(parentId);
      parentId = parent?.kind === "activity" ? parent.parentId : null;
    }
  }
  assertContiguousSiblingOrder(nodes.filter((node) => node.kind !== "course"));
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError("Canonical content contains an unsupported value.");
    return encoded;
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort(compareText)
    .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
    .join(",")}}`;
}

function sha256StableValue(value: unknown) {
  return createHash("sha256").update(stableJson(value), "utf8").digest("hex");
}

export function deriveCanonicalVersionId(
  contentSha256: string,
  predecessorVersionId: string | null
) {
  assertSha256(contentSha256, "contentSha256");
  if (predecessorVersionId !== null) {
    assertNonEmptyString(predecessorVersionId, "predecessorVersionId");
  }
  return `sha256:${sha256StableValue({
    schemaVersion: COURSE_INTEGRATION_SCHEMA_VERSION,
    contentSha256,
    predecessorVersionId
  })}`;
}

export function createCanonicalCourseVersion(
  input: CanonicalCourseVersionInput
): CanonicalCourseVersion {
  assertCourseVersionInput(input);
  const content = cloneCourseContent(input);
  const contentSha256 = sha256StableValue(content);
  const versionId = deriveCanonicalVersionId(contentSha256, input.predecessorVersionId);
  if (versionId === input.predecessorVersionId) {
    throw new TypeError("A canonical course version cannot name itself as its predecessor.");
  }
  return deepFreeze({
    ...content,
    versionMetadata: {
      versionId,
      predecessorVersionId: input.predecessorVersionId,
      contentSha256,
      immutable: true as const
    }
  });
}

export function canonicalCourseNodes(version: CanonicalCourseVersion): readonly CanonicalCourseNode[] {
  return [
    version.course,
    ...version.modules,
    ...version.units,
    ...version.activities,
    ...version.resources,
    ...version.assessments
  ];
}
