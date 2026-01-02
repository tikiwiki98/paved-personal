import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction } from '@/types/budget';

interface PaymentTypeChartProps {
  transactions: Transaction[];
}

// Consistent blue-toned color for all bars (matching Home page)
const BAR_COLOR = 'hsl(195, 80%, 50%)';

const PAYMENT_LABELS: Record<string, string> = {
  'credit_card': 'Credit Card',
  'debit_card': 'Debit Card',
  'cash': 'Cash',
  'venmo': 'Venmo',
  'paypal': 'PayPal',
  'crypto': 'Crypto',
  'bank_transfer': 'Bank Transfer',
  'zelle': 'Zelle',
  'check': 'Check',
  'other': 'Other',
};

export function PaymentTypeChart({ transactions }: PaymentTypeChartProps) {
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
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

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
    <Card className="gradient-card border-border/50 p-6 shadow-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Spending by Payment Type</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 30 }}>
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
              radius={[4, 4, 0, 0]}
              activeBar={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}