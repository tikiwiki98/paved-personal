import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/types/budget';
import { SummaryRangeSelector } from '@/components/SummaryRangeSelector';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { filterTransactionsByRange } from '@/lib/dateRangeUtils';
import { format, parseISO, startOfDay, eachDayOfInterval, startOfWeek, eachWeekOfInterval, startOfMonth, eachMonthOfInterval } from 'date-fns';

interface SpendingOverTimeChartProps {
  transactions: Transaction[];
}

// Use expense color (darker blue)
const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

export function SpendingOverTimeChart({ transactions }: SpendingOverTimeChartProps) {
  const { range, setRange, filterRent } = useTimeFrame();

  // Apply rent filter to all transactions first
  const rentFilteredTransactions = useMemo(() => filterRent(transactions), [transactions, filterRent]);

  const data = useMemo(() => {
    const filteredTransactions = filterTransactionsByRange(rentFilteredTransactions, range);
    
    if (filteredTransactions.length === 0) return [];

    // Get expenses only
    const expenses = filteredTransactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return [];

    // Determine date range
    const dates = expenses.map((t) => parseISO(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Determine grouping based on range
    let intervals: Date[];
    let formatStr: string;
    let groupKey: (date: Date) => string;

    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 31) {
      // Daily grouping for 1 month or less
      intervals = eachDayOfInterval({ start: minDate, end: maxDate });
      formatStr = 'MMM d';
      groupKey = (date: Date) => format(startOfDay(date), 'yyyy-MM-dd');
    } else if (daysDiff <= 90) {
      // Weekly grouping for 2-3 months
      intervals = eachWeekOfInterval({ start: minDate, end: maxDate });
      formatStr = 'MMM d';
      groupKey = (date: Date) => format(startOfWeek(date), 'yyyy-MM-dd');
    } else {
      // Monthly grouping for longer periods
      intervals = eachMonthOfInterval({ start: minDate, end: maxDate });
      formatStr = 'MMM yyyy';
      groupKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM');
    }

    // Group expenses by interval
    const expensesByInterval: Record<string, number> = {};
    expenses.forEach((t) => {
      const date = parseISO(t.date);
      const key = groupKey(date);
      expensesByInterval[key] = (expensesByInterval[key] || 0) + t.amount;
    });

    // Build chart data
    return intervals.map((intervalDate) => {
      const key = daysDiff <= 90 
        ? format(daysDiff <= 31 ? startOfDay(intervalDate) : startOfWeek(intervalDate), 'yyyy-MM-dd')
        : format(startOfMonth(intervalDate), 'yyyy-MM');
      
      return {
        date: format(intervalDate, formatStr),
        fullDate: intervalDate,
        amount: expensesByInterval[key] || 0,
      };
    });
  }, [rentFilteredTransactions, range]);

  const rangeLabel = range === 'mtd' ? format(new Date(), 'MMMM') : 
                     range === 'ytd' ? format(new Date(), 'yyyy') :
                     range.toUpperCase();

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Spending Over Time</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data for {rangeLabel}
        </div>
        <SummaryRangeSelector value={range} onChange={setRange} />
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card animate-slide-up" style={{ animationDelay: '0.3s' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Spending Over Time</h3>
        <span className="text-sm text-muted-foreground">{rangeLabel}</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
              interval="preserveStartEnd"
              tickMargin={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }}
              tickFormatter={(value) => {
                if (value === 0) return '$0';
                if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                return `$${Math.round(value / 100) * 100}`;
              }}
              width={50}
              tickCount={5}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: 'hsl(220, 20%, 30%)', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{
                backgroundColor: 'hsl(220, 28%, 12%)',
                border: '1px solid hsl(220, 20%, 18%)',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
              labelStyle={{ color: 'hsl(210, 20%, 96%)', marginBottom: '4px' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Spent']}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke={EXPENSE_COLOR}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 6,
                fill: EXPENSE_COLOR,
                stroke: 'hsl(220, 28%, 12%)',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <SummaryRangeSelector value={range} onChange={setRange} />
    </Card>
  );
}
