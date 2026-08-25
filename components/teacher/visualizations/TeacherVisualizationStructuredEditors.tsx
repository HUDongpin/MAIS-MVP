"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers/AppProviders";
import {
  canonicalMathSceneBeatId,
  type MathScenePackageV3
} from "@/components/visualizations/three/manim/mathScenePackageV3";
import type { AnimationStep, MathObjectSpec, Vec3 } from "@/components/visualizations/three/manim/mathSceneTypes";
import {
  analyzeTeacherVisualizationAnimationTypeSwitch,
  commitTeacherVisualizationNumberDraft,
  createTeacherVisualizationAnimationStep,
  normalizeTeacherVisualizationCommaListDraft,
  patchTeacherVisualizationAnimationStep,
  patchTeacherVisualizationMathObjectConceptId
} from "@/lib/client/teacherVisualizationAuthoringModel";

type EditorProps = {
  disabled?: boolean;
  onChange: (packageJson: MathScenePackageV3) => void;
  packageJson: MathScenePackageV3;
};

const fieldClass = "focus-ring min-h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm font-semibold text-slate-900 outline-none dark:border-white/10 dark:bg-white/[0.07] dark:text-white";
const smallFieldClass = "focus-ring h-9 min-w-0 rounded-xl border border-slate-200 bg-white/85 px-2 text-xs font-bold text-slate-900 outline-none dark:border-white/10 dark:bg-white/[0.07] dark:text-white";

function clonePackage(packageJson: MathScenePackageV3) {
  return structuredClone(packageJson);
}

function DeferredNumberInput({
  ariaLabel,
  className = smallFieldClass,
  disabled,
  min,
  onCommit,
  optional = false,
  value
}: {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  min?: number;
  onCommit: (value: number | undefined) => void;
  optional?: boolean;
  value: number | undefined;
}) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value === undefined ? "" : String(value));
  }, [editing, value]);

  function commit() {
    const result = commitTeacherVisualizationNumberDraft(draft, { min, optional });
    setEditing(false);
    if (!result.ok) {
      setDraft(value === undefined ? "" : String(value));
      return;
    }
    setDraft(result.value === undefined ? "" : String(result.value));
    if (!Object.is(result.value, value)) onCommit(result.value);
  }

  return (
    <input
      aria-label={ariaLabel}
      aria-valuemin={min}
      className={className}
      disabled={disabled}
      inputMode="decimal"
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value === undefined ? "" : String(value));
          event.currentTarget.blur();
        }
      }}
      role="spinbutton"
      value={draft}
    />
  );
}

function DeferredCommaListInput({
  disabled,
  onCommit,
  value
}: {
  disabled?: boolean;
  onCommit: (value: string[] | undefined) => void;
  value: string[] | undefined;
}) {
  const committedDraft = value?.join(", ") ?? "";
  const [draft, setDraft] = useState(committedDraft);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(committedDraft);
  }, [committedDraft, editing]);

  function commit() {
    const normalized = normalizeTeacherVisualizationCommaListDraft(draft);
    const normalizedDraft = normalized?.join(", ") ?? "";
    setEditing(false);
    setDraft(normalizedDraft);
    if (normalizedDraft !== committedDraft) onCommit(normalized);
  }

  return (
    <input
      className={smallFieldClass}
      disabled={disabled}
      onBlur={commit}
      onChange={(event) => setDraft(event.target.value)}
      onFocus={() => setEditing(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(committedDraft);
          event.currentTarget.blur();
        }
      }}
      value={draft}
    />
  );
}

function VectorFields({
  value,
  onChange,
  disabled
}: {
  value: Vec3;
  onChange: (value: Vec3) => void;
  disabled?: boolean;
}) {
  return (
    <span className="grid grid-cols-3 gap-1">
      {value.map((coordinate, index) => (
        <DeferredNumberInput
          key={index}
          value={coordinate}
          disabled={disabled}
          ariaLabel={["x", "y", "z"][index]}
          onCommit={(committed) => {
            if (committed === undefined) return;
            const next = [...value] as Vec3;
            next[index] = committed;
            onChange(next);
          }}
          className={smallFieldClass}
        />
      ))}
    </span>
  );
}

function nextObject(packageJson: MathScenePackageV3, type: MathObjectSpec["type"]): MathObjectSpec {
  const suffix = packageJson.scene.objects.length + 1;
  const id = `${type}-${suffix}`;
  const conceptId = `concept-${suffix}`;
  if (type === "axis3d") {
    return {
      type,
      id,
      conceptId,
      range: { x: [-5, 5], y: [-3, 3], z: [-1, 1] }
    };
  }
  if (type === "parametricCurve") {
    return { type, id, conceptId, colorRole: "function", samples: [[-1, 0, 0], [1, 0, 0]] };
  }
  if (type === "parametricSurface") {
    return {
      type,
      id,
      conceptId,
      colorRole: "surface",
      samples: [[[-1, -1, 0], [1, -1, 0]], [[-1, 1, 0], [1, 1, 0]]],
      uRange: [-1, 1],
      vRange: [-1, 1]
    };
  }
  if (type === "movingPoint") {
    const pathObjectId = packageJson.scene.objects.find((object) => object.type === "parametricCurve")?.id ?? "select-path";
    return { type, id, conceptId, colorRole: "probe", pathObjectId };
  }
  if (type === "trace") {
    const sourceObjectId = packageJson.scene.objects.find((object) => object.type === "movingPoint")?.id ?? "select-point";
    return { type, id, sourceObjectId, durationSeconds: 1, colorRole: "trace" };
  }
  return { type: "vector", id, conceptId, colorRole: "vector", from: [0, 0, 0], to: [1, 1, 0] };
}

export function TeacherVisualizationObjectsAndLocalizationEditor({ packageJson, onChange, disabled }: EditorProps) {
  const { t } = useSettings();

  function replaceObject(index: number, object: MathObjectSpec) {
    const next = clonePackage(packageJson);
    next.scene.objects[index] = object;
    onChange(next);
  }

  function addObject(type: MathObjectSpec["type"]) {
    const next = clonePackage(packageJson);
    next.scene.objects.push(nextObject(next, type));
    if (next.scene.diagnostics) next.scene.diagnostics.expectedObjectCount = next.scene.objects.length;
    onChange(next);
  }

  return (
    <div className="grid gap-5" data-authoring-structured-objects>
      <section className="soft-panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Scene objects", zh: "場景物件" })}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t({ en: "Axes, curves, surfaces, points, traces and vectors use the existing MathObjectSpec.", zh: "座標軸、曲線、曲面、點、軌跡與向量沿用現有 MathObjectSpec。" })}
            </p>
          </div>
          <select disabled={disabled} defaultValue="" onChange={(event) => {
            if (event.target.value) addObject(event.target.value as MathObjectSpec["type"]);
            event.currentTarget.value = "";
          }} className={smallFieldClass} aria-label={t({ en: "Add object", zh: "新增物件" })}>
            <option value="">{t({ en: "Add object…", zh: "新增物件…" })}</option>
            {(["axis3d", "parametricCurve", "parametricSurface", "movingPoint", "trace", "vector"] as const).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-3">
          {packageJson.scene.objects.map((object, index) => (
            <article key={`${object.id}-${index}`} className="rounded-2xl border border-slate-200/80 bg-white/65 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  {t({ en: "Type", zh: "類型" })}
                  <input value={object.type} readOnly className={smallFieldClass} />
                </label>
                <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  ID
                  <input value={object.id} readOnly className={smallFieldClass} />
                </label>
                {object.type !== "trace" ? (
                  <label className="grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Concept ID
                    <input disabled={disabled} value={object.conceptId ?? ""} onChange={(event) => replaceObject(index, patchTeacherVisualizationMathObjectConceptId(object, event.target.value))} className={smallFieldClass} />
                  </label>
                ) : <span />}
              </div>
              {"colorRole" in object ? (
                <label className="mt-2 grid gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                  Color role
                  <input disabled={disabled} value={object.colorRole} onChange={(event) => replaceObject(index, { ...object, colorRole: event.target.value })} className={smallFieldClass} />
                </label>
              ) : null}
              {object.type === "axis3d" ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(["x", "y", "z"] as const).map((axis) => (
                    <label key={axis} className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                      {axis} range
                      <span className="grid grid-cols-2 gap-1">
                        {object.range[axis].map((value, rangeIndex) => <DeferredNumberInput key={rangeIndex} disabled={disabled} value={value} onCommit={(committed) => {
                          if (committed === undefined) return;
                          const range = [...object.range[axis]] as [number, number];
                          range[rangeIndex] = committed;
                          replaceObject(index, { ...object, range: { ...object.range, [axis]: range } });
                        }} className={smallFieldClass} />)}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
              {object.type === "parametricCurve" ? <p className="mt-2 text-xs text-slate-500">{object.samples.length} sampled points · preserved as authored</p> : null}
              {object.type === "parametricSurface" ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(["uRange", "vRange"] as const).map((rangeName) => <label key={rangeName} className="grid gap-1 text-[11px] font-black uppercase text-slate-500">{rangeName}<span className="grid grid-cols-2 gap-1">{object[rangeName].map((value, rangeIndex) => <DeferredNumberInput key={rangeIndex} disabled={disabled} value={value} onCommit={(committed) => {
                    if (committed === undefined) return;
                    const range = [...object[rangeName]] as [number, number];
                    range[rangeIndex] = committed;
                    replaceObject(index, { ...object, [rangeName]: range });
                  }} className={smallFieldClass} />)}</span></label>)}
                </div>
              ) : null}
              {object.type === "movingPoint" ? <label className="mt-2 grid gap-1 text-[11px] font-black uppercase text-slate-500">Path object ID<input disabled={disabled} value={object.pathObjectId} onChange={(event) => replaceObject(index, { ...object, pathObjectId: event.target.value })} className={smallFieldClass} /></label> : null}
              {object.type === "trace" ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">Source object ID<input disabled={disabled} value={object.sourceObjectId} onChange={(event) => replaceObject(index, { ...object, sourceObjectId: event.target.value })} className={smallFieldClass} /></label><label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">Duration<DeferredNumberInput disabled={disabled} min={0.001} value={object.durationSeconds} onCommit={(durationSeconds) => { if (durationSeconds !== undefined) replaceObject(index, { ...object, durationSeconds }); }} className={smallFieldClass} /></label></div> : null}
              {object.type === "vector" ? <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">From<VectorFields disabled={disabled} value={object.from} onChange={(from) => replaceObject(index, { ...object, from })} /></label><label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">To<VectorFields disabled={disabled} value={object.to} onChange={(to) => replaceObject(index, { ...object, to })} /></label></div> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="soft-panel p-4">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Formula tokens and bindings", zh: "公式 token 與對應關係" })}</h3>
        <div className="mt-3 grid gap-3">
          {packageJson.scene.formulas.map((formula, formulaIndex) => (
            <article key={formula.id} className="rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
              <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">LaTeX<input disabled={disabled} value={formula.latex} onChange={(event) => {
                const next = clonePackage(packageJson);
                next.scene.formulas[formulaIndex] = { ...formula, latex: event.target.value };
                onChange(next);
              }} className={fieldClass} /></label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {formula.tokens.map((token, tokenIndex) => <label key={token.id} className="grid gap-1 text-[11px] font-black uppercase text-slate-500">{token.id}<input disabled={disabled} value={token.text} onChange={(event) => {
                  const next = clonePackage(packageJson);
                  next.scene.formulas[formulaIndex]!.tokens[tokenIndex] = { ...token, text: event.target.value };
                  onChange(next);
                }} className={smallFieldClass} /></label>)}
              </div>
            </article>
          ))}
          {packageJson.scene.bindings.map((binding, index) => (
            <div key={`${binding.formulaId}-${binding.tokenId}-${index}`} className="grid gap-2 rounded-2xl border border-slate-200/80 p-3 text-xs dark:border-white/10 sm:grid-cols-4">
              {(["conceptId", "formulaId", "objectId", "tokenId"] as const).map((field) => <label key={field} className="grid gap-1 font-black uppercase text-slate-500">{field}<input disabled={disabled} value={binding[field]} onChange={(event) => {
                const next = clonePackage(packageJson);
                next.scene.bindings[index] = { ...binding, [field]: event.target.value };
                onChange(next);
              }} className={smallFieldClass} /></label>)}
            </div>
          ))}
        </div>
      </section>

      <section className="soft-panel p-4">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Trilingual object labels", zh: "中英繁簡物件標籤" })}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[680px] w-full border-separate border-spacing-y-2 text-left text-xs">
            <thead className="text-slate-500"><tr><th className="px-2">Concept ID</th><th className="px-2">English</th><th className="px-2">繁體中文</th><th className="px-2">简体中文</th></tr></thead>
            <tbody>{Object.entries(packageJson.localization.labels).map(([conceptId, label]) => <tr key={conceptId}><th className="px-2 font-black text-slate-700 dark:text-slate-200">{conceptId}</th>{(["en", "zh", "zhHans"] as const).map((locale) => <td key={locale} className="px-2"><input disabled={disabled} lang={locale === "zh" ? "zh-Hant" : locale === "zhHans" ? "zh-Hans" : "en"} value={label[locale]} onChange={(event) => {
              const next = clonePackage(packageJson);
              next.localization.labels[conceptId]![locale] = event.target.value;
              onChange(next);
            }} className={smallFieldClass} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const animationTypes = [
  "animationComposition", "animateTracker", "sweepParameter", "revealCurve", "revealSurface",
  "fadeInObject", "fadeOutObject", "growFromCenter", "moveAlongPath", "transformObject", "highlight", "cameraTo", "wait"
] as const satisfies readonly AnimationStep["type"][];

function AnimationStepFields({
  disabled,
  onChange,
  step
}: {
  disabled?: boolean;
  onChange: (step: AnimationStep) => void;
  step: AnimationStep;
}) {
  const arcPath = step.type === "transformObject" && step.path?.type === "arc"
    ? step.path
    : null;

  function patch(values: Record<string, unknown>) {
    onChange(patchTeacherVisualizationAnimationStep(step, values));
  }

  function textField(label: string, field: string, value: string | undefined, optional = false) {
    return (
      <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
        {label}
        <input
          disabled={disabled}
          value={value ?? ""}
          onChange={(event) => patch({
            [field]: optional && event.target.value === "" ? undefined : event.target.value
          })}
          className={smallFieldClass}
        />
      </label>
    );
  }

  function numberField(
    label: string,
    field: string,
    value: number | undefined,
    optional = false,
    min?: number
  ) {
    return (
      <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
        {label}
        <DeferredNumberInput
          disabled={disabled}
          min={min}
          value={value}
          optional={optional}
          onCommit={(committed) => patch({ [field]: committed })}
          className={smallFieldClass}
        />
      </label>
    );
  }

  function optionalBooleanField(label: string, field: string, value: boolean | undefined) {
    return (
      <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
        {label}
        <select
          disabled={disabled}
          value={value === undefined ? "" : String(value)}
          onChange={(event) => patch({
            [field]: event.target.value === "" ? undefined : event.target.value === "true"
          })}
          className={smallFieldClass}
        >
          <option value="">unset</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      </label>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {numberField("Duration", "duration", step.duration, false, 0.001)}
      {"compositionId" in step ? textField("Composition ID", "compositionId", step.compositionId) : null}
      {"trackerId" in step ? textField("Tracker ID", "trackerId", step.trackerId) : null}
      {"targetValue" in step ? numberField("Target value", "targetValue", step.targetValue) : null}
      {"easing" in step ? (
        <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
          Easing
          <select
            disabled={disabled}
            value={step.easing}
            onChange={(event) => patch({ easing: event.target.value as "linear" | "smooth" })}
            className={smallFieldClass}
          >
            <option value="linear">linear</option>
            <option value="smooth">smooth</option>
          </select>
        </label>
      ) : null}
      {"objectId" in step ? textField("Object ID", "objectId", step.objectId) : null}
      {"pathObjectId" in step ? textField("Path object ID", "pathObjectId", step.pathObjectId) : null}
      {"targetObjectId" in step ? textField("Target object ID", "targetObjectId", step.targetObjectId) : null}
      {"conceptId" in step
        ? textField("Concept ID", "conceptId", step.conceptId, step.type === "sweepParameter")
        : null}
      {"shotId" in step ? textField("Shot ID", "shotId", step.shotId) : null}

      {step.type === "sweepParameter" ? (
        <>
          {numberField("From value", "fromValue", step.fromValue, true)}
          <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500 sm:col-span-2">
            Formula token IDs · comma separated
            <DeferredCommaListInput
              disabled={disabled}
              value={step.formulaTokenIds}
              onCommit={(formulaTokenIds) => patch({ formulaTokenIds })}
            />
          </label>
        </>
      ) : null}

      {step.type === "transformObject" ? (
        <>
          {numberField("Lag ratio", "lagRatio", step.lagRatio, true, 0)}
          <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
            Path
            <select
              disabled={disabled}
              value={step.path?.type ?? ""}
              onChange={(event) => {
                if (event.target.value === "") patch({ path: undefined });
                else if (event.target.value === "straight") patch({ path: { type: "straight" } });
                else patch({
                  path: step.path?.type === "arc"
                    ? step.path
                    : { type: "arc", angleRadians: 0, axis: [0, 0, 1] }
                });
              }}
              className={smallFieldClass}
            >
              <option value="">default straight</option>
              <option value="straight">straight</option>
              <option value="arc">arc</option>
            </select>
          </label>
          {arcPath ? (
            <>
              <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                Arc angle radians
                <DeferredNumberInput
                  disabled={disabled}
                  value={arcPath.angleRadians}
                  onCommit={(angleRadians) => angleRadians === undefined ? undefined : patch({
                    path: {
                      ...arcPath,
                      angleRadians
                    }
                  })}
                  className={smallFieldClass}
                />
              </label>
              <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500 sm:col-span-2">
                Path axis
                <VectorFields
                  disabled={disabled}
                  value={arcPath.axis ?? [0, 0, 1]}
                  onChange={(axis) => patch({ path: { ...arcPath, axis } })}
                />
              </label>
              {arcPath.axis ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const { axis: _axis, ...path } = arcPath;
                    patch({ path });
                  }}
                  className={smallFieldClass}
                >
                  Use default z axis
                </button>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {step.type === "wait" ? (
        <>
          {optionalBooleanField("Hold on wait", "holdOnWait", step.holdOnWait)}
          {optionalBooleanField("Ignore presenter mode", "ignorePresenterMode", step.ignorePresenterMode)}
          {numberField("Max time", "maxTime", step.maxTime, true, 0)}
          {textField("Note", "note", step.note, true)}
          {optionalBooleanField("Presenter mode", "presenterMode", step.presenterMode)}
          {numberField(
            "Presenter release after frames",
            "presenterReleaseAfterFrames",
            step.presenterReleaseAfterFrames,
            true,
            0
          )}
          {textField("Stop condition ID", "stopConditionId", step.stopConditionId, true)}
          {numberField(
            "Stop condition satisfied at",
            "stopConditionSatisfiedAt",
            step.stopConditionSatisfiedAt,
            true,
            0
          )}
        </>
      ) : null}
    </div>
  );
}

export function TeacherVisualizationTimelineAndCaptionEditor({ packageJson, onChange, disabled }: EditorProps) {
  const { t } = useSettings();

  function replaceStep(index: number, step: AnimationStep) {
    const next = clonePackage(packageJson);
    next.scene.timeline[index] = step;
    onChange(next);
  }

  return (
    <div className="grid gap-5" data-authoring-timeline-captions>
      <section className="soft-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Animation beats", zh: "動畫節拍" })}</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t({ en: "Each beat should carry one cognitive action.", zh: "每個節拍只承擔一個認知動作。" })}</p></div>
          <select disabled={disabled} defaultValue="" onChange={(event) => {
            if (!event.target.value) return;
            const next = clonePackage(packageJson);
            next.scene.timeline.push(createTeacherVisualizationAnimationStep(
              event.target.value as AnimationStep["type"],
              next
            ));
            onChange(next);
            event.currentTarget.value = "";
          }} className={smallFieldClass}><option value="">{t({ en: "Add beat…", zh: "新增節拍…" })}</option>{animationTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
        </div>
        <div className="mt-4 grid gap-2">
          {packageJson.scene.timeline.map((step, index) => {
            const typeSwitch = analyzeTeacherVisualizationAnimationTypeSwitch(step, index);
            return (
              <article key={`${step.type}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
                <div className="grid gap-2 sm:grid-cols-[72px_220px_minmax(0,1fr)] sm:items-end">
                  <span className="text-xs font-black text-cyan-700 dark:text-cyan-200">Beat {index + 1}</span>
                  <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                    Type
                    <select
                      disabled={disabled || !typeSwitch.allowed}
                      value={step.type}
                      title={typeSwitch.allowed ? undefined : "A06_EXTENSION_REQUIRED"}
                      onChange={(event) => replaceStep(
                        index,
                        createTeacherVisualizationAnimationStep(
                          event.target.value as AnimationStep["type"],
                          packageJson,
                          step.duration
                        )
                      )}
                      className={smallFieldClass}
                    >
                      {animationTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  {typeSwitch.handoffs.length ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-2 text-[11px] font-bold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/[0.07] dark:text-amber-100">
                      <p className="font-black">A06_EXTENSION_REQUIRED · type switch disabled</p>
                      <ul className="mt-1 grid gap-1">
                        {typeSwitch.handoffs.map((handoff) => (
                          <li key={handoff.path}><code>{handoff.path}</code></li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">This wait beat has no incompatible fields and may switch safely.</p>
                  )}
                </div>
                <AnimationStepFields
                  disabled={disabled}
                  step={step}
                  onChange={(nextStep) => replaceStep(index, nextStep)}
                />
              </article>
            );
          })}
        </div>
      </section>

      <section className="soft-panel p-4">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Camera and parameters", zh: "相機與參數" })}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {packageJson.scene.cameraShots.map((shot, shotIndex) => <article key={shot.id} className="rounded-2xl border border-slate-200/80 p-3 dark:border-white/10"><p className="text-xs font-black text-slate-700 dark:text-slate-200">{shot.id}</p><div className="mt-2 grid gap-2"><label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">Position<VectorFields disabled={disabled} value={shot.position} onChange={(position) => { const next = clonePackage(packageJson); next.scene.cameraShots[shotIndex] = { ...shot, position }; onChange(next); }} /></label><label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">Target<VectorFields disabled={disabled} value={shot.target} onChange={(target) => { const next = clonePackage(packageJson); next.scene.cameraShots[shotIndex] = { ...shot, target }; onChange(next); }} /></label></div></article>)}
          {(packageJson.scene.parameters ?? []).map((parameter, index) => <label key={parameter.id} className="grid gap-1 rounded-2xl border border-slate-200/80 p-3 text-[11px] font-black uppercase text-slate-500 dark:border-white/10">{parameter.label}<DeferredNumberInput disabled={disabled} value={parameter.value} onCommit={(value) => { if (value === undefined) return; const next = clonePackage(packageJson); next.scene.parameters![index] = { ...parameter, value }; onChange(next); }} className={smallFieldClass} /></label>)}
        </div>
      </section>

      <section className="soft-panel p-4">
        <h3 className="text-sm font-black text-slate-950 dark:text-white">{t({ en: "Trilingual captions", zh: "中英繁簡字幕" })}</h3>
        <div className="mt-3 grid gap-3">
          {packageJson.captions.map((cue, index) => (
            <article key={`${cue.beatId}-${index}`} className="rounded-2xl border border-slate-200/80 p-3 dark:border-white/10">
              <div className="grid gap-2 sm:grid-cols-5">
                <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                  Beat
                  <select
                    disabled={disabled}
                    value={cue.beatIndex}
                    onChange={(event) => {
                      const beatIndex = event.target.selectedIndex;
                      const next = clonePackage(packageJson);
                      next.captions[index] = {
                        ...cue,
                        beatIndex,
                        beatId: canonicalMathSceneBeatId(beatIndex)
                      };
                      onChange(next);
                    }}
                    className={smallFieldClass}
                  >
                    {packageJson.scene.timeline.map((_step, beatIndex) => (
                      <option key={beatIndex} value={beatIndex}>
                        Beat {beatIndex + 1} · {canonicalMathSceneBeatId(beatIndex)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                  Beat ID
                  <input value={cue.beatId} readOnly className={smallFieldClass} />
                </label>
                <label className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                  Concept ID
                  <input disabled={disabled} value={cue.conceptId} onChange={(event) => {
                    const next = clonePackage(packageJson);
                    next.captions[index] = { ...cue, conceptId: event.target.value };
                    onChange(next);
                  }} className={smallFieldClass} />
                </label>
                {(["startSeconds", "endSeconds"] as const).map((field) => (
                  <label key={field} className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                    {field}
                    <DeferredNumberInput disabled={disabled} min={0} value={cue[field]} onCommit={(value) => {
                      if (value === undefined) return;
                      const next = clonePackage(packageJson);
                      next.captions[index] = {
                        ...cue,
                        [field]: value
                      };
                      onChange(next);
                    }} className={smallFieldClass} />
                  </label>
                ))}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(["en", "zh", "zhHans"] as const).map((locale) => (
                  <label key={locale} className="grid gap-1 text-[11px] font-black uppercase text-slate-500">
                    {locale}
                    <textarea disabled={disabled} lang={locale === "zh" ? "zh-Hant" : locale === "zhHans" ? "zh-Hans" : "en"} rows={2} value={cue.text[locale]} onChange={(event) => {
                      const next = clonePackage(packageJson);
                      next.captions[index]!.text[locale] = event.target.value;
                      onChange(next);
                    }} className={fieldClass} />
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
