import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction } from '@/types/budget';

interface PaymentTypeChartProps {
  transactions: Transaction[];
}

const PAYMENT_COLORS: Record<string, string> = {
  'credit_card': 'hsl(217, 91%, 60%)',
  'debit_card': 'hsl(280, 65%, 60%)',
  'cash': 'hsl(160, 84%, 39%)',
  'venmo': 'hsl(199, 89%, 48%)',
  'paypal': 'hsl(210, 78%, 55%)',
  'crypto': 'hsl(38, 92%, 50%)',
  'bank_transfer': 'hsl(180, 70%, 45%)',
  'other': 'hsl(215, 20%, 65%)',
};

const PAYMENT_LABELS: Record<string, string> = {
  'credit_card': 'Credit Card',
  'debit_card': 'Debit Card',
  'cash': 'Cash',
  'venmo': 'Venmo',
  'paypal': 'PayPal',
  'crypto': 'Crypto',
  'bank_transfer': 'Bank Transfer',
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
        color: PAYMENT_COLORS[type] || 'hsl(215, 20%, 65%)',
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
              tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 11 }}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 65%)', fontSize: 12 }}
              tickFormatter={(value) => `$${value >= 1000 ? `${value / 1000}k` : value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 14%)',
                border: '1px solid hsl(222, 30%, 22%)',
                borderRadius: '12px',
                padding: '12px',
              }}
              labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
