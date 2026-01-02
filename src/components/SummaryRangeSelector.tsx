import { cn } from '@/lib/utils';

export type SummaryRange = '1m' | '3m' | '6m' | '1y' | 'mtd' | 'ytd';

interface SummaryRangeSelectorProps {
  value: SummaryRange;
  onChange: (range: SummaryRange) => void;
}

const ranges: { value: SummaryRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
];

export function SummaryRangeSelector({ value, onChange }: SummaryRangeSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-1 pt-4 border-t border-border/50">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
            value === range.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
