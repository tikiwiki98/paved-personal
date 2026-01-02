import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, CreditCard } from '@/types/budget';
import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreditCardSpendingChartProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
}

const CARD_COLORS = [
  'hsl(195, 80%, 50%)',
  'hsl(195, 80%, 40%)',
  'hsl(195, 70%, 55%)',
  'hsl(195, 60%, 45%)',
  'hsl(195, 90%, 60%)',
];

export function CreditCardSpendingChart({
  transactions,
  creditCards,
}: CreditCardSpendingChartProps) {
  const data = useMemo(() => {
    // Group expenses by payment_description (which contains the card name)
    const expensesByCard = transactions
      .filter((t) => t.type === 'expense' && t.payment_type === 'credit_card' && t.payment_description)
      .reduce((acc, t) => {
        const cardName = t.payment_description || 'Unknown Card';
        acc[cardName] = (acc[cardName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    // Map to chart data with matched credit cards
    return Object.entries(expensesByCard)
      .map(([name, value], index) => {
        const matchedCard = creditCards.find(
          (c) =>
            c.card_name.toLowerCase() === name.toLowerCase() ||
            c.card_type?.toLowerCase() === name.toLowerCase()
        );

        return {
          name: matchedCard?.card_type || name,
          value,
          color: CARD_COLORS[index % CARD_COLORS.length],
          cardId: matchedCard?.id,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, creditCards]);

  if (data.length === 0) {
    return (
      <Card className="gradient-card border-border/50 p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Spending by Credit Card</h3>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cards" className="flex items-center gap-1.5 text-muted-foreground">
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Manage Cards</span>
            </Link>
          </Button>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p className="text-center">
            No credit card transactions yet.
            <br />
            <Link to="/cards" className="text-primary hover:underline">
              Add your cards
            </Link>{' '}
            to track spending.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gradient-card border-border/50 p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Spending by Credit Card</h3>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/cards" className="flex items-center gap-1.5 text-muted-foreground">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Manage Cards</span>
          </Link>
        </Button>
      </div>
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
