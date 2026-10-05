export function effectiveMastery(score: number, lastRated: number | null, now = Date.now()): number {
  const periods = lastRated === null ? 0 : Math.max(0, Math.floor((now - lastRated) / (30 * 86400000)));
  return Math.max(0, Math.min(5, score) - periods);
}
