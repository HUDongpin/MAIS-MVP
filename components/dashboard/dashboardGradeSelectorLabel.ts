import type { LocalizedText } from "@/types";

/**
 * Accessible group name for the dashboard grade tiles.
 *
 * A student's grade is fixed by enrolment, so every tile in the group renders
 * `disabled`/`aria-disabled`. Announcing that group as "Select grade" tells
 * assistive tech the opposite of what the control does — the group offers no
 * selectable option at all. `components/ui/GradeSelector.tsx` already makes this
 * distinction; this keeps the dashboard grid's copy identical to it.
 */
export function dashboardGradeSelectorGroupLabel(locked: boolean): LocalizedText {
  return locked
    ? { en: "Fixed grade", zh: "固定年級", zhHans: "固定年级" }
    : { en: "Select grade", zh: "選擇年級", zhHans: "选择年级" };
}
