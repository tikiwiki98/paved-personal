import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';

interface CategoryBarChartProps {
  transactions: Transaction[];
  categories: Category[];
}

// Consistent blue-toned color for all bars (matching Home page)
const BAR_COLOR = 'hsl(195, 80%, 50%)';

export function CategoryBarChart({ transactions, categories }: CategoryBarChartProps) {
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
      .slice(0, 8); // Top 8 categories
  }, [transactions, categories]);

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Categories</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Top Categories</h3>
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
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
            />
            <Bar 
              dataKey="value" 
              fill={BAR_COLOR}
              radius={[0, 4, 4, 0]} 
              barSize={20}
              activeBar={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}