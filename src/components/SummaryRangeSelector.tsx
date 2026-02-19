import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { TimeFrameRange } from '@/contexts/TimeFrameContext';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { format, startOfDay, parseISO } from 'date-fns';

// Re-export the type for backward compatibility
export type SummaryRange = TimeFrameRange;

interface SummaryRangeSelectorProps {
  value: TimeFrameRange;
  onChange: (range: TimeFrameRange) => void;
  transactions?: Transaction[];
}

type PresetRange = Exclude<TimeFrameRange, 'custom'>;

const ranges: { value: PresetRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
];

export function SummaryRangeSelector({ value, onChange, transactions = [] }: SummaryRangeSelectorProps) {
  const { customStartDate, customEndDate, setCustomRange, clearCustomRange } = useTimeFrame();
  const [customStep, setCustomStep] = useState<'idle' | 'start' | 'end'>('idle');
  const [pendingStart, setPendingStart] = useState<Date | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const earliestDate = useMemo(() => getEarliestTransactionDate(transactions), [transactions]);
  
  const rangeMeaningfulness = useMemo(() => getRangeMeaningfulness(earliestDate), [earliestDate]);
  
  const effectiveDateRange = useMemo(
    () => getEffectiveDateRange(value, earliestDate, customStartDate, customEndDate),
    [value, earliestDate, customStartDate, customEndDate]
  );

  const handleRangeClick = (range: PresetRange) => {
    if (rangeMeaningfulness[range].enabled) {
      onChange(range);
    }
  };

  const handleCustomClick = () => {
    setCustomStep('start');
    setPendingStart(undefined);
    setPopoverOpen(true);
  };

  const handleStartSelect = (date: Date | undefined) => {
    if (!date) return;
    setPendingStart(date);
    setCustomStep('end');
  };

  const handleEndSelect = (date: Date | undefined) => {
    if (!date || !pendingStart) return;
    const startStr = format(pendingStart, 'yyyy-MM-dd');
    const endStr = format(date, 'yyyy-MM-dd');
    setCustomRange(startStr, endStr);
    setCustomStep('idle');
    setPopoverOpen(false);
  };

  const today = startOfDay(new Date());

  const customLabel = useMemo(() => {
    if (value !== 'custom' || !customStartDate || !customEndDate) return null;
    const start = parseISO(customStartDate);
    const end = parseISO(customEndDate);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startFmt = sameYear ? 'MMM d' : 'MMM d, yyyy';
    const endFmt = sameYear ? 'MMM d' : 'MMM d, yyyy';
    const isToday = format(end, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    return `${format(start, startFmt)} – ${isToday ? 'Today' : format(end, endFmt)}`;
  }, [value, customStartDate, customEndDate, today]);

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
        <div className="flex items-center justify-center gap-1 flex-wrap">
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

          {/* Custom button */}
          <Popover open={popoverOpen} onOpenChange={(open) => {
            setPopoverOpen(open);
            if (!open) setCustomStep('idle');
          }}>
            <PopoverTrigger asChild>
              <button
                onClick={handleCustomClick}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-full transition-colors inline-flex items-center gap-1',
                  value === 'custom'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                )}
              >
                <CalendarIcon className="w-3 h-3" />
                Custom
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">
                  {customStep === 'start' ? 'Pick start date' : 'Pick end date'}
                </p>
                {customStep === 'end' && pendingStart && (
                  <p className="text-xs text-muted-foreground mt-1">
                    From {format(pendingStart, 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              {customStep === 'start' && (
                <Calendar
                  mode="single"
                  selected={pendingStart}
                  onSelect={handleStartSelect}
                  disabled={(date) => date > today}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              )}
              {customStep === 'end' && pendingStart && (
                <Calendar
                  mode="single"
                  onSelect={handleEndSelect}
                  disabled={(date) => date < pendingStart || date > today}
                  defaultMonth={pendingStart}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              )}
            </PopoverContent>
          </Popover>

          {/* Clear custom */}
          {value === 'custom' && (
            <button
              onClick={() => clearCustomRange()}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-secondary/50 transition-colors"
              title="Clear custom range"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </TooltipProvider>

      {/* Custom range label */}
      {value === 'custom' && customLabel && (
        <p className="text-xs text-primary text-center mt-2 font-medium">
          {customLabel}
        </p>
      )}
    </div>
  );
}
