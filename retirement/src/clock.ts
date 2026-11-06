/*
 * The world's clock: one in-game day every DAY_MS (a game hour is a real minute), worked out
 * from the timestamp so every player shares the same time of day.
 */
export const DAY_MS = 24 * 60_000
export const HOUR_MS = DAY_MS / 24

export function gameHour(now: number): number {
  return ((now % DAY_MS) / DAY_MS) * 24
}
