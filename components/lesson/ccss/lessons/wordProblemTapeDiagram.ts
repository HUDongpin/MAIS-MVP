export type WordProblemTapeSegment = {
  id: "start" | "added" | "stayed" | "flew-away" | "landed";
  label: string;
  value: number;
};

export type WordProblemTapeStage = {
  ariaLabel: string;
  equation: string;
  id: "one-step" | "step-1" | "step-2";
  label: string;
  segments: WordProblemTapeSegment[];
  total: number;
};

type WordProblemTapeDiagramInput = {
  added: number;
  landed: number;
  start: number;
  twoStep: boolean;
};

export type WordProblemStoryState = {
  changed: number;
  landed: number;
  start: number;
  twoStep: boolean;
};

export type WordProblemStoryAction =
  | { type: "set-changed"; value: number }
  | { type: "set-landed"; value: number }
  | { type: "set-mode"; twoStep: boolean }
  | { type: "set-start"; value: number };

export type WordProblemStoryControlLimits = {
  changedMax: number;
  changedMin: number;
  landedMax: number;
  landedMin: number;
  startMax: number;
  startMin: number;
};

export type WordProblemTapeDiagram = {
  answer: number;
  equation: string;
  removed: number;
  scaleTotal: number;
  stages: WordProblemTapeStage[];
};

const startMin = 10;
const startMax = 80;
const changedMin = 1;
const oneStepChangedMax = 40;
const landedMin = 1;
const landedMax = 40;

function clampInteger(value: number, minimum: number, maximum: number) {
  const finiteValue = Number.isFinite(value) ? Math.round(value) : minimum;
  return Math.min(maximum, Math.max(minimum, finiteValue));
}

export function wordProblemStoryControlLimits(
  story: WordProblemStoryState
): WordProblemStoryControlLimits {
  const boundedStart = clampInteger(story.start, startMin, startMax);
  const currentChangedMax = story.twoStep
    ? boundedStart
    : Math.min(oneStepChangedMax, 100 - boundedStart);
  const boundedChanged = clampInteger(
    story.changed,
    changedMin,
    Math.max(changedMin, currentChangedMax)
  );
  const retained = boundedStart - boundedChanged;

  return {
    changedMax: Math.max(changedMin, currentChangedMax),
    changedMin,
    landedMax: story.twoStep
      ? Math.max(landedMin, Math.min(landedMax, 100 - retained))
      : landedMax,
    landedMin,
    startMax,
    startMin
  };
}

function normalizeWordProblemStoryState(
  candidate: WordProblemStoryState
): WordProblemStoryState {
  const start = clampInteger(candidate.start, startMin, startMax);
  const limitsBeforeChanged = wordProblemStoryControlLimits({
    ...candidate,
    start
  });
  const changed = clampInteger(
    candidate.changed,
    limitsBeforeChanged.changedMin,
    limitsBeforeChanged.changedMax
  );
  const limits = wordProblemStoryControlLimits({
    ...candidate,
    changed,
    start
  });

  return {
    changed,
    landed: clampInteger(candidate.landed, limits.landedMin, limits.landedMax),
    start,
    twoStep: candidate.twoStep
  };
}

export function updateWordProblemStoryState(
  current: WordProblemStoryState,
  action: WordProblemStoryAction
): WordProblemStoryState {
  if (action.type === "set-mode") {
    return normalizeWordProblemStoryState({ ...current, twoStep: action.twoStep });
  }
  if (action.type === "set-start") {
    return normalizeWordProblemStoryState({ ...current, start: action.value });
  }
  if (action.type === "set-changed") {
    return normalizeWordProblemStoryState({ ...current, changed: action.value });
  }
  return normalizeWordProblemStoryState({ ...current, landed: action.value });
}

export function buildWordProblemTapeDiagram({
  added,
  landed,
  start,
  twoStep
}: WordProblemTapeDiagramInput): WordProblemTapeDiagram {
  if (!twoStep) {
    const answer = start + added;
    return {
      answer,
      equation: `${start} + ${added} = ${answer}`,
      removed: 0,
      scaleTotal: answer,
      stages: [
        {
          ariaLabel: `One-step tape diagram: ${answer} books split into ${start} at the start and ${added} added.`,
          equation: `${start} + ${added} = ${answer}`,
          id: "one-step",
          label: `One step · ${answer} books total`,
          segments: [
            { id: "start", label: "at the start", value: start },
            { id: "added", label: "added", value: added }
          ],
          total: answer
        }
      ]
    };
  }

  const removed = Math.min(added, start);
  const stayed = start - removed;
  const answer = stayed + landed;
  const stages: WordProblemTapeStage[] = [
    {
      ariaLabel: `Step 1 tape diagram: ${start} birds split into ${stayed} stayed and ${removed} flew away.`,
      equation: `${start} − ${removed} = ${stayed}`,
      id: "step-1",
      label: `Step 1 · ${start} birds before`,
      segments: [
        { id: "stayed", label: "stayed", value: stayed },
        { id: "flew-away", label: "flew away", value: removed }
      ],
      total: start
    },
    {
      ariaLabel: `Step 2 tape diagram: ${answer} birds split into ${stayed} stayed and ${landed} landed.`,
      equation: `${stayed} + ${landed} = ${answer}`,
      id: "step-2",
      label: `Step 2 · ${answer} birds now`,
      segments: [
        { id: "stayed", label: "stayed", value: stayed },
        { id: "landed", label: "landed", value: landed }
      ],
      total: answer
    }
  ];

  return {
    answer,
    equation: `${start} − ${removed} + ${landed} = ${answer}`,
    removed,
    scaleTotal: Math.max(...stages.map((stage) => stage.total)),
    stages
  };
}
