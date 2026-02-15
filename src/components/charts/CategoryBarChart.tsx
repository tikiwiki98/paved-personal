import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';
import { ChartDrilldownSheet } from './ChartDrilldownSheet';

interface CategoryBarChartProps {
  transactions: Transaction[];
  categories: Category[];
}

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

  const data = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [transactions, categories]);

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

  if (data.length === 0) {
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
        <h3 className="text-lg font-semibold text-foreground mb-4">Spend by Category</h3>
        <div className="h-64">
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
