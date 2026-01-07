import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';
import { ChartTooltipWithDrilldown } from './ChartTooltipWithDrilldown';
import { ChartDrilldownSheet } from './ChartDrilldownSheet';

interface CategoryBarChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

export function CategoryBarChart({ transactions, categories }: CategoryBarChartProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const data = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, categories]);

  const drilldownTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions.filter(
      (t) => t.type === 'expense' && t.category === selectedCategory
    );
  }, [transactions, selectedCategory]);

  const handleDrilldown = useCallback((categoryName: string) => {
    setSelectedCategory(categoryName);
    setDrilldownOpen(true);
  }, []);

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spend by Category</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data available
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spend by Category</h3>
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
                content={<ChartTooltipWithDrilldown onDrilldown={handleDrilldown} />}
                wrapperStyle={{ pointerEvents: 'auto' }}
              />
              <Bar 
                dataKey="value" 
                fill={EXPENSE_COLOR}
                radius={[0, 4, 4, 0]} 
                barSize={20}
                activeBar={false}
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
