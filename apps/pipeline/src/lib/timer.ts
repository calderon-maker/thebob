export interface Timing {
  label: string;
  durationMs: number;
  startedAt: string;
  finishedAt: string;
}

export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; timing: Timing }> {
  const startedAt = new Date();
  const t0 = performance.now();
  const result = await fn();
  const t1 = performance.now();
  const finishedAt = new Date();
  return {
    result,
    timing: {
      label,
      durationMs: Math.round(t1 - t0),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    },
  };
}
