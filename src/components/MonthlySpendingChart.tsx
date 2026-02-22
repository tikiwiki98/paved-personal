import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Transaction } from '@/types/budget';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { ChartDrilldownSheet } from '@/components/charts/ChartDrilldownSheet';
import { format, startOfMonth, subMonths, isAfter, isBefore, isSameMonth } from 'date-fns';

interface MonthlySpendingChartProps {
  transactions: Transaction[];
}

const EXPENSE_COLOR = 'hsl(220, 50%, 50%)';
const EXPENSE_COLOR_PARTIAL = 'hsl(220, 50%, 50% / 0.45)';

interface MonthPoint {
  label: string;
  monthKey: string;
  amount: number;
  isCurrent: boolean;
}

function MonthTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MonthPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  const [year, month] = point.monthKey.split('-');
  const fullLabel = format(new Date(+year, +month - 1, 1), 'MMMM yyyy');
  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">
        {fullLabel}{point.isCurrent ? ' (so far)' : ''}
      </p>
      <p className="text-lg font-semibold text-foreground">${point.amount.toLocaleString()}</p>
    </div>
  );
}

export function MonthlySpendingChart({ transactions }: MonthlySpendingChartProps) {
  const { filterRent } = useTimeFrame();
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
  const [drilldownTransactions, setDrilldownTransactions] = useState<Transaction[]>([]);

  const filteredTransactions = useMemo(() => filterRent(transactions), [transactions, filterRent]);

  const expenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense'),
    [filteredTransactions]
  );

  const data = useMemo(() => {
    if (expenses.length === 0) return [] as MonthPoint[];

    const now = new Date();
    const currentMonth = startOfMonth(now);

    // Find earliest expense month
    const dates = expenses.map((t) => new Date(t.date + 'T00:00:00'));
    const earliest = startOfMonth(new Date(Math.min(...dates.map((d) => d.getTime()))));

    // Determine start: max(earliest, 5 months ago) to show up to 6 months
    const sixMonthsAgo = subMonths(currentMonth, 5);
    const rangeStart = isAfter(earliest, sixMonthsAgo) ? earliest : sixMonthsAgo;

    // Build month buckets from rangeStart to currentMonth
    const months: Date[] = [];
    let cursor = new Date(rangeStart);
    while (!isAfter(cursor, currentMonth)) {
      months.push(new Date(cursor));
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    // Sum expenses per month
    const sums: Record<string, number> = {};
    expenses.forEach((t) => {
      const d = new Date(t.date + 'T00:00:00');
      const key = format(d, 'yyyy-MM');
      sums[key] = (sums[key] || 0) + t.amount;
    });

    // Check if range spans a year boundary
    const spansYears = months.length > 0 && months[0].getFullYear() !== months[months.length - 1].getFullYear();

    return months.map((m) => {
      const key = format(m, 'yyyy-MM');
      return {
        label: spansYears ? format(m, "MMM ''yy") : format(m, 'MMM'),
        monthKey: key,
        amount: sums[key] || 0,
        isCurrent: isSameMonth(m, now),
      } as MonthPoint;
    });
  }, [expenses]);

  const handleChartClick = useCallback(
    (chartData: any) => {
      if (!chartData?.activePayload?.[0]) return;
      const point: MonthPoint = chartData.activePayload[0].payload;
      const [year, month] = point.monthKey.split('-');
      const monthStart = new Date(+year, +month - 1, 1);
      const monthEnd = new Date(+year, +month, 0, 23, 59, 59);

      const txs = expenses.filter((t) => {
        const d = new Date(t.date + 'T00:00:00');
        return d >= monthStart && d <= monthEnd;
      });

      setDrilldownTitle(`Transactions – ${format(monthStart, 'MMMM yyyy')}`);
      setDrilldownTransactions(txs);
      setDrilldownOpen(true);
    },
    [expenses]
  );

  if (data.length === 0) return null;

  return (
    <>
      <Card className="bg-card border-border p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Spending</h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }} onClick={handleChartClick}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value === 0) return '$0';
                  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                  return `$${Math.round(value)}`;
                }}
                width={50}
                tickCount={4}
                allowDecimals={false}
              />
              <Tooltip cursor={false} content={<MonthTooltip />} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]} cursor="pointer">
                {data.map((entry, index) => (
                  <Cell
                    key={entry.monthKey}
                    fill={entry.isCurrent ? EXPENSE_COLOR_PARTIAL : EXPENSE_COLOR}
                    stroke={entry.isCurrent ? EXPENSE_COLOR : 'none'}
                    strokeWidth={entry.isCurrent ? 1.5 : 0}
                    strokeDasharray={entry.isCurrent ? '4 3' : 'none'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
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
