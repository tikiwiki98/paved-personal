import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { Loader2 } from 'lucide-react';
import { CategorySpendList } from '@/components/budget/CategorySpendList';
import { startOfMonth, format } from 'date-fns';

const Budget = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { categories, isLoading: categoriesLoading, upsertBudget } = useCategories(transactions, 'monthly');
  const { budgets: budgetsArray, isLoading: budgetsLoading } = useBudgets('monthly');
  const { initializeWithTransactions, includeRent } = useTimeFrame();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!transactionsLoading && transactions.length > 0) {
      initializeWithTransactions(transactions);
    }
  }, [transactions, transactionsLoading, initializeWithTransactions]);

  // Build budgets lookup from the actual budgets table data (not just categories)
  const budgets = useMemo(() => {
    const lookup: Record<string, number> = {};
    budgetsArray.forEach(b => {
      if (b.amount > 0) {
        lookup[b.category] = b.amount;
      }
    });
    return lookup;
  }, [budgetsArray]);

  // Summary stats
  // Fixed monthly window: start of current month through today
  const monthStart = useMemo(() => startOfMonth(new Date()), []);
  const today = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => format(new Date(), 'MMMM'), []);

  const { totalSpent, totalBudgeted, overCount } = useMemo(() => {
    const filtered = transactions.filter(t => {
      const txDate = new Date(t.date);
      const withinRange = txDate >= monthStart && txDate <= today;
      const rentFilter = includeRent || t.category !== 'Rent';
      return t.type === 'expense' && withinRange && rentFilter;
    });

    const spendByCat: Record<string, number> = {};
    filtered.forEach(t => {
      spendByCat[t.category] = (spendByCat[t.category] || 0) + t.amount;
    });

    let spent = 0;
    let budgeted = 0;
    let over = 0;

    Object.keys(spendByCat).forEach(cat => {
      spent += spendByCat[cat];
      if (budgets[cat]) {
        budgeted += budgets[cat];
        if (spendByCat[cat] > budgets[cat]) over++;
      }
    });

    Object.keys(budgets).forEach(cat => {
      if (!spendByCat[cat]) {
        budgeted += budgets[cat];
      }
    });

    return { totalSpent: spent, totalBudgeted: budgeted, overCount: over };
  }, [transactions, budgets, includeRent, monthStart, today]);

  if (authLoading || transactionsLoading || categoriesLoading || budgetsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 md:py-10 max-w-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div>
            <h2 className="text-xl font-bold text-foreground">Spending & Budgets</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Set targets by category. We'll show how you're doing vs your plan.
            </p>
          </div>
          <IncludeRentToggle />
        </div>

        {/* Summary strip */}
        {totalBudgeted > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-6 mt-3">
            <span>
              <span className="font-semibold text-foreground">${totalSpent.toLocaleString()}</span> spent of{' '}
              <span className="font-semibold text-foreground">${totalBudgeted.toLocaleString()}</span> budgeted in {monthLabel}
            </span>
            {overCount > 0 && (
              <span className="text-accent font-medium">
                Over in {overCount} {overCount === 1 ? 'category' : 'categories'}
              </span>
            )}
          </div>
        )}

        {/* Category List */}
        <div className={totalBudgeted === 0 ? 'mt-6' : ''}>
          <CategorySpendList
            categories={categories}
            transactions={transactions}
            budgets={budgets}
            onUpdateBudget={upsertBudget}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default Budget;
