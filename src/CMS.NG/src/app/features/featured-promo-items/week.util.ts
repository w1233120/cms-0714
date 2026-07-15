// Date helpers for the one-week (Monday–Sunday) grid. All formatting uses *local*
// date components so UTC+8 dates are never shifted back a day (see frontend-conventions).

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Monday of the week containing `date` (getDay(): 0=Sun … 6=Sat).
export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// The seven dates Monday…Sunday, starting at `monday`.
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

// Grid day header, e.g. '3/16 (一)'.
export function dayLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAY_LABELS[date.getDay()]})`;
}
