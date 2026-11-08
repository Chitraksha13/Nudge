export const DAY = 86_400_000;

export const FREQUENCIES = [
  { value: 0, label: "Off" },
  { value: 1, label: "1 day" },
  { value: 2, label: "2 days" },
  { value: 3, label: "3 days" },
  { value: 7, label: "7 days" },
];

/** When is the next reminder for a waiting share? null when reminders are off. */
export function nextNudge(lastRemindedAt: number | null, everyDays: number, now: number) {
  if (everyDays <= 0 || lastRemindedAt === null) return null;
  const remaining = lastRemindedAt + everyDays * DAY - now;
  return { due: remaining <= 0, inDays: Math.max(0, Math.ceil(remaining / DAY)) };
}

export function nextNudgeLabel(n: ReturnType<typeof nextNudge>): string {
  if (!n) return "Reminders off";
  if (n.due) return "Nudge due now";
  return `Next nudge in ${n.inDays} day${n.inDays === 1 ? "" : "s"}`;
}

export function agoLabel(t: number | null, now: number): string {
  if (!t) return "never";
  const m = Math.floor((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}
