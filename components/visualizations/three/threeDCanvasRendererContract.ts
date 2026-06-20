export const threeDCanvasRendererContract = {
  backgroundColor: "#0b1420",
  devicePixelRatioRange: [1, 2] as [number, number],
  gl: {
    antialias: true,
    preserveDrawingBuffer: true
  },
  renderer: "three-r3f"
} as const;
