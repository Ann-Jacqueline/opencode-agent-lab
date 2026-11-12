/**
 * Date keys are intentionally simple: they use the server's local timezone.
 * That keeps the API easy to reason about in development, but it means a
 * deployment in another timezone can disagree about which day a completion
 * belongs to.
 */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function daysBetween(from: string, to: string): number {
  const milliseconds = parseDateKey(to).getTime() - parseDateKey(from).getTime();
  return Math.round(milliseconds / 86_400_000);
}
