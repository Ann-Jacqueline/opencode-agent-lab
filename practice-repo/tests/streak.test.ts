import assert from "node:assert/strict";
import test from "node:test";
import { toDateKey } from "../src/lib/dates.js";
import { clearStreakCache, calculateStreak } from "../src/services/streak.js";

function dateKey(daysAgo: number): string {
  const date = new Date(2026, 10, 12);
  date.setDate(date.getDate() - daysAgo);
  return toDateKey(date);
}

test("counts a streak ending today", () => {
  const today = new Date(2026, 10, 12);
  const dates = [dateKey(0), dateKey(1), dateKey(2)];
  assert.equal(calculateStreak(dates, today), 3);
});

test("allows a streak that ends yesterday", () => {
  const today = new Date(2026, 10, 12);
  const dates = [dateKey(1), dateKey(2), dateKey(3)];
  assert.equal(calculateStreak(dates, today), 3);
});

test("returns zero when the last completion is older than yesterday", () => {
  const today = new Date(2026, 10, 12);
  assert.equal(calculateStreak([dateKey(2), dateKey(3)], today), 0);
});

test("ignores duplicate dates", () => {
  const today = new Date(2026, 10, 12);
  const dates = [dateKey(0), dateKey(0), dateKey(1), dateKey(1)];
  assert.equal(calculateStreak(dates, today), 2);
});

test("returns zero for an empty history", () => {
  assert.equal(calculateStreak([]), 0);
});

test("cache can be cleared between tests", () => {
  clearStreakCache();
  assert.equal(calculateStreak([], new Date(2026, 10, 12)), 0);
});

// Missing coverage: timezone and DST transitions. See docs/architecture.md
// for the intended production behavior, which is not implemented yet.
