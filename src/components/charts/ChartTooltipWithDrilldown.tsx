import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

interface ChartTooltipWithDrilldownProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string } }>;
  label?: string;
  onDrilldown?: (label: string) => void;
}

export function ChartTooltipWithDrilldown({
  active,
  payload,
  label,
  onDrilldown,
}: ChartTooltipWithDrilldownProps) {
  if (!active || !payload || payload.length === 0) return null;

  const value = payload[0]?.value ?? 0;
  const displayLabel = label || payload[0]?.payload?.name || '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDrilldown?.(displayLabel);
  };

  return (
    <div
      className="bg-popover border border-border rounded-xl p-3 shadow-lg"
      style={{ pointerEvents: 'auto' }}
    >
      <p className="text-sm font-medium text-foreground mb-1">{displayLabel}</p>
      <p className="text-lg font-semibold text-foreground">
        ${value.toLocaleString()}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-between text-xs h-7 text-muted-foreground hover:text-foreground"
        onClick={handleClick}
      >
        Transaction details
        <ChevronRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
