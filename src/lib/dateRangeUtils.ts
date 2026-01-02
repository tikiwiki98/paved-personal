import { parseISO, subMonths, subYears, startOfMonth, startOfYear, isAfter, isEqual, isBefore, startOfDay } from 'date-fns';
import { Transaction } from '@/types/budget';
import { SummaryRange } from '@/components/SummaryRangeSelector';

export function getDateRangeStart(range: SummaryRange): Date {
  const now = new Date();
  
  switch (range) {
    case '1m':
      return subMonths(now, 1);
    case '3m':
      return subMonths(now, 3);
    case '6m':
      return subMonths(now, 6);
    case '1y':
      return subYears(now, 1);
    case 'mtd':
      return startOfMonth(now);
    case 'ytd':
      return startOfYear(now);
    default:
      return subMonths(now, 1);
  }
}

export function filterTransactionsByRange(transactions: Transaction[], range: SummaryRange): Transaction[] {
  const startDate = getDateRangeStart(range);
  const today = startOfDay(new Date());
  
  return transactions.filter((t) => {
    const transactionDate = startOfDay(parseISO(t.date));
    const isAfterStart = isAfter(transactionDate, startDate) || isEqual(transactionDate, startDate);
    const isNotFuture = isBefore(transactionDate, today) || isEqual(transactionDate, today);
    return isAfterStart && isNotFuture;
  });
}
