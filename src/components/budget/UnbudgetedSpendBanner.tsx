import { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Transaction } from '@/types/budget';
import { Button } from '@/components/ui/button';

interface UnbudgetedSpendBannerProps {
  transactions: Transaction[];
  budgets: Record<string, number>;
  monthStart: Date;
  monthEnd: Date;
  includeRent: boolean;
}

export function UnbudgetedSpendBanner({
  transactions,
  budgets,
  monthStart,
  monthEnd,
  includeRent,
}: UnbudgetedSpendBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const bannerData = useMemo(() => {
    const expenses = transactions.filter(t => {
      const txDate = new Date(t.date + 'T00:00:00');
      const withinRange = txDate >= monthStart && txDate <= monthEnd;
      const rentFilter = includeRent || t.category !== 'Rent';
      return t.type === 'expense' && withinRange && rentFilter;
    });

    let totalExpenses = 0;
    const unbudgetedSpend: Record<string, number> = {};

    expenses.forEach(t => {
      totalExpenses += t.amount;
      const budget = budgets[t.category] || 0;
      if (budget === 0) {
        unbudgetedSpend[t.category] = (unbudgetedSpend[t.category] || 0) + t.amount;
      }
    });

    const unbudgetedTotal = Object.values(unbudgetedSpend).reduce((a, b) => a + b, 0);
    const ratio = totalExpenses > 0 ? unbudgetedTotal / totalExpenses : 0;

    // Top 3 unbudgeted categories by spend
    const topCategories = Object.entries(unbudgetedSpend)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      show: ratio > 0.20 && totalExpenses > 0,
      unbudgetedTotal,
      totalExpenses,
      topCategories,
    };
  }, [transactions, budgets, monthStart, monthEnd, includeRent]);

  if (!bannerData.show || dismissed) return null;

  return (
    <div className="relative flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 mb-6 animate-fade-in">
      <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <p className="text-foreground font-medium">
          ${bannerData.unbudgetedTotal.toLocaleString()} of your ${bannerData.totalExpenses.toLocaleString()} monthly spend has no budget set.
        </p>
        {bannerData.topCategories.length > 0 && (
          <p className="text-muted-foreground mt-1">
            Consider adding budgets for: {bannerData.topCategories.join(', ')}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
