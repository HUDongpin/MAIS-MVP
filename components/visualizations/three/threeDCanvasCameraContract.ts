export const threeDCanvasCameraContract = {
  cameraTarget: {
    x: 0,
    y: 0.42,
    z: 0
  },
  defaultCamera: {
    azimuthDegrees: 45,
    distance: 4.8,
    elevationDegrees: 35,
    far: 100,
    fov: 42,
    near: 0.1
  },
  orbitBounds: {
    enableDamping: false,
    enablePan: false,
    maxDistance: 9,
    maxPolarAngleDegrees: 78,
    minDistance: 2.8,
    minPolarAngleDegrees: 18
  }
} as const;

export type ThreeDCanvasCameraState = {
  azimuthDegrees: number;
  distance: number;
  elevationDegrees: number;
};

export function formatThreeDCanvasCameraState({ azimuthDegrees, distance, elevationDegrees }: ThreeDCanvasCameraState) {
  return `azimuth=${azimuthDegrees.toFixed(2)};elevation=${elevationDegrees.toFixed(2)};distance=${distance.toFixed(2)}`;
}
