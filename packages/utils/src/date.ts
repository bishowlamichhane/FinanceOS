/**
 * Date helpers — financial period math.
 *
 * Most of this is wrapping date-fns with Finance OS conventions:
 *  - "month" means calendar month in the user's local timezone
 *  - "fiscal year" — Nepal's fiscal year runs Shrawan-Ashadh (mid-July
 *    to mid-July). We expose an FY helper but keep calendar months as the
 *    default for budget periods (matches what users intuitively expect).
 */

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';

export type Period = {
  start: Date;
  end: Date;
};

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export const today = (): Date => startOfDay(new Date());
export const now = (): Date => new Date();

export const monthOf = (d: Date = new Date()): Period => ({
  start: startOfMonth(d),
  end: endOfMonth(d),
});

export const yearOf = (d: Date = new Date()): Period => ({
  start: startOfYear(d),
  end: endOfYear(d),
});

export const previousMonth = (d: Date = new Date()): Period => monthOf(addMonths(d, -1));

/**
 * Compute the next occurrence given a recurrence frequency.
 * Used by recurring transactions to roll the `nextDate` forward.
 */
export const nextOccurrence = (current: Date, frequency: RecurrenceFrequency): Date => {
  switch (frequency) {
    case 'daily':
      return addDays(current, 1);
    case 'weekly':
      return addWeeks(current, 1);
    case 'biweekly':
      return addWeeks(current, 2);
    case 'monthly':
      return addMonths(current, 1);
    case 'quarterly':
      return addMonths(current, 3);
    case 'yearly':
      return addYears(current, 1);
  }
};

/**
 * "Process due" iterator — returns every occurrence between `from` and `to`
 * (inclusive on `from`, exclusive on `to`). Used to back-fill recurring
 * transactions when the user hasn't opened the app in a while.
 */
export function* occurrencesBetween(
  from: Date,
  to: Date,
  frequency: RecurrenceFrequency,
): Generator<Date> {
  let cursor = new Date(from);
  while (isBefore(cursor, to) || isSameDay(cursor, to)) {
    yield cursor;
    cursor = nextOccurrence(cursor, frequency);
  }
}

/**
 * Approximate monthly equivalent for a recurring amount. Used to project
 * monthly net cashflow from recurring entries.
 */
export const monthlyFactor = (frequency: RecurrenceFrequency): number => {
  switch (frequency) {
    case 'daily':
      return 30;
    case 'weekly':
      return 4.345;
    case 'biweekly':
      return 2.173;
    case 'monthly':
      return 1;
    case 'quarterly':
      return 1 / 3;
    case 'yearly':
      return 1 / 12;
  }
};

/** Display formatters — kept here for shared use. */

export const formatDate = (d: Date | string, fmt: 'short' | 'medium' | 'long' = 'medium') => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  switch (fmt) {
    case 'short':
      return format(date, 'd MMM');
    case 'long':
      return format(date, 'd MMMM yyyy');
    case 'medium':
    default:
      return format(date, 'd MMM yyyy');
  }
};

export const formatRelative = (d: Date | string): string => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return formatDistanceToNow(date, { addSuffix: true });
};

export const formatTime = (d: Date | string): string => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'h:mm a');
};

/** ISO date string (YYYY-MM-DD) — what we store in `date` columns. */
export const toISODate = (d: Date | string): string => {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'yyyy-MM-dd');
};

export {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
};
