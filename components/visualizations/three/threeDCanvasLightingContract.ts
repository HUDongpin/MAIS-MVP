export type ThreeDCanvasDirectionalLight = {
  color: string;
  intensity: number;
  name: string;
  position: [number, number, number];
};

export const threeDCanvasLightingContract: {
  ambient: {
    intensity: number;
  };
  directional: ThreeDCanvasDirectionalLight[];
} = {
  ambient: {
    intensity: 0.72
  },
  directional: [
    {
      color: "#fff7cc",
      intensity: 2.1,
      name: "warm-key",
      position: [4, 6, 4]
    },
    {
      color: "#67e8f9",
      intensity: 0.65,
      name: "cyan-fill",
      position: [-4, 3, -3]
    }
  ]
};
