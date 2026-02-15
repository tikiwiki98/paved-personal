import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/types/budget';
import { SummaryRangeSelector } from '@/components/SummaryRangeSelector';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { filterTransactionsByRange } from '@/lib/dateRangeUtils';
import { ChartDrilldownSheet } from '@/components/charts/ChartDrilldownSheet';
import {
  format, parseISO, startOfDay, eachDayOfInterval,
  startOfWeek, eachWeekOfInterval, endOfWeek,
  startOfMonth, eachMonthOfInterval,
} from 'date-fns';

interface SpendingOverTimeChartProps {
  transactions: Transaction[];
}

const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

type GroupingMode = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  date: string;
  fullDate: Date;
  amount: number;
  intervalKey: string;
  grouping: GroupingMode;
}

// Display-only tooltip (no button)
function SimpleTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: DataPoint }> }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{point.date}</p>
      <p className="text-lg font-semibold text-foreground">${point.amount.toLocaleString()}</p>
    </div>
  );
}

export function SpendingOverTimeChart({ transactions }: SpendingOverTimeChartProps) {
  const { range, setRange, filterRent } = useTimeFrame();
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownTransactions, setDrilldownTransactions] = useState<Transaction[]>([]);

  const rentFilteredTransactions = useMemo(() => filterRent(transactions), [transactions, filterRent]);

  const data = useMemo(() => {
    const filteredTransactions = filterTransactionsByRange(rentFilteredTransactions, range);
    if (filteredTransactions.length === 0) return [] as DataPoint[];

    const expenses = filteredTransactions.filter((t) => t.type === 'expense');
    if (expenses.length === 0) return [] as DataPoint[];

    const dates = expenses.map((t) => parseISO(t.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    let intervals: Date[];
    let formatStr: string;
    let groupKey: (date: Date) => string;
    let mode: GroupingMode;

    const daysDiff = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 31) {
      intervals = eachDayOfInterval({ start: minDate, end: maxDate });
      formatStr = 'MMM d';
      groupKey = (date: Date) => format(startOfDay(date), 'yyyy-MM-dd');
      mode = 'daily';
    } else if (daysDiff <= 90) {
      intervals = eachWeekOfInterval({ start: minDate, end: maxDate });
      formatStr = 'MMM d';
      groupKey = (date: Date) => format(startOfWeek(date), 'yyyy-MM-dd');
      mode = 'weekly';
    } else {
      intervals = eachMonthOfInterval({ start: minDate, end: maxDate });
      formatStr = 'MMM yyyy';
      groupKey = (date: Date) => format(startOfMonth(date), 'yyyy-MM');
      mode = 'monthly';
    }

    const expensesByInterval: Record<string, number> = {};
    expenses.forEach((t) => {
      const date = parseISO(t.date);
      const key = groupKey(date);
      expensesByInterval[key] = (expensesByInterval[key] || 0) + t.amount;
    });

    return intervals.map((intervalDate) => {
      const key = daysDiff <= 90
        ? format(daysDiff <= 31 ? startOfDay(intervalDate) : startOfWeek(intervalDate), 'yyyy-MM-dd')
        : format(startOfMonth(intervalDate), 'yyyy-MM');

      // If interval start is before earliest transaction, use earliest date for display label
      const displayDate = intervalDate < minDate ? minDate : intervalDate;

      return {
        date: format(displayDate, formatStr),
        fullDate: intervalDate,
        amount: expensesByInterval[key] || 0,
        intervalKey: key,
        grouping: mode,
      } as DataPoint;
    });
  }, [rentFilteredTransactions, range]);

  const handleChartClick = useCallback((chartData: any) => {
    if (!chartData?.activePayload?.[0]) return;
    const point: DataPoint = chartData.activePayload[0].payload;

    const filtered = rentFilteredTransactions.filter((t) => {
      if (t.type !== 'expense') return false;
      const txDate = parseISO(t.date);
      if (point.grouping === 'daily') {
        return format(startOfDay(txDate), 'yyyy-MM-dd') === point.intervalKey;
      } else if (point.grouping === 'weekly') {
        return format(startOfWeek(txDate), 'yyyy-MM-dd') === point.intervalKey;
      } else {
        return format(startOfMonth(txDate), 'yyyy-MM') === point.intervalKey;
      }
    });

    let title: string;
    if (point.grouping === 'weekly') {
      const weekStart = parseISO(point.intervalKey);
      const weekEnd = endOfWeek(weekStart);
      title = `Transactions – ${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`;
    } else {
      title = `Transactions – ${point.date}`;
    }

    setDrilldownTitle(title);
    setDrilldownTransactions(filtered);
    setDrilldownOpen(true);
  }, [rentFilteredTransactions]);

  const rangeLabel = range === 'mtd' ? format(new Date(), 'MMMM') :
                     range === 'ytd' ? format(new Date(), 'yyyy') :
                     range.toUpperCase();

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="text-lg font-semibold text-foreground mb-4">Spending Over Time</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No expense data for {rangeLabel}
        </div>
        <SummaryRangeSelector value={range} onChange={setRange} transactions={transactions} />
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Spending Over Time</h3>
          <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} onClick={handleChartClick}>
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
                content={<SimpleTooltip />}
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
                  cursor: 'pointer',
                }}
                cursor="pointer"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <SummaryRangeSelector value={range} onChange={setRange} transactions={transactions} />
      </Card>

      <ChartDrilldownSheet
        open={drilldownOpen}
        onOpenChange={setDrilldownOpen}
        title={drilldownTitle}
        transactions={drilldownTransactions}
      />
    </>
  );
}
