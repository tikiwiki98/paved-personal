import { parseISO, subMonths, subYears, startOfMonth, startOfYear, isAfter, isEqual, isBefore, startOfDay, differenceInDays, format } from 'date-fns';
import { Transaction } from '@/types/budget';
import { TimeFrameRange } from '@/contexts/TimeFrameContext';

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

export function filterTransactionsByRange(transactions: Transaction[], range: TimeFrameRange): Transaction[] {
  const startDate = getDateRangeStart(range);
  const today = startOfDay(new Date());
  
  return transactions.filter((t) => {
    const transactionDate = startOfDay(parseISO(t.date));
    const isAfterStart = isAfter(transactionDate, startDate) || isEqual(transactionDate, startDate);
    const isNotFuture = isBefore(transactionDate, today) || isEqual(transactionDate, today);
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
  earliestTransactionDate: Date | null
): { start: Date; end: Date; label: string } {
  const today = startOfDay(new Date());
  const rangeStart = getDateRangeStart(range);
  
  // Use the later of range start or earliest transaction date
  const effectiveStart = earliestTransactionDate && isAfter(earliestTransactionDate, rangeStart)
    ? startOfDay(earliestTransactionDate)
    : rangeStart;
  
  const formatStr = effectiveStart.getFullYear() === today.getFullYear() ? 'MMM d' : 'MMM d, yyyy';
  const endFormatStr = 'MMM d';
  
  const label = `${format(effectiveStart, formatStr)} – ${format(today, endFormatStr)}`;
  
  return { start: effectiveStart, end: today, label };
}

// Determine which ranges are meaningful given the earliest transaction date
export function getRangeMeaningfulness(
  earliestTransactionDate: Date | null
): Record<TimeFrameRange, { enabled: boolean; reason?: string }> {
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
  
  // Define thresholds for each range to be meaningful
  // A range is only meaningful if it would show more data than a shorter range
  const result: Record<TimeFrameRange, { enabled: boolean; reason?: string }> = {
    '1m': { enabled: true }, // Always enabled if there's any data
    '3m': { enabled: daysOfHistory > 35, reason: 'Not enough historical data yet' },
    '6m': { enabled: daysOfHistory > 95, reason: 'Not enough historical data yet' },
    '1y': { enabled: daysOfHistory > 185, reason: 'Not enough historical data yet' },
    'mtd': { enabled: true }, // Always enabled
    'ytd': { enabled: daysOfHistory > 35 || today.getMonth() > 0, reason: 'Not enough historical data yet' },
  };
  
  return result;
}

// Get the smart default range based on available data
export function getSmartDefaultRange(earliestTransactionDate: Date | null): TimeFrameRange {
  if (!earliestTransactionDate) return 'mtd';
  
  const today = startOfDay(new Date());
  const daysOfHistory = differenceInDays(today, startOfDay(earliestTransactionDate));
  
  // If very little data, use MTD
  if (daysOfHistory <= 14) return 'mtd';
  
  // If less than 2 months, use 1M
  if (daysOfHistory <= 45) return '1m';
  
  // Otherwise MTD is a good default
  return 'mtd';
}
