export type MainlandPhysicalCommitLearningEvent =
  | "visualization-probe"
  | "visualization-reset"
  | "visualization-slider";

export type MainlandPhysicalCommitRecorder = (
  type: MainlandPhysicalCommitLearningEvent
) => void;

type MainlandPhysicalCommitKeyModifiers = {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

const rangeCommitKeys = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown"
]);

export function createMainlandPhysicalCommitHandlers(
  record?: MainlandPhysicalCommitRecorder
) {
  return {
    recordModeCommit() {
      record?.("visualization-probe");
    },
    recordRangeCommit() {
      record?.("visualization-slider");
    },
    recordRangeKeyCommit(
      key: string,
      modifiers: MainlandPhysicalCommitKeyModifiers = {}
    ) {
      if (
        modifiers.altKey ||
        modifiers.ctrlKey ||
        modifiers.metaKey ||
        modifiers.shiftKey ||
        !rangeCommitKeys.has(key)
      ) return;
      record?.("visualization-slider");
    },
    recordResetCommit() {
      record?.("visualization-reset");
    }
  } as const;
}
