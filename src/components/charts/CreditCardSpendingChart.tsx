import { useMemo, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Transaction, CreditCard } from '@/types/budget';
import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChartDrilldownSheet } from './ChartDrilldownSheet';

interface CreditCardSpendingChartProps {
  transactions: Transaction[];
  creditCards: CreditCard[];
}

const EXPENSE_COLOR = 'hsl(220, 60%, 45%)';

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

export function CreditCardSpendingChart({
  transactions,
  creditCards,
}: CreditCardSpendingChartProps) {
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const data = useMemo(() => {
    const expensesByCardId = transactions
      .filter((t) => t.type === 'expense' && t.credit_card_id)
      .reduce((acc, t) => {
        const cardId = t.credit_card_id!;
        acc[cardId] = (acc[cardId] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(expensesByCardId)
      .map(([cardId, value]) => {
        const matchedCard = creditCards.find((c) => c.id === cardId);
        return {
          name: matchedCard?.card_name || 'Unknown Card',
          cardId,
          value,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, creditCards]);

  const drilldownTransactions = useMemo(() => {
    if (!selectedCard) return [];
    const cardData = data.find((d) => d.name === selectedCard);
    if (!cardData) return [];
    return transactions.filter(
      (t) => t.type === 'expense' && t.credit_card_id === cardData.cardId
    );
  }, [transactions, selectedCard, data]);

  const handleChartClick = useCallback((chartData: any) => {
    if (!chartData?.activePayload?.[0]) return;
    const name = chartData.activePayload[0].payload.name as string;
    setSelectedCard(name);
    setDrilldownOpen(true);
  }, []);

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
    <>
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
        title={`${selectedCard} Transactions`}
        transactions={drilldownTransactions}
      />
    </>
  );
}
