export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "—";
  const rounded = round(value, decimals);
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleAt(
  point: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) {
  const v1 = { x: p1.x - point.x, y: p1.y - point.y };
  const v2 = { x: p2.x - point.x, y: p2.y - point.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (mag === 0) return 0;
  return Math.acos(clamp(dot / mag, -1, 1)) * (180 / Math.PI);
}

export function quadraticRoots(a: number, b: number, c: number) {
  if (Math.abs(a) < 0.0001) {
    if (Math.abs(b) < 0.0001) return [];
    return [-c / b];
  }
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  if (Math.abs(discriminant) < 0.0001) return [-b / (2 * a)];
  const sqrt = Math.sqrt(discriminant);
  return [(-b - sqrt) / (2 * a), (-b + sqrt) / (2 * a)];
}
