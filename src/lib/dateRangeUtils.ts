import { parseISO, subMonths, subYears, startOfMonth, startOfYear, isAfter, isEqual } from 'date-fns';
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
  
  return transactions.filter((t) => {
    const transactionDate = parseISO(t.date);
    return isAfter(transactionDate, startDate) || isEqual(transactionDate, startDate);
  });
}
