// Lumi's flight path (design spec 6.4): one cubic bezier from where it is (P0) to where it
// goes (P3), with both inner handles lifted by L, so the path is a soft arc. One progress
// `p` (0 → 1) drives position, bank, bob and the trail, on the UI thread.

export interface Pt {
  x: number;
  y: number;
}

/** The arc height for a flight: min(0.35 · distance, 200) (layout.companion.arcLift / arcLiftMax). */
export function arcLift(from: Pt, to: Pt, share: number, max: number): number {
  return Math.min(share * Math.hypot(to.x - from.x, to.y - from.y), max);
}

/** Flight duration: clamp(distance × msPerPt, min, max). */
export function flightMs(from: Pt, to: Pt, t: { msPerPt: number; flightMin: number; flightMax: number }): number {
  const d = Math.hypot(to.x - from.x, to.y - from.y);
  return Math.min(t.flightMax, Math.max(t.flightMin, d * t.msPerPt));
}

/** A point on the arc at progress p: P1 = P0 + (0.3·dx, −L), P2 = P3 + (−0.3·dx, −L). */
export function arcPoint(p: number, fx: number, fy: number, tx: number, ty: number, lift: number): Pt {
  'worklet';
  const q = Math.min(1, Math.max(0, p));
  const dx = tx - fx;
  const x1 = fx + 0.3 * dx;
  const y1 = fy - lift;
  const x2 = tx - 0.3 * dx;
  const y2 = ty - lift;
  const u = 1 - q;
  const a = u * u * u;
  const b = 3 * u * u * q;
  const c = 3 * u * q * q;
  const d = q * q * q;
  return { x: a * fx + b * x1 + c * x2 + d * tx, y: a * fy + b * y1 + c * y2 + d * ty };
}

/** The arc's direction at progress p (not normalized). */
export function arcVelocity(p: number, fx: number, fy: number, tx: number, ty: number, lift: number): Pt {
  'worklet';
  const q = Math.min(1, Math.max(0, p));
  const dx = tx - fx;
  const x1 = fx + 0.3 * dx;
  const y1 = fy - lift;
  const x2 = tx - 0.3 * dx;
  const y2 = ty - lift;
  const u = 1 - q;
  return {
    x: 3 * u * u * (x1 - fx) + 6 * u * q * (x2 - x1) + 3 * q * q * (tx - x2),
    y: 3 * u * u * (y1 - fy) + 6 * u * q * (y2 - y1) + 3 * q * q * (ty - y2),
  };
}

/**
 * Bank (degrees): the horizontal share of the velocity × max, eased in and out with the
 * flight so take-off and touch-down are upright.
 */
export function bankDeg(p: number, fx: number, fy: number, tx: number, ty: number, lift: number, maxDeg: number): number {
  'worklet';
  const v = arcVelocity(p, fx, fy, tx, ty, lift);
  const len = Math.hypot(v.x, v.y);
  if (len < 0.001) return 0;
  const raw = (v.x / len) * maxDeg;
  return Math.max(-maxDeg, Math.min(maxDeg, raw)) * Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
}
