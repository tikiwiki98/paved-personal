import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';
import { ChartDrilldownSheet } from './ChartDrilldownSheet';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Filter, Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRangeLabel } from '@/hooks/useRangeLabel';

interface CategoryBarChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const DEFAULT_TOP_N = 8;
const MAX_BARS = 12;
const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

function SimpleBarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      <p className="text-lg font-semibold text-foreground">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export function CategoryBarChart({ transactions, categories }: CategoryBarChartProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [pinnedCategories, setPinnedCategories] = useState<Set<string>>(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const rangeLabel = useRangeLabel();

  const allCategoryData = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const data = useMemo(() => {
    if (showOnlySelected && pinnedCategories.size > 0) {
      return allCategoryData.filter(d => pinnedCategories.has(d.name));
    }
    if (pinnedCategories.size === 0) {
      return allCategoryData.slice(0, DEFAULT_TOP_N);
    }
    const topN = allCategoryData.slice(0, DEFAULT_TOP_N);
    const topNames = new Set(topN.map(d => d.name));
    const extras = allCategoryData.filter(d => pinnedCategories.has(d.name) && !topNames.has(d.name));
    return [...topN, ...extras].slice(0, MAX_BARS);
  }, [allCategoryData, pinnedCategories, showOnlySelected]);

  const drilldownTransactions = useMemo(() => {
    if (!drilldownCategory) return [];
    return transactions.filter(
      (t) => t.type === 'expense' && t.category === drilldownCategory
    );
  }, [transactions, drilldownCategory]);

  const handleChartClick = useCallback((chartData: any) => {
    if (!chartData?.activePayload?.[0]) return;
    const name = chartData.activePayload[0].payload.name as string;
    setDrilldownCategory(name);
    setDrilldownOpen(true);
  }, []);

  const toggleCategory = (name: string) => {
    setPinnedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleReset = () => {
    setPinnedCategories(new Set());
    setShowOnlySelected(false);
  };

  const subtitle = useMemo(() => {
    if (showOnlySelected && pinnedCategories.size > 0) {
      return `Showing ${pinnedCategories.size} selected`;
    }
    if (pinnedCategories.size > 0) {
      const topNNames = new Set(allCategoryData.slice(0, DEFAULT_TOP_N).map(d => d.name));
      const added = [...pinnedCategories].filter(n => !topNNames.has(n)).length;
      if (added > 0) return `Top ${DEFAULT_TOP_N} + ${added} added`;
      return `Top ${DEFAULT_TOP_N} (${pinnedCategories.size} pinned)`;
    }
    return null;
  }, [pinnedCategories, showOnlySelected, allCategoryData]);

  const hasSelections = pinnedCategories.size > 0;
  const barCount = data.length;
  const chartHeight = Math.max(barCount * 30 + 20, 80);

  if (allCategoryData.length === 0) {
    return (
      <Card className="bg-card border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spend by Category</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data available
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border p-6">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">Spend by Category</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-sm text-muted-foreground hidden sm:inline">{rangeLabel}</span>
            {hasSelections && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </Button>
            )}
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8",
                    hasSelections && "text-primary hover:text-primary"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  {hasSelections ? `${pinnedCategories.size} selected` : 'Filter'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0 bg-popover border-border z-50" align="end">
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <label htmlFor="show-only" className="text-xs text-muted-foreground cursor-pointer">
                    Show only selected
                  </label>
                  <Switch
                    id="show-only"
                    checked={showOnlySelected}
                    onCheckedChange={setShowOnlySelected}
                    className="scale-75"
                    disabled={pinnedCategories.size === 0}
                  />
                </div>
                <Command>
                  <CommandInput placeholder="Search categories..." />
                  <CommandList>
                    <CommandEmpty>No categories found.</CommandEmpty>
                    <CommandGroup>
                      {allCategoryData.map(cat => (
                        <CommandItem
                          key={cat.name}
                          onSelect={() => toggleCategory(cat.name)}
                          className="cursor-pointer"
                        >
                          <Check className={cn("mr-2 h-3.5 w-3.5", pinnedCategories.has(cat.name) ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1 truncate">{cat.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">${cat.value.toLocaleString()}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {showOnlySelected && pinnedCategories.size === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
            Select categories above to focus on them
          </div>
        ) : (
          <div style={{ height: Math.min(chartHeight, 320) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }} onClick={handleChartClick}>
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }}
                  tickFormatter={(value) => {
                    if (value === 0) return '$0';
                    if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                    return `$${Math.round(value / 100) * 100}`;
                  }}
                  domain={[0, 'auto']}
                  tickCount={5}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
                  width={70}
                />
                <Tooltip cursor={false} content={<SimpleBarTooltip />} />
                <Bar
                  dataKey="value"
                  fill={EXPENSE_COLOR}
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                  activeBar={false}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <ChartDrilldownSheet
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        title={`${drilldownCategory} Transactions`}
        transactions={drilldownTransactions}
      />
    </>
  );
}
