import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useTimeFrame } from '@/contexts/TimeFrameContext';
import { AppLayout } from '@/components/AppLayout';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { PaymentTypeChart } from '@/components/charts/PaymentTypeChart';
import { CreditCardSpendingChart } from '@/components/charts/CreditCardSpendingChart';
import { SummaryRangeSelector } from '@/components/SummaryRangeSelector';
import { IncludeRentToggle } from '@/components/IncludeRentToggle';
import { SpendInsights } from '@/components/SpendInsights';
import { filterTransactionsByRange } from '@/lib/dateRangeUtils';
import { Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

const Trends = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { categories, isLoading: categoriesLoading } = useCategories(transactions);
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const { range, setRange, filterRent } = useTimeFrame();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const filteredTransactions = useMemo(() => {
    const rangeFiltered = filterTransactionsByRange(transactions, range);
    return filterRent(rangeFiltered);
  }, [transactions, range, filterRent]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const rangeLabel = range === 'mtd' ? format(new Date(), 'MMMM') : 
                     range === 'ytd' ? format(new Date(), 'yyyy') :
                     range.toUpperCase();

  if (authLoading || transactionsLoading || categoriesLoading || cardsLoading) {
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
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Spending Trends</h1>
              <p className="text-sm text-muted-foreground">
                ${totalExpenses.toLocaleString()} total expenses ({rangeLabel})
              </p>
            </div>
          </div>
          <IncludeRentToggle />
        </div>

        {/* Time Frame Selector - synced with Home page */}
        <div className="mb-6">
          <SummaryRangeSelector value={range} onChange={setRange} transactions={transactions} />
        </div>

        {/* AI Insights */}
        <div className="mb-6">
          <SpendInsights transactions={filteredTransactions} />
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryBarChart transactions={filteredTransactions} categories={categories} />
          <CreditCardSpendingChart transactions={filteredTransactions} creditCards={creditCards} />
          <PaymentTypeChart transactions={filteredTransactions} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Trends;