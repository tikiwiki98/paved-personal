import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { AppLayout } from '@/components/AppLayout';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { CategoryBarChart } from '@/components/charts/CategoryBarChart';
import { PaymentTypeChart } from '@/components/charts/PaymentTypeChart';
import { CreditCardSpendingChart } from '@/components/charts/CreditCardSpendingChart';
import { CardOptimizationInsight } from '@/components/CardOptimizationInsight';
import { DateRangeSelector, DateRange } from '@/components/charts/DateRangeSelector';
import { InsightCard } from '@/components/InsightCard';
import { useTrendsInsight } from '@/hooks/useInsights';
import { Loader2, TrendingUp } from 'lucide-react';
import { subDays, subMonths, subYears, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

const Trends = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading: transactionsLoading } = useTransactions();
  const { categories, isLoading: categoriesLoading } = useCategories(transactions);
  const { creditCards, isLoading: cardsLoading } = useCreditCards();
  const [dateRange, setDateRange] = useState<DateRange>('1m');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [interactionType, setInteractionType] = useState<'range' | 'category' | 'payment'>('range');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    let startDate: Date;

    switch (dateRange) {
      case '1d':
        startDate = subDays(now, 1);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '1m':
        startDate = subMonths(now, 1);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subYears(now, 1);
        break;
      default:
        startDate = subMonths(now, 1);
    }

    return transactions.filter((t) => {
      const transactionDate = startOfDay(parseISO(t.date));
      return isAfter(transactionDate, startDate) && 
             (isBefore(transactionDate, today) || transactionDate.getTime() === today.getTime());
    });
  }, [transactions, dateRange]);

  const totalExpenses = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const { message: insight } = useTrendsInsight(filteredTransactions, hasInteracted, interactionType);

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setHasInteracted(true);
    setInteractionType('range');
  };

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
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Spending Trends</h1>
              <p className="text-sm text-muted-foreground">
                ${totalExpenses.toLocaleString()} total expenses
              </p>
            </div>
          </div>
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
        </div>

        {/* Insights */}
        {insight && <InsightCard message={insight} className="mb-6" />}
        <CardOptimizationInsight transactions={filteredTransactions} creditCards={creditCards} />

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryPieChart transactions={filteredTransactions} categories={categories} />
          <CategoryBarChart transactions={filteredTransactions} categories={categories} />
          <CreditCardSpendingChart transactions={filteredTransactions} creditCards={creditCards} />
          <PaymentTypeChart transactions={filteredTransactions} />
        </div>
      </div>
    </AppLayout>
  );
};

export default Trends;
