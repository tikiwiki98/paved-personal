import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, Category } from '@/types/budget';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, subMonths, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { SummaryRangeSelector } from '@/components/SummaryRangeSelector';
import { filterTransactionsByRange } from '@/lib/dateRangeUtils';
import { InsightCard } from '@/components/InsightCard';
import { useSpendingInsight } from '@/hooks/useInsights';
import { useTimeFrame } from '@/contexts/TimeFrameContext';

interface SpendingChartProps {
  transactions: Transaction[];
  categories?: Category[];
}

// Consistent blue-toned color for all bars
const BAR_COLOR = 'hsl(195, 80%, 50%)';

const HISTORICAL_RANGES = [
  { label: '1m', value: 1 },
  { label: '3m', value: 3 },
  { label: '6m', value: 6 },
  { label: '1y', value: 12 },
];

export function SpendingChart({ transactions, categories = [] }: SpendingChartProps) {
  const { range, setRange } = useTimeFrame();
  const [showHistorical, setShowHistorical] = useState(false);
  const [historicalMonths, setHistoricalMonths] = useState(3);

  const data = useMemo(() => {
    // Filter transactions by selected range
    const filteredTransactions = filterTransactionsByRange(transactions, range);

    // Expenses by category within selected range
    const rangeExpenses = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Historical average if enabled
    let historicalAverages: Record<string, number> = {};
    if (showHistorical) {
      const now = new Date();
      const historicalStart = startOfMonth(subMonths(now, historicalMonths));
      const historicalEnd = endOfMonth(subMonths(now, 1)); // Exclude current month

      const historicalExpenses = transactions
        .filter((t) => {
          const date = parseISO(t.date);
          return t.type === 'expense' && isWithinInterval(date, { start: historicalStart, end: historicalEnd });
        })
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);

      // Calculate averages
      Object.entries(historicalExpenses).forEach(([category, total]) => {
        historicalAverages[category] = total / historicalMonths;
      });
    }

    // Combine all categories
    const allCategories = new Set([
      ...Object.keys(rangeExpenses),
      ...Object.keys(historicalAverages),
    ]);

    return Array.from(allCategories)
      .map((name) => ({
        name,
        current: rangeExpenses[name] || 0,
        historical: historicalAverages[name] || 0,
      }))
      .filter((item) => item.current > 0 || item.historical > 0)
      .sort((a, b) => b.current - a.current)
      .slice(0, 8);
  }, [transactions, categories, showHistorical, historicalMonths, range]);

  const filteredForInsight = useMemo(() => {
    return filterTransactionsByRange(transactions, range);
  }, [transactions, range]);

  const { message: insight } = useSpendingInsight(filteredForInsight, showHistorical, true);

  const rangeLabel = range === 'mtd' ? format(new Date(), 'MMMM') : 
                     range === 'ytd' ? format(new Date(), 'yyyy') :
                     range.toUpperCase();

  const handleHistoricalToggle = (checked: boolean) => {
    setShowHistorical(checked);
  };

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Spend by Category</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data for {rangeLabel}
        </div>
        <SummaryRangeSelector value={range} onChange={setRange} />
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Spend by Category</h3>
          <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="historical-toggle"
              checked={showHistorical}
              onCheckedChange={handleHistoricalToggle}
            />
            <Label htmlFor="historical-toggle" className="text-sm text-muted-foreground cursor-pointer">
              Show Historical Average
            </Label>
          </div>

          {showHistorical && (
            <div className="flex gap-1">
              {HISTORICAL_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setHistoricalMonths(range.value)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    historicalMonths === range.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {showHistorical && (
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-accent" />
              <span className="text-muted-foreground">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-muted-foreground/40" />
              <span className="text-muted-foreground">Avg ({historicalMonths}m)</span>
            </div>
          </div>
        )}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
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
              contentStyle={{
                backgroundColor: 'hsl(220, 28%, 12%)',
                border: '1px solid hsl(220, 20%, 18%)',
                borderRadius: '12px',
                padding: '12px',
              }}
              labelStyle={{ color: 'hsl(210, 20%, 96%)' }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name === 'current' ? 'Current' : `Avg (${historicalMonths}m)`,
              ]}
            />
            <Bar 
              dataKey="current" 
              fill={BAR_COLOR}
              radius={[0, 4, 4, 0]} 
              barSize={showHistorical ? 12 : 20}
              activeBar={false}
            />
            {showHistorical && (
              <Bar 
                dataKey="historical" 
                fill={BAR_COLOR}
                radius={[0, 4, 4, 0]} 
                barSize={12} 
                opacity={0.35}
                activeBar={false}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {insight && <InsightCard message={insight} className="mt-4" />}

      <SummaryRangeSelector value={range} onChange={setRange} />
    </Card>
  );
}
