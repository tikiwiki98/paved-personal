import { parseISO, subMonths, subYears, startOfMonth, startOfYear, isAfter, isEqual, isBefore, startOfDay, differenceInDays, format } from 'date-fns';
import { Transaction } from '@/types/budget';
import { TimeFrameRange } from '@/contexts/TimeFrameContext';

/**
 * Centralized helper: returns { start, end } for any range including custom.
 * For presets, end is always today. For custom, uses provided dates.
 */
export function getDateRange(
  range: TimeFrameRange,
  customStartDate?: string | null,
  customEndDate?: string | null,
): { start: Date; end: Date } {
  const today = startOfDay(new Date());

  if (range === 'custom' && customStartDate && customEndDate) {
    return {
      start: startOfDay(parseISO(customStartDate)),
      end: startOfDay(parseISO(customEndDate)),
    };
  }

  return {
    start: getDateRangeStart(range),
    end: today,
  };
}

export function getDateRangeStart(range: TimeFrameRange): Date {
  const now = new Date();
  
  switch (range) {
    case '1m':
      return startOfDay(subMonths(now, 1));
    case '3m':
      return startOfDay(subMonths(now, 3));
    case '6m':
      return startOfDay(subMonths(now, 6));
    case '1y':
      return startOfDay(subYears(now, 1));
    case 'mtd':
      return startOfMonth(now);
    case 'ytd':
      return startOfYear(now);
    default:
      return startOfDay(subMonths(now, 1));
  }
}

export function filterTransactionsByRange(
  transactions: Transaction[],
  range: TimeFrameRange,
  customStartDate?: string | null,
  customEndDate?: string | null,
): Transaction[] {
  const { start: startDate, end: endDate } = getDateRange(range, customStartDate, customEndDate);
  
  return transactions.filter((t) => {
    const transactionDate = startOfDay(parseISO(t.date));
    const isAfterStart = isAfter(transactionDate, startDate) || isEqual(transactionDate, startDate);
    const isNotFuture = isBefore(transactionDate, endDate) || isEqual(transactionDate, endDate);
    return isAfterStart && isNotFuture;
  });
}

// Get the earliest transaction date from a list of transactions
export function getEarliestTransactionDate(transactions: Transaction[]): Date | null {
  if (transactions.length === 0) return null;
  
  const dates = transactions.map(t => parseISO(t.date));
  return new Date(Math.min(...dates.map(d => d.getTime())));
}

// Get the effective date range for display (respecting earliest transaction)
export function getEffectiveDateRange(
  range: TimeFrameRange,
  earliestTransactionDate: Date | null,
  customStartDate?: string | null,
  customEndDate?: string | null,
): { start: Date; end: Date; label: string } {
  const { start: rangeStart, end: rangeEnd } = getDateRange(range, customStartDate, customEndDate);
  
  // Use the later of range start or earliest transaction date
  const effectiveStart = earliestTransactionDate && isAfter(earliestTransactionDate, rangeStart)
    ? startOfDay(earliestTransactionDate)
    : rangeStart;
  
  const formatStr = effectiveStart.getFullYear() === rangeEnd.getFullYear() ? 'MMM d' : 'MMM d, yyyy';
  const endFormatStr = rangeEnd.getFullYear() === effectiveStart.getFullYear() ? 'MMM d' : 'MMM d, yyyy';
  
  const label = `${format(effectiveStart, formatStr)} – ${format(rangeEnd, endFormatStr)}`;
  
  return { start: effectiveStart, end: rangeEnd, label };
}

// Determine which ranges are meaningful given the earliest transaction date
// Excludes 'custom' since it's always available
type PresetRange = Exclude<TimeFrameRange, 'custom'>;

export function getRangeMeaningfulness(
  earliestTransactionDate: Date | null
): Record<PresetRange, { enabled: boolean; reason?: string }> {
  const today = startOfDay(new Date());
  
  if (!earliestTransactionDate) {
    return {
      '1m': { enabled: false, reason: 'No transactions yet' },
      '3m': { enabled: false, reason: 'No transactions yet' },
      '6m': { enabled: false, reason: 'No transactions yet' },
      '1y': { enabled: false, reason: 'No transactions yet' },
      'mtd': { enabled: false, reason: 'No transactions yet' },
      'ytd': { enabled: false, reason: 'No transactions yet' },
    };
  }
  
  const daysOfHistory = differenceInDays(today, startOfDay(earliestTransactionDate));
  
  const result: Record<PresetRange, { enabled: boolean; reason?: string }> = {
    '1m': { enabled: true },
    '3m': { enabled: daysOfHistory > 35, reason: 'Not enough historical data yet' },
    '6m': { enabled: daysOfHistory > 95, reason: 'Not enough historical data yet' },
    '1y': { enabled: daysOfHistory > 185, reason: 'Not enough historical data yet' },
    'mtd': { enabled: true },
    'ytd': { enabled: daysOfHistory > 35 || today.getMonth() > 0, reason: 'Not enough historical data yet' },
  };
  
  return result;
}

// Get the smart default range based on available data
export function getSmartDefaultRange(earliestTransactionDate: Date | null): PresetRange {
  if (!earliestTransactionDate) return 'mtd';
  
  const today = startOfDay(new Date());
  const daysOfHistory = differenceInDays(today, startOfDay(earliestTransactionDate));
  
  if (daysOfHistory <= 14) return 'mtd';
  if (daysOfHistory <= 45) return '1m';
  return 'mtd';
}
