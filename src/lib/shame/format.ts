/** "1 shame", "3 shames". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** Axis ticks from 0 up to a whole number at or above `max`, in about 4 whole steps. */
export function niceTicks(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 4))
  const ticks: number[] = []
  for (let t = 0; t < max + step; t += step) ticks.push(t)
  return ticks
}
