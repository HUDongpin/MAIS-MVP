import type { VisualizationTemplateId } from "../visualizationTemplateIds";
import type { ThreeDFamilyId } from "./threeDSceneTypes";

export function formulaForThreeDScene(familyId: ThreeDFamilyId, templateId: VisualizationTemplateId) {
  if (familyId === "three-solid-nets-folding") return "$V = lwh$";
  if (familyId === "three-cross-section-slicer") return "$A_{slice}$";
  if (familyId === "three-space-vectors-lines-planes") return "$\\\\vec n \\\\cdot (\\\\vec r - \\\\vec r_0)=0$";
  if (familyId === "three-conic-sections-deep") return "$Ax^2+Bxy+Cy^2+Dx+Ey+F=0$";
  if (familyId === "three-optimization-modeling") return "$\\\\nabla f=0$";
  if (familyId === "three-statistical-inference-lab") return "$\\\\bar{x} \\\\pm z^*SE$";
  if (familyId === "three-curriculum-crosswalk-map") return "$topic \\\\rightarrow representation$";
  if (familyId === "three-exam-strategy-capstone") return "$strategy \\\\rightarrow score$";
  if (familyId === "three-coordinate-transform") return "$T(x,y)=(x',y')$";
  if (templateId === "vector-conic-3d/strategy-map") return "$z = h(1 - x^2 - y^2)$";
  if (templateId === "trig-unit-wave") return "$y = a\\\\sin(bx+c)$";
  if (templateId === "calculus-rate-area") return "$dy/dx$";
  if (templateId.includes("function")) return "$f(x)$";
  if (templateId === "statistics-distribution") return "$\\\\bar{x} \\\\pm s$";
  return "$model \\\\leftrightarrow value$";
}
