import { addDays, toDateKey } from "../lib/dates.js";

const CACHE_TTL_MS = 60_000;

/**
 * Streak cache. This is process-local on purpose for the exercise.
 * It does not survive a restart and is not shared between instances.
 * The architecture doc describes a Redis cache; that is the intended
 * production design, not the current implementation.
 */
const streakCache = new Map<string, { value: number; expiresAt: number }>();

export function calculateStreak(completionDates: string[], today = new Date()): number {
  if (completionDates.length === 0) return 0;

  const uniqueDates = new Set(completionDates);
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(addDays(today, -1));

  let cursor: Date;
  if (uniqueDates.has(todayKey)) {
    cursor = new Date(today);
  } else if (uniqueDates.has(yesterdayKey)) {
    cursor = addDays(today, -1);
  } else {
    return 0;
  }

  let streak = 0;
  while (uniqueDates.has(toDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function getCachedStreak(
  userId: string,
  habitId: string,
  completionDates: string[],
  today = new Date()
): number {
  const key = `${userId}:${habitId}:${toDateKey(today)}`;
  const cached = streakCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = calculateStreak(completionDates, today);
  streakCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function clearStreakCache(): void {
  streakCache.clear();
}
