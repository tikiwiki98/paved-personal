import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TimeFrameRange } from '@/contexts/TimeFrameContext';
import { Transaction } from '@/types/budget';
import { 
  getEarliestTransactionDate, 
  getEffectiveDateRange, 
  getRangeMeaningfulness 
} from '@/lib/dateRangeUtils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Re-export the type for backward compatibility
export type SummaryRange = TimeFrameRange;

interface SummaryRangeSelectorProps {
  value: TimeFrameRange;
  onChange: (range: TimeFrameRange) => void;
  transactions?: Transaction[];
}

const ranges: { value: SummaryRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
];

export function SummaryRangeSelector({ value, onChange, transactions = [] }: SummaryRangeSelectorProps) {
  const earliestDate = useMemo(() => getEarliestTransactionDate(transactions), [transactions]);
  
  const rangeMeaningfulness = useMemo(() => getRangeMeaningfulness(earliestDate), [earliestDate]);
  
  const effectiveDateRange = useMemo(
    () => getEffectiveDateRange(value, earliestDate),
    [value, earliestDate]
  );

  const handleRangeClick = (range: TimeFrameRange) => {
    if (rangeMeaningfulness[range].enabled) {
      onChange(range);
    }
  };

  return (
    <div className="pt-4 border-t border-border/50">
      {/* Date range helper text */}
      <p className="text-xs text-muted-foreground text-center mb-3">
        {transactions.length > 0 ? (
          <>Showing data from {effectiveDateRange.label}</>
        ) : (
          <>No transaction data available</>
        )}
      </p>
      
      {/* Range buttons */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-center gap-1">
          {ranges.map((range) => {
            const { enabled, reason } = rangeMeaningfulness[range.value];
            
            const button = (
              <button
                key={range.value}
                onClick={() => handleRangeClick(range.value)}
                disabled={!enabled}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
                  value === range.value
                    ? 'bg-primary text-primary-foreground'
                    : enabled
                      ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                )}
              >
                {range.label}
              </button>
            );

            // Wrap disabled buttons with tooltip
            if (!enabled && reason) {
              return (
                <Tooltip key={range.value}>
                  <TooltipTrigger asChild>
                    <span>{button}</span>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="bg-card border-border text-foreground text-xs"
                  >
                    {reason}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}