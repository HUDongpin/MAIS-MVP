import { MANIM_DEFAULT_BACKGROUND_COLOR } from "./mathSceneRenderQuality";

export const MATH_SCENE_VISUAL_PALETTE_SOURCE_CONTRACT =
  "MANIM_DEFAULT_BACKGROUND_COLOR->render-quality bridge/Canvas|MathSceneRuntime role/axis/line palette";

export const mathSceneVisualRoleIds = [
  "function",
  "probe",
  "trace",
  "surface",
  "surface-grid",
  "attention",
  "area",
  "parameter",
  "reference",
  "default"
] as const;

export type MathSceneVisualRole = (typeof mathSceneVisualRoleIds)[number];

export const mathSceneVisualPalette = {
  background: {
    alpha: 1,
    color: MANIM_DEFAULT_BACKGROUND_COLOR
  },
  renderer: {
    // Preserve authored sRGB role colors in the terminal framebuffer. The
    // educational contrast contract composites alpha explicitly, so a global
    // renderer tone curve must not silently remap those source colors.
    toneMapped: false
  },
  roles: {
    area: "#34d399",
    attention: "#fb7185",
    default: "#e0f2fe",
    function: "accent",
    parameter: "#c084fc",
    probe: "#facc15",
    reference: "#94a3b8",
    surface: "#38bdf8",
    "surface-grid": "#bae6fd",
    trace: "#22d3ee"
  },
  axes: {
    x: {
      color: "#38bdf8",
      lineWidth: 3,
      opacity: 1
    },
    y: {
      color: "#e0f2fe",
      lineWidth: 2,
      opacity: 1
    },
    z: {
      color: "#f472b6",
      lineWidth: 3,
      opacity: 1
    }
  },
  lines: {
    curve: {
      lineWidth: 5,
      opacity: 1
    },
    surfaceColumn: {
      lineWidth: 1.4,
      opacity: 0.42
    },
    surfaceRow: {
      lineWidth: 2,
      opacity: 0.7
    },
    trace: {
      lineWidth: 3,
      opacity: 0.55
    },
    vector: {
      lineWidth: 5,
      opacity: 1
    }
  },
  points: {
    moving: {
      radius: 0.11,
      widthSegments: 24,
      heightSegments: 16
    },
    indication: {
      widthSegments: 32,
      heightSegments: 16
    }
  }
} as const;

export function mathSceneColorForRole(role: string, accent: string) {
  const color = mathSceneVisualPalette.roles[role as MathSceneVisualRole];
  if (color === "accent") return accent;
  return color ?? mathSceneVisualPalette.roles.default;
}
