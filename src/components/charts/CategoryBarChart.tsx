import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';
import { ChartDrilldownSheet } from './ChartDrilldownSheet';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Filter, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryBarChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const DEFAULT_TOP_N = 8;
const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

// Display-only tooltip
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // All categories with spend, sorted by spend desc
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

  // Chart data based on focus state
  const data = useMemo(() => {
    if (focusedCategory) {
      const found = allCategoryData.find(d => d.name === focusedCategory);
      return found ? [found] : [];
    }
    return allCategoryData.slice(0, DEFAULT_TOP_N);
  }, [allCategoryData, focusedCategory]);

  const drilldownTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions.filter(
      (t) => t.type === 'expense' && t.category === selectedCategory
    );
  }, [transactions, selectedCategory]);

  const handleChartClick = useCallback((chartData: any) => {
    if (!chartData?.activePayload?.[0]) return;
    const name = chartData.activePayload[0].payload.name as string;
    setSelectedCategory(name);
    setDrilldownOpen(true);
  }, []);

  const handleSelectCategory = (categoryName: string) => {
    setFocusedCategory(categoryName);
    setPickerOpen(false);
  };

  const handleClearFocus = () => {
    setFocusedCategory(null);
  };

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Spend by Category</h3>
            {focusedCategory && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xs text-muted-foreground">Showing:</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  {focusedCategory}
                  <button onClick={handleClearFocus} className="hover:text-primary/70 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
          </div>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs gap-1.5 text-muted-foreground hover:text-foreground",
                  focusedCategory && "text-primary hover:text-primary"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                {focusedCategory ? 'Change' : 'Filter'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0 bg-popover border-border z-50" align="end">
              <Command>
                <CommandInput placeholder="Search categories..." />
                <CommandList>
                  <CommandEmpty>No categories found.</CommandEmpty>
                  <CommandGroup>
                    {/* Show All / Reset option */}
                    <CommandItem
                      onSelect={handleClearFocus}
                      className="cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-3.5 w-3.5", !focusedCategory ? "opacity-100" : "opacity-0")} />
                      <span className="font-medium">All (top {DEFAULT_TOP_N})</span>
                    </CommandItem>
                    {allCategoryData.map(cat => (
                      <CommandItem
                        key={cat.name}
                        onSelect={() => handleSelectCategory(cat.name)}
                        className="cursor-pointer"
                      >
                        <Check className={cn("mr-2 h-3.5 w-3.5", focusedCategory === cat.name ? "opacity-100" : "opacity-0")} />
                        <span className="flex-1">{cat.name}</span>
                        <span className="text-xs text-muted-foreground">${cat.value.toLocaleString()}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className={focusedCategory ? "h-24" : "h-64"}>
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
              <Tooltip
                cursor={false}
                content={<SimpleBarTooltip />}
              />
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
      </Card>

      <ChartDrilldownSheet
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        title={`${selectedCategory} Transactions`}
        transactions={drilldownTransactions}
      />
    </>
  );
}
