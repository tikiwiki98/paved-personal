import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { getDateRangeStart } from '@/lib/dateRangeUtils';
import { startOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';

interface SpendVsBudgetChartProps {
  transactions: { type: string; category: string; amount: number; date: string }[];
  budgets: Record<string, number>;
  onCategoryClick: (category: string) => void;
}

export function SpendVsBudgetChart({ transactions, budgets, onCategoryClick }: SpendVsBudgetChartProps) {
  const { range, includeRent } = useTimeFrame();

  const chartData = useMemo(() => {
    const startDate = getDateRangeStart(range);
    const endDate = startOfDay(new Date());
    
    // Filter transactions by date and rent preference
    const filteredTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      const withinRange = txDate >= startDate && txDate <= endDate;
      const rentFilter = includeRent || t.category !== 'Rent';
      return t.type === 'expense' && withinRange && rentFilter;
    });

    // Calculate spent per category
    const spentByCategory: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
    });

    // Create chart data for ALL categories with spend
    const data = Object.entries(spentByCategory)
      .map(([category, spent]) => ({
        category,
        spent,
        budget: budgets[category] || 0,
        hasBudget: (budgets[category] || 0) > 0,
        isOverBudget: budgets[category] ? spent > budgets[category] : false,
      }))
      .sort((a, b) => b.spent - a.spent); // Sort by spend descending

    return data;
  }, [transactions, budgets, range, includeRent]);

  const { totalSpent, totalBudget } = useMemo(() => {
    return chartData.reduce(
      (acc, item) => ({
        totalSpent: acc.totalSpent + item.spent,
        totalBudget: acc.totalBudget + item.budget,
      }),
      { totalSpent: 0, totalBudget: 0 }
    );
  }, [chartData]);

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-1">{data.category}</p>
        <p className="text-sm text-foreground">
          Spent: <span className="font-semibold">${data.spent.toLocaleString()}</span>
        </p>
        {data.hasBudget && (
          <p className="text-sm text-muted-foreground">
            Budget: ${data.budget.toLocaleString()}
          </p>
        )}
        {!data.hasBudget && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            No budget set
          </p>
        )}
      </div>
    );
  };

  if (chartData.length === 0) {
    return (
      <Card className="bg-card border-border p-6 animate-slide-up">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Spending by Category</h3>
          <p className="text-sm text-muted-foreground">Your monthly spending breakdown</p>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>No spending data for this period</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border p-6 animate-slide-up">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Spending by Category</h3>
        <p className="text-sm text-muted-foreground">
          ${totalSpent.toLocaleString()} spent
          {totalBudget > 0 && ` of $${totalBudget.toLocaleString()} budgeted`}
        </p>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <XAxis 
              type="number" 
              tickFormatter={formatYAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="category" 
              width={100}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            
            {/* Spend bars */}
            <Bar 
              dataKey="spent" 
              radius={[0, 4, 4, 0]}
              onClick={(data) => onCategoryClick(data.category)}
              cursor="pointer"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`spend-${index}`}
                  fill={entry.isOverBudget ? 'hsl(32, 95%, 55%)' : 'hsl(220, 60%, 45%)'}
                />
              ))}
            </Bar>

            {/* Budget reference lines for categories with budgets */}
            {chartData.map((entry, index) => 
              entry.hasBudget ? (
                <ReferenceLine
                  key={`budget-line-${index}`}
                  x={entry.budget}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                />
              ) : null
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
