import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction } from '@/types/budget';
import { ChartDrilldownSheet } from './ChartDrilldownSheet';

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

interface PaymentTypeChartProps {
  transactions: Transaction[];
}

const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  cash: 'Cash',
  venmo: 'Venmo',
  paypal: 'PayPal',
  crypto: 'Crypto',
  bank_transfer: 'Bank Transfer',
  zelle: 'Zelle',
  check: 'Check',
  other: 'Other',
};

const REVERSE_LABELS: Record<string, string> = Object.entries(PAYMENT_LABELS).reduce(
  (acc, [key, val]) => ({ ...acc, [val]: key }),
  {}
);

export function PaymentTypeChart({ transactions }: PaymentTypeChartProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const data = useMemo(() => {
    const expensesByPaymentType = transactions
      .filter((t) => t.type === 'expense' && t.payment_type)
      .reduce((acc, t) => {
        const type = t.payment_type || 'other';
        acc[type] = (acc[type] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByPaymentType)
      .map(([type, value]) => ({
        name: PAYMENT_LABELS[type] || type,
        rawType: type,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const drilldownTransactions = useMemo(() => {
    if (!selectedType) return [];
    const rawType = REVERSE_LABELS[selectedType] || selectedType;
    return transactions.filter(
      (t) => t.type === 'expense' && t.payment_type === rawType
    );
  }, [transactions, selectedType]);

  const handleChartClick = useCallback((chartData: any) => {
    if (!chartData?.activePayload?.[0]) return;
    const label = chartData.activePayload[0].payload.name as string;
    setSelectedType(label);
    setDrilldownOpen(true);
  }, []);

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Payment Type</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No payment type data available
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Payment Type</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 30 }} onClick={handleChartClick}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                height={50}
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
                tickCount={5}
                allowDecimals={false}
              />
              <Tooltip
                cursor={false}
                content={<SimpleBarTooltip />}
              />
              <Bar
                dataKey="value"
                fill={EXPENSE_COLOR}
                radius={[4, 4, 0, 0]}
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
        title={`${selectedType} Transactions`}
        transactions={drilldownTransactions}
      />
    </>
  );
}
