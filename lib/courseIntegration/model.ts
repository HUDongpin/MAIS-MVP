export const COURSE_INTEGRATION_SCHEMA_VERSION = "mais.course-integration.v1" as const;

export type CoursePackageSourceFormat = "scorm-1.2" | "scorm-2004";
export type CanonicalCourseNodeKind =
  | "course"
  | "module"
  | "unit"
  | "activity"
  | "resource"
  | "assessment";

export interface CoursePackageIdentity {
  readonly sha256: string;
  readonly schemaVersion: typeof COURSE_INTEGRATION_SCHEMA_VERSION;
  readonly sourceFormat: CoursePackageSourceFormat;
  readonly importedAt: string;
}

export interface ImmutableCourseVersionMetadata {
  readonly versionId: string;
  readonly createdAt: string;
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
  readonly scormType: string | null;
  readonly filePaths: readonly string[];
  readonly dependencyResourceIds: readonly string[];
  readonly referencedByIds: readonly string[];
}

export interface CanonicalAssessment extends CanonicalNodeBase<"assessment"> {
  readonly assessmentType: string;
  readonly resourceIds: readonly string[];
}

export interface CanonicalCourseVersionInput {
  readonly packageIdentity: CoursePackageIdentity;
  readonly versionMetadata: ImmutableCourseVersionMetadata;
  readonly course: CanonicalCourse;
  readonly modules: readonly CanonicalModule[];
  readonly units: readonly CanonicalUnit[];
  readonly activities: readonly CanonicalActivity[];
  readonly resources: readonly CanonicalResource[];
  readonly assessments: readonly CanonicalAssessment[];
}

export type CanonicalCourseVersion = Readonly<CanonicalCourseVersionInput>;
export type CanonicalCourseNode =
  | CanonicalCourse
  | CanonicalModule
  | CanonicalUnit
  | CanonicalActivity
  | CanonicalResource
  | CanonicalAssessment;

function assertNonEmptyString(value: string, field: string) {
  if (value.trim().length === 0) {
    throw new TypeError(`${field} must be a non-empty string.`);
  }
}

function assertIsoTimestamp(value: string, field: string) {
  assertNonEmptyString(value, field);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new TypeError(`${field} must be a canonical ISO-8601 timestamp.`);
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

function cloneNodeBase<Kind extends CanonicalCourseNodeKind>(
  node: CanonicalNodeBase<Kind>
): CanonicalNodeBase<Kind> {
  return {
    kind: node.kind,
    id: node.id,
    sourceId: node.sourceId,
    parentId: node.parentId,
    order: node.order,
    title: node.title
  };
}

function cloneCourseVersion(input: CanonicalCourseVersionInput): CanonicalCourseVersionInput {
  return {
    packageIdentity: { ...input.packageIdentity },
    versionMetadata: { ...input.versionMetadata },
    course: cloneNodeBase(input.course),
    modules: input.modules.map((node) => cloneNodeBase(node)),
    units: input.units.map((node) => ({
      ...cloneNodeBase(node),
      resourceIds: [...node.resourceIds],
      assessmentIds: [...node.assessmentIds]
    })),
    activities: input.activities.map((node) => ({
      ...cloneNodeBase(node),
      resourceIds: [...node.resourceIds],
      assessmentIds: [...node.assessmentIds]
    })),
    resources: input.resources.map((node) => ({
      ...cloneNodeBase(node),
      href: node.href,
      scormType: node.scormType,
      filePaths: [...node.filePaths],
      dependencyResourceIds: [...node.dependencyResourceIds],
      referencedByIds: [...node.referencedByIds]
    })),
    assessments: input.assessments.map((node) => ({
      ...cloneNodeBase(node),
      assessmentType: node.assessmentType,
      resourceIds: [...node.resourceIds]
    }))
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

function assertCourseVersion(input: CanonicalCourseVersionInput) {
  if (!/^[a-f0-9]{64}$/.test(input.packageIdentity.sha256)) {
    throw new TypeError("packageIdentity.sha256 must be a lowercase SHA-256 digest.");
  }
  if (input.packageIdentity.schemaVersion !== COURSE_INTEGRATION_SCHEMA_VERSION) {
    throw new TypeError("Unsupported canonical course schema version.");
  }
  if (!(["scorm-1.2", "scorm-2004"] as const).includes(input.packageIdentity.sourceFormat)) {
    throw new TypeError("Unsupported course package source format.");
  }
  assertIsoTimestamp(input.packageIdentity.importedAt, "packageIdentity.importedAt");
  assertIsoTimestamp(input.versionMetadata.createdAt, "versionMetadata.createdAt");
  assertNonEmptyString(input.versionMetadata.versionId, "versionMetadata.versionId");
  if (input.versionMetadata.predecessorVersionId !== null) {
    assertNonEmptyString(input.versionMetadata.predecessorVersionId, "versionMetadata.predecessorVersionId");
  }
  if (input.versionMetadata.immutable !== true) {
    throw new TypeError("versionMetadata must be immutable.");
  }
  if (input.versionMetadata.contentSha256 !== input.packageIdentity.sha256) {
    throw new TypeError("Version content hash must match the source package hash.");
  }
  if (input.versionMetadata.createdAt !== input.packageIdentity.importedAt) {
    throw new TypeError("Version creation time must match the immutable package import time.");
  }
  if (input.versionMetadata.predecessorVersionId === input.versionMetadata.versionId) {
    throw new TypeError("A canonical course version cannot name itself as its predecessor.");
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

export function createCanonicalCourseVersion(
  input: CanonicalCourseVersionInput
): CanonicalCourseVersion {
  const cloned = cloneCourseVersion(input);
  assertCourseVersion(cloned);
  return deepFreeze(cloned);
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
