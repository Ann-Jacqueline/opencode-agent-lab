import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import { toDateKey } from "../lib/dates.js";
import type { Habit } from "../types.js";
import { getCachedStreak } from "./streak.js";

interface HabitRow {
  id: string;
  user_id: string;
  name: string;
  cadence: "daily" | "weekly";
  created_at: string;
}

function mapHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    cadence: row.cadence,
    createdAt: row.created_at
  };
}

export function listHabits(userId: string): Habit[] {
  const rows = db
    .prepare("SELECT id, user_id, name, cadence, created_at FROM habits WHERE user_id = ? ORDER BY created_at ASC")
    .all(userId) as HabitRow[];
  return rows.map(mapHabit);
}

export function getHabit(userId: string, habitId: string): Habit | null {
  const row = db
    .prepare("SELECT id, user_id, name, cadence, created_at FROM habits WHERE id = ? AND user_id = ?")
    .get(habitId, userId) as HabitRow | undefined;
  return row ? mapHabit(row) : null;
}

export function createHabit(userId: string, input: { name: string; cadence: "daily" | "weekly" }): Habit {
  const id = randomUUID();
  db.prepare("INSERT INTO habits (id, user_id, name, cadence) VALUES (?, ?, ?, ?)").run(
    id,
    userId,
    input.name,
    input.cadence
  );
  const habit = getHabit(userId, id);
  if (!habit) {
    throw new Error("Habit was inserted but could not be read back.");
  }
  return habit;
}

export interface CompletionResult {
  habit: Habit;
  date: string;
  streak: number;
}

export function completeHabit(userId: string, habitId: string, date = new Date()): CompletionResult | null {
  const habit = getHabit(userId, habitId);
  if (!habit) return null;

  const dateKey = toDateKey(date);
  db.prepare("INSERT OR IGNORE INTO completions (id, habit_id, date) VALUES (?, ?, ?)").run(
    randomUUID(),
    habitId,
    dateKey
  );

  const dates = db
    .prepare("SELECT date FROM completions WHERE habit_id = ? ORDER BY date DESC")
    .all(habitId)
    .map((row) => (row as { date: string }).date);

  return {
    habit,
    date: dateKey,
    streak: getCachedStreak(userId, habitId, dates, date)
  };
}

export function listCompletionDates(habitId: string): string[] {
  return db
    .prepare("SELECT date FROM completions WHERE habit_id = ? ORDER BY date DESC")
    .all(habitId)
    .map((row) => (row as { date: string }).date);
}
