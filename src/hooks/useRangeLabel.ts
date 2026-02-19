import { useMemo } from 'react';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { format, parseISO } from 'date-fns';

/**
 * Returns a human-readable label for the current time frame range.
 * MTD → month name, YTD → year, custom → "Mar 1 – Mar 15", presets → uppercase.
 */
export function useRangeLabel(): string {
  const { range, customStartDate, customEndDate } = useTimeFrame();

  return useMemo(() => {
    if (range === 'custom' && customStartDate && customEndDate) {
      const start = parseISO(customStartDate);
      const end = parseISO(customEndDate);
      const sameYear = start.getFullYear() === end.getFullYear();
      return `${format(start, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(end, sameYear ? 'MMM d' : 'MMM d, yyyy')}`;
    }
    if (range === 'mtd') return format(new Date(), 'MMMM');
    if (range === 'ytd') return format(new Date(), 'yyyy');
    return range.toUpperCase();
  }, [range, customStartDate, customEndDate]);
}
