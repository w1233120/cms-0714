import { addDays, dayLabel, formatLocalDate, startOfWeek, weekDays } from './week.util';

describe('week.util', () => {
  it('startOfWeek returns the Monday of the containing week', () => {
    // 2026-03-18 is a Wednesday.
    expect(formatLocalDate(startOfWeek(new Date('2026-03-18T00:00:00')))).toBe('2026-03-16');
    // Sunday belongs to the week that started the previous Monday.
    expect(formatLocalDate(startOfWeek(new Date('2026-03-22T00:00:00')))).toBe('2026-03-16');
    // Monday maps to itself.
    expect(formatLocalDate(startOfWeek(new Date('2026-03-16T00:00:00')))).toBe('2026-03-16');
  });

  it('weekDays yields seven consecutive dates Monday..Sunday', () => {
    const days = weekDays(startOfWeek(new Date('2026-03-18T00:00:00')));
    expect(days.map(formatLocalDate)).toEqual([
      '2026-03-16',
      '2026-03-17',
      '2026-03-18',
      '2026-03-19',
      '2026-03-20',
      '2026-03-21',
      '2026-03-22'
    ]);
  });

  it('formatLocalDate uses local components (no UTC shift)', () => {
    expect(formatLocalDate(new Date(2026, 2, 6))).toBe('2026-03-06');
  });

  it('addDays crosses month boundaries', () => {
    expect(formatLocalDate(addDays(new Date(2026, 2, 30), 3))).toBe('2026-04-02');
  });

  it('dayLabel renders the M/D and Chinese weekday', () => {
    expect(dayLabel(new Date('2026-03-16T00:00:00'))).toBe('3/16 (一)');
    expect(dayLabel(new Date('2026-03-22T00:00:00'))).toBe('3/22 (日)');
  });
});
