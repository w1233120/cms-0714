// Local-date helpers for `date` columns. Always use local components so UTC+8 dates
// are never shifted back a day (never toISOString().split('T')[0]).

export function toIsoDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
