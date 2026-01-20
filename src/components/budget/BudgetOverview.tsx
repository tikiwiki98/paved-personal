import { Card } from '@/components/ui/card';
import { Category } from '@/types/budget';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { getDateRangeStart } from '@/lib/dateRangeUtils';
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { startOfDay } from 'date-fns';

interface BudgetOverviewProps {
  categories: Category[];
  transactions: { type: string; category: string; amount: number; date: string }[];
}

export function BudgetOverview({ categories, transactions }: BudgetOverviewProps) {
  const { range, includeRent } = useTimeFrame();

  const { totalBudget, totalSpent, categoriesWithBudget } = useMemo(() => {
    const startDate = getDateRangeStart(range);
    const endDate = startOfDay(new Date());
    
    // Filter transactions by date and rent preference
    const filteredTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      const withinRange = txDate >= startDate && txDate <= endDate;
      const rentFilter = includeRent || t.category !== 'Rent';
      return t.type === 'expense' && withinRange && rentFilter;
    });

    // Calculate spent per category from filtered transactions
    const spentByCategory: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
    });

    // Filter categories with budgets and apply rent filter
    const withBudget = categories
      .filter(c => c.budget > 0 && (includeRent || c.name !== 'Rent'))
      .map(c => ({
        ...c,
        spent: spentByCategory[c.name] || 0,
      }));

    return {
      totalBudget: withBudget.reduce((sum, c) => sum + c.budget, 0),
      totalSpent: withBudget.reduce((sum, c) => sum + c.spent, 0),
      categoriesWithBudget: withBudget,
    };
  }, [categories, transactions, range, includeRent]);

  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = overallPercentage > 100;
  const remaining = totalBudget - totalSpent;

  // Pie chart data
  const pieData = categoriesWithBudget.map(c => ({
    name: c.name,
    value: c.spent,
    budget: c.budget,
    color: c.color,
  })).filter(d => d.value > 0);

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Budget Overview</h3>
        <p className="text-sm text-muted-foreground">Monthly budget progress</p>
      </div>

      {/* Overall Progress */}
      <div className="mb-6 p-4 rounded-xl bg-secondary/50">
        <div className="flex justify-between items-end mb-3">
          <div>
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-2xl font-bold text-foreground">${totalSpent.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="text-lg font-semibold text-foreground">${totalBudget.toLocaleString()}</p>
          </div>
        </div>
        <Progress
          value={Math.min(overallPercentage, 100)}
          className="h-3"
          style={{
            '--progress-color': isOverBudget ? 'hsl(var(--expense))' : 'hsl(var(--income))',
          } as React.CSSProperties}
        />
        <div className="mt-2 flex justify-between text-sm">
          <span className={isOverBudget ? 'text-expense' : 'text-income'}>
            {overallPercentage.toFixed(0)}% used
          </span>
          <span className={isOverBudget ? 'text-expense' : 'text-muted-foreground'}>
            {isOverBudget ? `$${Math.abs(remaining).toLocaleString()} over` : `$${remaining.toLocaleString()} left`}
          </span>
        </div>
      </div>

      {/* Spending Distribution Pie Chart */}
      {pieData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Spent']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend 
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>No spending data for budgeted categories</p>
        </div>
      )}
    </Card>
  );
}
