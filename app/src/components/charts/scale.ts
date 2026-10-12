/** A "nice" y-domain and ticks for nets, clamped to [0, max]. */
export function niceDomain(values: number[], max: number, targetTicks = 4): { min: number; max: number; ticks: number[] } {
  if (!values.length) return { min: 0, max, ticks: [0, max] };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, max * 0.1, 4);
  const rawStep = span / (targetTicks - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? 10 * magnitude;
  const dMin = Math.max(0, Math.floor((lo - step / 2) / step) * step);
  const dMax = Math.min(max, Math.ceil((hi + step / 2) / step) * step);
  const ticks: number[] = [];
  for (let v = dMin; v <= dMax + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min: dMin, max: Math.max(dMax, dMin + step), ticks };
}
