import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, Category } from '@/types/budget';

interface CategoryPieChartProps {
  transactions: Transaction[];
  categories: Category[];
}

const COLORS = [
  'hsl(160, 84%, 39%)',
  'hsl(217, 91%, 60%)',
  'hsl(280, 65%, 60%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(180, 70%, 45%)',
  'hsl(330, 70%, 55%)',
  'hsl(120, 60%, 45%)',
];

export function CategoryPieChart({ transactions, categories }: CategoryPieChartProps) {
  const data = useMemo(() => {
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCategory)
      .map(([name, value], index) => ({
        name,
        value,
        color: categories.find((c) => c.name === name)?.color || COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Category</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 14%)',
                border: '1px solid hsl(222, 30%, 22%)',
                borderRadius: '12px',
                padding: '12px',
              }}
              labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
            />
            <Legend
              wrapperStyle={{ paddingTop: '16px' }}
              formatter={(value) => <span className="text-muted-foreground text-sm">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
