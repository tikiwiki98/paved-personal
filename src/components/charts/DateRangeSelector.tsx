import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DateRange = '1d' | '7d' | '1m' | '3m' | '6m' | '1y';

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const ranges: { value: DateRange; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '7d', label: '7D' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(range.value)}
          className={cn(
            'h-8 px-3 text-xs font-medium transition-all',
            value === range.value
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
