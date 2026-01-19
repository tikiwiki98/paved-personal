import { BudgetTimeframe } from '@/hooks/useBudgets';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface BudgetTimeframeSelectorProps {
  value: BudgetTimeframe;
  onChange: (value: BudgetTimeframe) => void;
}

export function BudgetTimeframeSelector({ value, onChange }: BudgetTimeframeSelectorProps) {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(v) => v && onChange(v as BudgetTimeframe)}
      className="bg-secondary/50 rounded-lg p-1"
    >
      <ToggleGroupItem 
        value="monthly" 
        className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Monthly
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="quarterly" 
        className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Quarterly
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="yearly" 
        className="text-xs px-3 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        Yearly
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
